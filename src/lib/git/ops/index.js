// The single entry point every UI surface calls to touch the repository.
//
// Rules this module enforces, so no caller has to remember them:
//   1. Every mutation runs through `gitLock` — the repository is one shared
//      OPFS filesystem and two surfaces (the git window, the File → Git menu)
//      used to be able to write to it simultaneously.
//   2. Every mutation reports into `gitStore` (in-flight op, error, notice) so
//      the window and the menu bar render the same thing.
//   3. Failures are normalized to `GitError` with a stable `code`; the UI
//      branches on the code, never on prose.
//   4. After a mutation the affected domain is reloaded inside the same lock,
//      replacing the old "poll every 700ms and hope" refresh.
//
// Nothing here reaches into React or the VM's project structure: project
// translation goes through `workspace/adapter`, git semantics stay in
// `browser-git` / `remote/tracking` for now (M1+ moves them into `core/`).

import {
    git,
    getFs,
    REPO_DIR,
    repoExists,
    repoHasFractch,
    repoHasHead,
    readCurrentBranch,
    getDefaultAuthor,
    initRepo,
    deleteRepo as deleteRepoRef,
    readSnapshotAtCommit as readSnapshotRef,
    setDefaultAuthor,
    getRepoChanges,
    getUpstreamBranch,
    getBranchLogs,
    computeCommitGraph,
    listBranches as listLocalBranches,
    createBranch as createBranchRef,
    deleteBranch as deleteBranchRef,
    checkoutBranchAndRestore,
    checkoutCommitAndRestore,
    restoreProjectFromCurrentRef,
    commitProject,
    mergeBranchesPreview,
    mergeBranchesApply,
    startEditorMerge,
    completeEditorMerge,
    abortEditorMerge,
    getPendingMerge,
    addRemote,
    removeRemote,
    push as pushToRemote,
    pull as pullFromRemote,
    fetchRemote as fetchRemoteRefs,
    cloneRepo,
    readReadme,
    writeReadme
} from '../browser-git.js';

import gitStore from '../state/store.js';
import gitLock from './lock.js';
import {computeTracking} from '../remote/tracking.js';
import {toGitError, GitError, GIT_ERROR_CODES} from '../errors.js';
import adapter from '../workspace/adapter.js';
import registry from '../workspace/registry.js';
import {setDefaultBranch} from '../config.js';

// ---------------------------------------------------------------------------
// Progress / lifecycle plumbing
// ---------------------------------------------------------------------------

// isomorphic-git progress events ({phase, message, completed, total}) become
// the store's single `op` descriptor. Progress is a 0..1 ratio or null when the
// backend cannot say how much work remains.
const report = evt => {
    if (!evt) return;
    let progress = null;
    if (typeof evt.completed === 'number' && typeof evt.total === 'number' && evt.total > 0) {
        progress = Math.min(1, Math.max(0, evt.completed / evt.total));
    }
    gitStore.updateOp({message: evt.message || null, progress});
};

// Wraps a locked task with the in-flight / error bookkeeping. `task` receives
// the progress reporter and must resolve with the op's result.
//
// The busy descriptor is raised *inside* the queue slot rather than before it
// is acquired. Both surfaces can fire at once (the git window and the File
// menu), and raising it up front made the queued operation overwrite the
// running one's label — the panel said "fetching" while a pull was still
// writing the repository — and then clear `op` when the *first* one finished,
// leaving the second running with no indicator at all (A4's "状态错乱").
const run = async (name, message, task, {fallbackCode = GIT_ERROR_CODES.UNKNOWN} = {}) => {
    try {
        return await gitLock.run(name, async () => {
            gitStore.beginOp(name, message || null);
            try {
                const result = await task(report);
                gitStore.endOp();
                return result;
            } catch (e) {
                gitStore.endOp();
                throw e;
            }
        });
    } catch (e) {
        const error = toGitError(e, fallbackCode);
        gitStore.setError({
            code: error.code,
            message: error.message,
            raw: error.raw,
            hint: error.hint
        });
        throw error;
    }
};

// ---------------------------------------------------------------------------
// Status reading
// ---------------------------------------------------------------------------

// Classify one statusMatrix row.
//
// isomorphic-git's numbers are *versions*, not booleans: each column holds the
// oldest version of the file it still matches, where HEAD = 1, WORKDIR = 2 and
// INDEX = 3 (0 = "does not exist"). A row is only clean when all three agree,
// and the old `describeRow` (which tested a handful of combinations) silently
// dropped staged-but-since-edited files (`[1,1,3]`, git's `MM`). This covers the
// whole documented table instead.
const describeRow = (head, workdir, stage) => {
    if (head === workdir && workdir === stage) return 'unmodified';
    if (head === 0) return stage === 0 ? 'untracked' : 'added';
    if (workdir === 0) return 'deleted';
    return 'modified';
};

const readStatusMatrix = async () => {
    const fs = getFs();
    let matrix;
    try {
        matrix = await git.statusMatrix({fs, dir: REPO_DIR});
    } catch (e) {
        // A repository whose HEAD is unreadable (half-written by the sb3
        // importer, or unborn) cannot be diffed; report "nothing changed"
        // rather than failing the whole refresh. A change list is never worth
        // failing an operation for.
        console.warn('Could not read git status matrix', e);
        return [];
    }
    return matrix
        .filter(row => row && row[0] !== '.gitignore')
        .map(row => {
            const [filepath, head, workdir] = row;
            // statusMatrix returns [path, HEAD, WORKDIR, STAGE]; older shapes
            // omit the stage column, in which case the index equals the workdir.
            const stage = row.length >= 4 ? row[3] : workdir;
            return {
                filepath,
                description: describeRow(head, workdir, stage),
                // Decision D2: the Changes view needs real staged/unstaged
                // semantics; both flags are derived here so the UI never has to
                // reason about statusMatrix numbers.
                staged: head !== stage,
                unstaged: workdir !== stage
            };
        })
        .filter(change => change.description !== 'unmodified');
};

// ---------------------------------------------------------------------------
// Rename detection
// ---------------------------------------------------------------------------
//
// fractch derives every asset file name from the user-visible costume/sound
// name it belongs to (see `targetAssetFiles`), so renaming a costume in the
// editor shows up as a *deleted* file plus an *untracked* file holding the very
// same bytes. Surfacing that verbatim buries real edits under fake ones — the
// reported symptom was "I renamed one backdrop and the list showed a deletion I
// never made".
//
// Pairing those two rows back into a single `renamed` entry is what every
// mainstream git UI does, and it needs no filesystem migration. Bounded on
// purpose: the scan only runs when both sides exist and stays small, so an
// unrelated huge changeset never pays for it.
const RENAME_SCAN_LIMIT = 40;

// `readBlob` takes an oid, not a ref: passing 'HEAD' straight through fails
// with "Could not find HEAD", so the caller resolves it once and reuses it.
const readHeadBlobOid = async ({fs, filepath, headOid}) => {
    if (!headOid) return null;
    try {
        const {oid} = await git.readBlob({fs, dir: REPO_DIR, oid: headOid, filepath});
        return oid || null;
    } catch (e) {
        return null;
    }
};

const readWorkdirBlobOid = async ({fs, filepath}) => {
    try {
        const data = await fs.promises.readFile(`${REPO_DIR}/${filepath}`);
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        const {oid} = await git.hashBlob({object: bytes});
        return oid || null;
    } catch (e) {
        return null;
    }
};

const pairRenames = async changes => {
    const deleted = changes.filter(change => change.description === 'deleted');
    const untracked = changes.filter(change => change.description === 'untracked');
    if (!deleted.length || !untracked.length) return changes;
    if (deleted.length > RENAME_SCAN_LIMIT || untracked.length > RENAME_SCAN_LIMIT) return changes;

    const fs = getFs();
    let headOid = null;
    try {
        headOid = await git.resolveRef({fs, dir: REPO_DIR, ref: 'HEAD'});
    } catch (e) {
        // Unborn branch: there is no previous version to compare against.
        return changes;
    }
    if (!headOid) return changes;

    // Bucket the new files by content, so a rename is only claimed when the
    // bytes really are identical.
    const untrackedByOid = new Map();
    for (const candidate of untracked) {
        const oid = await readWorkdirBlobOid({fs, filepath: candidate.filepath});
        if (!oid) continue;
        if (!untrackedByOid.has(oid)) untrackedByOid.set(oid, []);
        untrackedByOid.get(oid).push(candidate);
    }
    if (!untrackedByOid.size) return changes;

    const consumed = new Set();
    const renamed = new Map();
    for (const from of deleted) {
        const oid = await readHeadBlobOid({fs, filepath: from.filepath, headOid});
        if (!oid) continue;
        // Buckets are consumed from the front only, so the head can never be a
        // path another pair already claimed.
        const bucket = untrackedByOid.get(oid);
        if (!bucket || !bucket.length) continue;
        const to = bucket.shift();
        consumed.add(from.filepath);
        consumed.add(to.filepath);
        renamed.set(from.filepath, {
            filepath: to.filepath,
            oldPath: from.filepath,
            description: 'renamed',
            // A rename lives in the working tree until the user stages it.
            staged: false,
            unstaged: true
        });
    }
    if (!renamed.size) return changes;

    const result = [];
    const emitted = new Set();
    for (const change of changes) {
        if (consumed.has(change.filepath)) {
            const entry = renamed.get(change.filepath) ||
                [...renamed.values()].find(item => item.filepath === change.filepath);
            if (entry && !emitted.has(entry)) {
                emitted.add(entry);
                result.push(entry);
            }
            continue;
        }
        result.push(change);
    }
    return result;
};

// Status for the UI: raw statusMatrix rows, with rename pairs folded back into
// a single entry. Failures degrade to the raw list — a change list is never
// worth failing an operation for.
const readChanges = async () => {
    const changes = await readStatusMatrix();
    if (!changes.length) return changes;
    try {
        return await pairRenames(changes);
    } catch (e) {
        console.warn('Rename detection failed', e);
        return changes;
    }
};

const matrixByPath = async () => {
    const fs = getFs();
    const matrix = await git.statusMatrix({fs, dir: REPO_DIR});
    const map = new Map();
    for (const row of matrix) {
        if (!row || !row[0]) continue;
        map.set(row[0], {head: row[1], workdir: row[2], stage: row.length >= 4 ? row[3] : row[2]});
    }
    return map;
};

// Conflicts only exist while a merge is pending; browser-git tracks them.
const readConflicts = () => {
    const pending = getPendingMerge();
    if (!pending) return [];
    return [...(pending.conflicts || []), ...(pending.binary || [])];
};

const loadUpstream = async ({branch} = {}) => {
    const upstream = await getUpstreamBranch({branch});
    if (!upstream) {
        return {remote: null, branch: null, tracking: false, ahead: null, behind: null};
    }
    const tracking = await computeTracking({
        remote: upstream.remote,
        branch: branch || null,
        remoteBranch: upstream.branch
    });
    return {
        remote: upstream.remote,
        branch: upstream.branch,
        tracking: tracking.tracking,
        ahead: tracking.ahead,
        behind: tracking.behind
    };
};

// Refill `changes` after a mutation.
//
// `resyncWorktree` is what makes an edit visible: it re-serializes the whole
// project into the working tree (expensive). Operations that only move bytes
// *between the index and the working tree* — stage / unstage — must not pay
// for it: the working tree is already kept current by the edit-driven debounce,
// so ticking one checkbox stays instant instead of rebuilding the project.
const syncChanges = async ({vm, resyncWorktree = Boolean(vm)} = {}) => {
    if (resyncWorktree && vm) {
        await getRepoChanges(vm);
    }
    const changes = await readChanges();
    gitStore.setChanges(changes);
    gitStore.setConflicts(readConflicts());
    return changes;
};

// Remote list, read straight from the repository config (browser-git's
// `getRemotes` insists on a VM, which the menu bar does not always have).
const syncRemotes = async () => {
    const fs = getFs();
    let remotes = [];
    try {
        const list = await git.listRemotes({fs, dir: REPO_DIR});
        remotes = list.map(remote => ({name: remote.remote || remote.name, url: remote.url}));
    } catch (e) {
        remotes = [];
    }
    gitStore.setRemotes(remotes);
    return remotes;
};

const syncHistory = async ({depth = 50} = {}) => {
    const graph = await computeCommitGraph({depth});
    const branchLogs = await getBranchLogs({depth});
    gitStore.setHistory({
        nodes: graph.nodes,
        branches: graph.branches,
        remoteBranches: graph.remoteBranches,
        branchLogs: branchLogs.map(log => ({branch: log.branch, oids: log.commits.map(c => c.oid)}))
    });
    return graph;
};

const syncUpstream = async ({branch} = {}) => {
    const current = branch || await readCurrentBranch();
    const upstream = await loadUpstream({branch: current});
    gitStore.setUpstream(upstream);
    return upstream;
};

// Cheap summary the UI needs on every refresh: the latest commits (for the
// undo guard and for diffing against HEAD) and the local branch names (for the
// branch picker). One notify for both.
const syncStatusSummary = async () => {
    const fs = getFs();
    let commits = [];
    let branches = [];
    try {
        commits = await git.log({fs, dir: REPO_DIR, depth: 20});
    } catch (e) {
        commits = [];
    }
    try {
        branches = await git.listBranches({fs, dir: REPO_DIR});
    } catch (e) {
        branches = [];
    }
    gitStore.setStatus({commits, branches});
    return {commits, branches};
};

// Full repository snapshot: identity, changes, remotes, upstream tracking,
// conflicts. Must be called with the lock held (it writes the working tree).
const loadRepository = async ({vm, projectId} = {}) => {
    if (projectId) gitStore.setRepo({projectId});

    // `.git` existing is not yet proof of a readable repository: the sb3 importer
    // writes an embedded repository file by file, so a refresh can catch the
    // skeleton before HEAD lands — every isomorphic-git read would then throw
    // "Could not find HEAD." (a spurious "Failed to refresh git state" error).
    // Report that transient state as "not initialized"; the next refresh, after
    // the import finished, reports the real repository.
    const initialized = await repoHasHead();
    if (!initialized) {
        gitStore.setState(() => ({
            repo: {initialized: false, projectId: projectId || null, head: null, branch: null, detached: false},
            upstream: {remote: null, branch: null, tracking: false, ahead: null, behind: null},
            commits: [],
            branches: [],
            changes: [],
            conflicts: [],
            remotes: [],
            history: {nodes: [], branches: [], remoteBranches: [], branchLogs: [], layout: null}
        }));
        return {initialized: false, changes: []};
    }

    const fs = getFs();
    const branch = await readCurrentBranch();
    let head = null;
    try {
        head = await git.resolveRef({fs, dir: REPO_DIR, ref: 'HEAD'});
    } catch (e) {
        // Unborn branch: no commit yet.
        head = null;
    }
    gitStore.setRepo({
        initialized: true,
        head,
        branch: branch || null,
        detached: !branch
    });

    const changes = await syncChanges({vm});
    const remotes = await syncRemotes();
    await syncStatusSummary();
    const upstream = await syncUpstream({branch: branch || null});
    return {initialized: true, changes, remotes, upstream};
};

// ---------------------------------------------------------------------------
// Reads (serialized, coalesced)
// ---------------------------------------------------------------------------

let statusRefresh = null;

// Refresh identity/changes/remotes/upstream. Concurrent calls share one run so
// a 700ms poll cannot pile up behind a long push.
export const refreshRepository = ({vm, projectId} = {}) => {
    if (statusRefresh) return statusRefresh;
    statusRefresh = (async () => {
        try {
            return await gitLock.run('status', () => loadRepository({vm, projectId}));
        } finally {
            statusRefresh = null;
        }
    })();
    return statusRefresh;
};

export const refreshHistory = ({depth = 50} = {}) =>
    gitLock.run('history', () => syncHistory({depth}));

export const refreshRemotes = () => gitLock.run('remotes', () => syncRemotes());

export const refreshTracking = ({branch} = {}) =>
    gitLock.run('tracking', () => syncUpstream({branch}));

export const getState = () => gitStore.getState();
export const subscribe = listener => gitStore.subscribe(listener);

// ---------------------------------------------------------------------------
// Repository lifecycle
// ---------------------------------------------------------------------------

export const initRepository = ({vm, projectId, defaultBranch = 'main', author} = {}) =>
    run('init', null, async () => {
        if (await repoExists()) {
            await adapter.bindProject({vm, projectId, defaultBranch, author});
        } else {
            await initRepo({defaultBranch, vm});
            await adapter.bindProject({vm, projectId, defaultBranch, author});
        }
        await loadRepository({vm, projectId});
        return {initialized: true, defaultBranch};
    });

export const cloneRepository = ({vm, projectId, url, ref, onAuth, author} = {}) =>
    run('clone', null, async reportFn => {
        await cloneRepo({url, ref, onAuth, onProgress: reportFn});
        // A repository that carries no fractch tree cannot drive this editor.
        // Throw a typed error (the UI maps NOT_FRACTCH to its own copy) and
        // leave no half-cloned repository behind.
        if (!(await repoHasFractch())) {
            await deleteRepoRef().catch(() => {});
            throw new GitError(
                GIT_ERROR_CODES.NOT_FRACTCH,
                'Not a fractch project (no .fractch files found)',
                {raw: 'Not a fractch project'}
            );
        }
        await adapter.bindProject({vm, projectId, author});
        await restoreProjectFromCurrentRef(vm);
        await loadRepository({vm, projectId});
        await syncHistory({});
        return {cloned: true, url};
    }, {fallbackCode: GIT_ERROR_CODES.NETWORK});

export const deleteRepository = () =>
    run('delete-repo', null, async () => {
        await deleteRepoRef();
        await loadRepository({});
        return {deleted: true};
    });

export const bindProject = ({vm, projectId, defaultBranch, author} = {}) =>
    run('bind-project', null, async () => {
        const result = await adapter.bindProject({vm, projectId, defaultBranch, author});
        await loadRepository({vm, projectId});
        return result;
    });

// ---------------------------------------------------------------------------
// Staging (decision D2)
// ---------------------------------------------------------------------------

const normalizePaths = filepaths => {
    if (typeof filepaths === 'string') return [filepaths];
    if (!Array.isArray(filepaths)) return [];
    return filepaths.filter(p => typeof p === 'string' && p.length > 0);
};

export const stageFiles = ({vm, filepaths} = {}) =>
    run('stage', null, async () => {
        const paths = normalizePaths(filepaths);
        const fs = getFs();
        const matrix = await matrixByPath();

        // A rename is two rows (delete + add). Staging only the new side would
        // record an add and leave the old file tracked forever, turning one
        // rename into a duplicate. Fold the pair back together here.
        const stalePaths = new Set();
        if (paths.length) {
            const wanted = new Set(paths);
            const current = await readChanges();
            for (const change of current) {
                if (change.description === 'renamed' && change.oldPath && wanted.has(change.filepath)) {
                    stalePaths.add(change.oldPath);
                }
            }
        }

        for (const filepath of paths) {
            const row = matrix.get(filepath);
            try {
                if (row && row.workdir === 0) {
                    await git.remove({fs, dir: REPO_DIR, filepath});
                } else {
                    await git.add({fs, dir: REPO_DIR, filepath});
                }
            } catch (e) {
                // A single unstageable path must not abort the batch.
                console.warn('Failed to stage', filepath, e);
            }
        }
        for (const filepath of stalePaths) {
            try {
                await git.remove({fs, dir: REPO_DIR, filepath});
            } catch (e) {
                console.warn('Failed to stage the removal of', filepath, e);
            }
        }
        await syncChanges({vm, resyncWorktree: false});
        return {staged: paths.length + stalePaths.size};
    });

export const unstageFiles = ({vm, filepaths} = {}) =>
    run('unstage', null, async () => {
        const paths = normalizePaths(filepaths);
        const fs = getFs();
        for (const filepath of paths) {
            try {
                await git.resetIndex({fs, dir: REPO_DIR, filepath});
            } catch (e) {
                console.warn('Failed to unstage', filepath, e);
            }
        }
        await syncChanges({vm, resyncWorktree: false});
        return {unstaged: paths.length};
    });

export const stageAllFiles = ({vm} = {}) =>
    run('stage-all', null, async () => {
        const fs = getFs();
        const matrix = await matrixByPath();
        for (const [filepath, row] of matrix) {
            if (filepath === '.gitignore') continue;
            try {
                if (row.workdir === 0) {
                    if (row.head !== 0) await git.remove({fs, dir: REPO_DIR, filepath});
                } else {
                    await git.add({fs, dir: REPO_DIR, filepath});
                }
            } catch (e) {
                console.warn('Failed to stage', filepath, e);
            }
        }
        await syncChanges({vm, resyncWorktree: false});
        return {staged: matrix.size};
    });

export const unstageAllFiles = ({vm} = {}) =>
    run('unstage-all', null, async () => {
        const fs = getFs();
        const matrix = await matrixByPath();
        let count = 0;
        for (const [filepath, row] of matrix) {
            // Only paths actually staged in the index (HEAD ≠ index) have
            // something to unstage; untouched untracked files are left alone.
            if (filepath === '.gitignore' || row.head === row.stage) continue;
            try {
                await git.resetIndex({fs, dir: REPO_DIR, filepath});
                count += 1;
            } catch (e) {
                console.warn('Failed to unstage', filepath, e);
            }
        }
        await syncChanges({vm, resyncWorktree: false});
        return {unstaged: count};
    });

// ---------------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------------

// `all` (decision D2): the git window owns a real staging area, so committing
// there submits exactly what the user staged. Surfaces without staging UI
// (File → Git → Commit) pass `all: true` and keep the old
// stage-the-whole-tree-then-commit behaviour.
export const commit = ({vm, message, author, all = false} = {}) =>
    run('commit', null, async reportFn => {
        const oid = await commitProject({
            vm,
            message,
            author,
            onlyStaged: !all,
            onProgress: reportFn
        });
        await loadRepository({vm});
        await syncHistory({});
        gitStore.setNotice({kind: 'committed', message: null, at: Date.now()});
        return {oid};
    }, {fallbackCode: GIT_ERROR_CODES.NO_CHANGES});

// Roll the branch back one commit by committing the *previous* snapshot on top
// of the current tip (identical to the previous in-editor behaviour: history is
// not rewritten, an "Undo: …" commit is appended). Raises its own restore point
// because it reloads the open project.
export const undoLastCommit = ({vm, restorePointLabel = 'Before git undo'} = {}) =>
    run('undo-commit', null, async () => {
        const fs = getFs();
        const branch = await readCurrentBranch();
        if (!branch) {
            throw new GitError(
                GIT_ERROR_CODES.DETACHED_HEAD,
                'Cannot undo commit while detached. Check out a branch first.',
                {raw: 'detached'}
            );
        }
        const log = await git.log({fs, dir: REPO_DIR, depth: 2});
        if (!Array.isArray(log) || log.length < 2) {
            throw new GitError(
                GIT_ERROR_CODES.NO_PREVIOUS_COMMIT,
                'No previous commit to undo to.',
                {raw: 'No previous commit'}
            );
        }
        const [head, previous] = log;
        await adapter.createRestorePoint(vm, restorePointLabel);
        const snapshot = await readSnapshotRef(previous.oid);
        vm.quit();
        // skipGitImport: never let loading a commit snapshot re-import an
        // embedded repo and clobber the current one.
        await vm.loadProject(snapshot, {skipGitImport: true});
        const headLine = head && head.commit && head.commit.message ?
            head.commit.message.split('\n')[0] : '';
        const oid = await commitProject({
            vm,
            message: `Undo: ${headLine || head.oid.slice(0, 7)}`,
            author: getDefaultAuthor()
        });
        await loadRepository({vm});
        await syncHistory({});
        return {oid};
    }, {fallbackCode: GIT_ERROR_CODES.UNKNOWN});

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export const createBranch = ({ref} = {}) =>
    run('create-branch', null, async () => {
        await createBranchRef({ref});
        await syncHistory({});
        return {ref};
    }, {fallbackCode: GIT_ERROR_CODES.INVALID_NAME});

export const deleteBranch = ({ref} = {}) =>
    run('delete-branch', null, async () => {
        await deleteBranchRef(ref);
        await syncHistory({});
        return {ref};
    }, {fallbackCode: GIT_ERROR_CODES.INVALID_NAME});

export const checkoutBranch = ({vm, ref} = {}) =>
    run('checkout', null, async () => {
        await checkoutBranchAndRestore({vm, ref});
        await loadRepository({vm});
        await syncHistory({});
        return {ref};
    }, {fallbackCode: GIT_ERROR_CODES.DETACHED_HEAD});

export const checkoutCommit = ({vm, oid} = {}) =>
    run('checkout-commit', null, async () => {
        await checkoutCommitAndRestore({vm, oid});
        await loadRepository({vm});
        await syncHistory({});
        return {oid};
    }, {fallbackCode: GIT_ERROR_CODES.DETACHED_HEAD});

export const listBranches = () => gitLock.run('list-branches', () => listLocalBranches());

// Reading a snapshot for the "download this commit" button is a user-initiated
// action with a visible cost (it unpacks the whole tree), so it reports as an
// operation and gets the busy indicator instead of happening silently.
export const readSnapshotAtCommit = oid =>
    run('download-commit', null, () => readSnapshotRef(oid), {
        fallbackCode: GIT_ERROR_CODES.SNAPSHOT_MISSING
    });

// ---------------------------------------------------------------------------
// Remotes
// ---------------------------------------------------------------------------

export const addRemoteEntry = ({vm, name, url} = {}) =>
    run('add-remote', null, async () => {
        await addRemote({vm, name, url});
        await syncRemotes();
        if (vm) gitStore.setRepo({initialized: true});
        return {name, url};
    }, {fallbackCode: GIT_ERROR_CODES.NETWORK});

export const removeRemoteEntry = ({vm, name} = {}) =>
    run('remove-remote', null, async () => {
        await removeRemote({vm, name});
        await syncRemotes();
        return {name};
    });

export const fetchRemote = ({remote = 'origin', onAuth} = {}) =>
    run('fetch', null, async reportFn => {
        const result = await fetchRemoteRefs({remote, onAuth, onProgress: reportFn});
        await syncRemotes();
        await syncUpstream({});
        await syncHistory({});
        return result || {status: 'fetched'};
    }, {fallbackCode: GIT_ERROR_CODES.NETWORK});

export const pushBranch = ({vm, remote = 'origin', branch, setUpstream = true, onAuth} = {}) =>
    run('push', null, async reportFn => {
        const result = await pushToRemote({
            vm,
            remote,
            branch,
            setUpstream,
            onAuth,
            onProgress: reportFn
        });
        await syncUpstream({branch: branch || null});
        await syncHistory({});
        return {
            kind: result && result.ok === false ? 'rejected' : 'pushed',
            remote,
            branch: branch || null,
            result
        };
    }, {fallbackCode: GIT_ERROR_CODES.NON_FAST_FORWARD});

// Discriminated pull result: the UI never has to guess what happened.
//   {kind:'up-to-date'} | {kind:'ahead'} | {kind:'fast-forwarded'}
// A diverged history rejects with GitError(code=DIVERGED) so the UI can offer
// the merge flow instead of showing a raw error.
//
// Only `fast-forwarded` rewrites the open project. The other two verdicts come
// straight from the backend (`remote/reconcile.js`) — the old code guessed them
// from the ahead counter and rebuilt the project whenever the guess said
// "pulled", which is how a local-ahead pull used to throw away the undo stack.
//
// A pull can rewrite the open project, so the safety restore point is raised
// here rather than at each call site (the git window and the File menu used to
// each do it — and to forget it in different places).
export const pullBranch = ({vm, remote = 'origin', author, onAuth, restorePointLabel = 'Before git pull'} = {}) =>
    run('pull', null, async reportFn => {
        await adapter.createRestorePoint(vm, restorePointLabel);
        const result = await pullFromRemote({vm, remote, author, onAuth, onProgress: reportFn});
        const status = result && result.status;
        if (status === 'pulled') {
            await restoreProjectFromCurrentRef(vm);
            await loadRepository({vm});
            await syncHistory({});
            return {kind: 'fast-forwarded', remote, oid: (result && result.oid) || null};
        }
        // 'ahead' / 'up-to-date': the repository did not move, so the open
        // project must not be reloaded either.
        const upstream = await syncUpstream({});
        await loadRepository({vm});
        return {
            kind: status === 'ahead' ? 'ahead' : 'up-to-date',
            remote,
            oid: null,
            upstream
        };
    }, {fallbackCode: GIT_ERROR_CODES.DIVERGED});

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

export const previewMerge = ({ours, theirs} = {}) =>
    run('merge-preview', null, async () => {
        const preview = await mergeBranchesPreview({ours, theirs});
        return {ours, theirs, conflicts: preview.conflicts, clean: preview.conflicts.length === 0};
    }, {fallbackCode: GIT_ERROR_CODES.UNKNOWN});

export const applyMerge = ({vm, ours, theirs, resolutions, author} = {}) =>
    run('merge', null, async () => {
        const result = await mergeBranchesApply({ours, theirs, resolutions, author});
        await restoreProjectFromCurrentRef(vm);
        await loadRepository({vm});
        await syncHistory({});
        return {merged: true, result};
    }, {fallbackCode: GIT_ERROR_CODES.DIVERGED});

// Start a merge that may leave conflicts in the working tree for the fractch
// editor to resolve. `merged:false` means the caller must open the editor.
export const startMerge = ({vm, ours, theirs, author} = {}) =>
    run('merge-start', null, async () => {
        const outcome = await startEditorMerge({ours, theirs, author});
        if (outcome.merged) {
            await restoreProjectFromCurrentRef(vm);
            await loadRepository({vm});
            await syncHistory({});
            return {merged: true, conflicts: []};
        }
        await restoreProjectFromCurrentRef(vm);
        gitStore.setConflicts(readConflicts());
        return {merged: false, conflicts: outcome.conflicts};
    }, {fallbackCode: GIT_ERROR_CODES.DIVERGED});

export const completeMerge = ({vm, author} = {}) =>
    run('merge-complete', null, async () => {
        const oid = await completeEditorMerge({author});
        await loadRepository({vm});
        await syncHistory({});
        return {oid};
    }, {fallbackCode: GIT_ERROR_CODES.UNKNOWN});

export const abortMerge = ({vm} = {}) =>
    run('merge-abort', null, async () => {
        await abortEditorMerge();
        await loadRepository({vm});
        return {aborted: true};
    }, {fallbackCode: GIT_ERROR_CODES.UNKNOWN});

export const getMergeState = () => getPendingMerge();

// ---------------------------------------------------------------------------
// README + repository configuration
// ---------------------------------------------------------------------------

export const loadReadme = () => gitLock.run('readme-read', () => readReadme());

export const saveReadme = content =>
    run('readme-write', null, () => writeReadme(content));

export const exportRepositoryConfig = ({projectId} = {}) => registry.exportConfig({projectId});

export const importRepositoryConfig = (config, options) =>
    run('config-import', null, () => {
        const result = registry.importConfig(config, options);
        if (config && Array.isArray(config.projects) && config.projects.length > 0) {
            const first = config.projects[0];
            if (first && first.author) {
                setDefaultAuthor(first.author);
            }
            if (first && first.defaultBranch) {
                setDefaultBranch(first.defaultBranch);
            }
        }
        return result;
    }, {fallbackCode: GIT_ERROR_CODES.UNKNOWN});

export default {
    refreshRepository,
    refreshHistory,
    refreshRemotes,
    refreshTracking,
    getState,
    subscribe,
    initRepository,
    cloneRepository,
    deleteRepository,
    bindProject,
    stageFiles,
    unstageFiles,
    stageAllFiles,
    unstageAllFiles,
    commit,
    undoLastCommit,
    createBranch,
    deleteBranch,
    checkoutBranch,
    checkoutCommit,
    listBranches,
    readSnapshotAtCommit,
    addRemoteEntry,
    removeRemoteEntry,
    fetchRemote,
    pushBranch,
    pullBranch,
    previewMerge,
    applyMerge,
    startMerge,
    completeMerge,
    abortMerge,
    getMergeState,
    loadReadme,
    saveReadme,
    exportRepositoryConfig,
    importRepositoryConfig
};

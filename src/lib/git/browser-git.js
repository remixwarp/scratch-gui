import LightningFS from '@isomorphic-git/lightning-fs';
import {getItem as getStorageItem} from '../utils/safe-storage.js';
import http from 'isomorphic-git/http/web';
import git, {Errors} from 'isomorphic-git';
import JSZip from 'jszip';


import {
    writeProjectToFractchTree,
    buildSb3FromFractchTree
} from './fractch-tree.js';
import RestorePointAPI from '../api/restore-points.js';
import {getFormattedMessage, translateGitProgressPhase} from './i18n.js';
import {DETACHED_BRANCH} from './graph-layout.js';
import {classifyPull, PULL_VERDICTS} from './remote/reconcile.js';

const FS_NAME = 'remixwarp-git';
const REPO_DIR = '/repo';
const SNAPSHOT_FILE = 'project.sb3';
// Folder used to carry the whole git repo (fractch working tree + .git) inside a
// saved .sb3 zip, alongside the normal top-level project.json/assets.
const GIT_EMBED_DIR = '.remixwarp-git';

let fsSingleton = null;

const getFs = () => {
    if (!fsSingleton) {
        fsSingleton = new LightningFS(FS_NAME);
    }
    return fsSingleton;
};

// ---------------------------------------------------------------------------
// 项目变更检测缓存
//
// getRepoChanges 在 git 面板轮询（每次编辑防抖后）都会调用
// writeProjectToFractchTree：全量序列化项目 + 清空并重建整个工作树，
// 对中大型工程是 O(工程大小) 的重活，频繁触发会卡死主线程。
//
// 这里缓存"上次写入工作树时的项目哈希"，仅当项目内容真正变化时才重建；
// 未变化时直接对现有工作树执行 statusMatrix（结果同样准确，因为工作树
// 内容与项目一致）。最坏情况（哈希因序列化顺序不稳定而误判）只是退化为
// 每次都重建，与优化前行为相同，不会出错。
// ---------------------------------------------------------------------------
let lastProjectHash = null;
let worktreeInitialized = false;

// cyrb53: a fast, well-distributed 53-bit string hash. The previous 32-bit
// rolling hash (Java String#hashCode style) collided too easily on long
// project.json bodies: a collision made "project changed" look like "unchanged",
// which skipped the working-tree resync and silently missed changes in the
// Changes view. 53-bit space keeps that risk negligible while staying cheap.
const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((4294967296 * (2097151 & h2)) + (h1 >>> 0)).toString(16);
};

// Compute a content hash that is *guaranteed to line up* with what
// writeProjectToFractchTree produces. That function serializes the project
// through saveProjectSb3 → unpack project.json → convertProject, so hashing
// vm.toJSON() here is incorrect: isomorphic-git's toJSON returns an object
// whose JSON.stringify ordering can differ from the sb3 packer (nested
// extension state, monitors table ordering, etc.), and even when it agrees
// writeProjectToFractchTree consumes the sb3-packed bytes, not the object.
// Using the same sb3 unpack path makes the hash strategy faithful: an
// unchanged VM → identical sb3 → identical project.json string → identical
// hash. If sb3 serialization fails we return null so callers fall through to
// a full rebuild (worse perf, always correct).
const computeProjectHash = async vm => {
    if (!vm || typeof vm.saveProjectSb3 !== 'function') {
        return null;
    }
    try {
        const buffer = await vm.saveProjectSb3('arraybuffer');
        if (!buffer || buffer.byteLength === 0) return null;
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        const zip = await JSZip.loadAsync(bytes);
        const projectEntry = zip.file('project.json');
        if (!projectEntry) return null;
        const projectJsonStr = await projectEntry.async('string');
        return cyrb53(projectJsonStr);
    } catch (e) {
        return null;
    }
};

// Reset the in-memory worktree hash cache. Must be called after any operation
// that moves HEAD / rewrites the working tree out from under us: commits,
// checkouts, clones, deletes, merges, sb3 imports. Without this the stale
// cache would short-circuit the next getRepoChanges and report "no changes"
// even after the repo was mutated underneath the VM.
const resetRepoCache = () => {
    lastProjectHash = null;
    worktreeInitialized = false;
};

const pathJoin = (...parts) => parts
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/\/\//g, '/');

const exists = async (pfs, filePath) => {
    if (!pfs || typeof pfs.stat !== 'function') {
        throw new Error('Invalid filesystem object');
    }
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
    }

    try {
        await pfs.stat(filePath);
        return true;
    } catch (e) {
        return false;
    }
};

const ensureDir = async (pfs, dirPath) => {
    if (!pfs || typeof pfs.mkdir !== 'function') {
        throw new Error('Invalid filesystem object');
    }
    if (!dirPath || typeof dirPath !== 'string') {
        throw new Error('Invalid directory path');
    }

    try {
        await pfs.mkdir(dirPath);
    } catch (e) {
        if (e.code !== 'EEXIST') {
            throw e;
        }
    }
};

const removeRecursive = async (pfs, filePath) => {
    if (!pfs || !filePath || typeof filePath !== 'string') {
        return;
    }

    let stat;
    try {
        stat = await pfs.stat(filePath);
    } catch (e) {
        // File doesn't exist, nothing to remove
        return;
    }

    if (stat.isDirectory()) {
        const entries = await pfs.readdir(filePath);
        await Promise.all(entries.map(entry => removeRecursive(pfs, `${filePath}/${entry}`)));
        try {
            await pfs.rmdir(filePath);
        } catch (e) {
            // Directory might not be empty or have permission issues
            console.warn('Failed to remove directory:', filePath, e);
        }
        return;
    }

    try {
        await pfs.unlink(filePath);
    } catch (e) {
        // File might be locked or have permission issues
        console.warn('Failed to remove file:', filePath, e);
    }
};

const ensureParentDir = async (pfs, filePath) => {
    const parts = filePath.split('/').filter(Boolean);
    parts.pop();
    let current = '';
    for (const part of parts) {
        current = current ? `${current}/${part}` : `/${part}`;
        await ensureDir(pfs, current);
    }
};

const stageAll = async (fs, dir, {onProgress} = {}) => {
    if (!fs || !dir || typeof dir !== 'string') {
        throw new Error('Invalid filesystem or directory');
    }

    if (typeof onProgress === 'function') {
        onProgress({
            phase: 'status',
            message: getFormattedMessage('mw.git.computing', 'Computing file status…'),
            completed: 0,
            total: 1
        });
    }

    const matrix = await git.statusMatrix({fs, dir});
    const rows = matrix.filter(row => row && row[0] !== '.gitignore');
    const total = Math.max(1, rows.length);
    let completed = 0;
    let lastReport = 0;

    const report = () => {
        if (typeof onProgress !== 'function') return;
        const now = Date.now();
        if (now - lastReport < 100 && completed < total) return;
        lastReport = now;
        onProgress({
            phase: 'stage',
            message: getFormattedMessage('mw.git.staging', 'Staging files…'),
            completed,
            total
        });
    };

    report();

    // Process files in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await Promise.all(batch.map(async row => {
            if (!row || row.length < 3) return;

            const [filepath, head, workdir] = row;
            if (!filepath) return;

            try {
                if (workdir === 0) {
                    if (head !== 0) {
                        await git.remove({fs, dir, filepath});
                    }
                } else {
                    await git.add({fs, dir, filepath});
                }
            } catch (e) {
                console.warn('Failed to stage file:', filepath, e);
            }
            report();
        }));
        completed += batch.length;

        // Yield control to browser between batches
        if (i + batchSize < rows.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
};

const getDefaultAuthor = () => {
    try {
        const saved = JSON.parse(getStorageItem('mw:git-author') || 'null');
        if (saved && typeof saved.name === 'string' && typeof saved.email === 'string') {
            return saved;
        }
    } catch (e) {
        // ignore
    }
    return {name: 'User', email: 'user@example.com'};
};

const setDefaultAuthor = author => {
    try {
        localStorage.setItem('mw:git-author', JSON.stringify(author));
    } catch (e) {
        // ignore
    }
};

const repoExists = () => {
    const fs = getFs();
    const pfs = fs.promises;
    return exists(pfs, pathJoin(REPO_DIR, '.git'));
};

// A `.git` directory alone does not mean the repository can be read. The sb3
// importer writes an embedded repository file by file (`importRepoFromSb3`), so
// a refresh landing mid-import sees the skeleton — object directories created,
// HEAD not written yet — and *every* isomorphic-git read then dies with
// "Could not find HEAD." (observed as an error-level "Failed to refresh git
// state" during E2). `repoHasHead` lets the read paths treat that transient
// state as "no repository yet" instead of raising it as a UI error.
const repoHasHead = async () => {
    if (!(await repoExists())) return false;
    try {
        const head = await getFs().promises.readFile(pathJoin(REPO_DIR, '.git', 'HEAD'), 'utf8');
        return Boolean(head && String(head).trim());
    } catch (e) {
        return false;
    }
};

// `git.currentBranch` *throws* when HEAD is missing (unborn or half-written
// repository) rather than reporting "no branch checked out", so callers kept
// surfacing a raw NotFoundError where `null` was the expected answer. Reading
// the branch is never worth an exception: null already means "detached or
// unknown" everywhere in this module.
const readCurrentBranch = async () => {
    const fs = getFs();
    try {
        const branch = await git.currentBranch({fs, dir: REPO_DIR, fullname: false});
        return branch || null;
    } catch (e) {
        return null;
    }
};

const listFilesRecursive = async (pfs, rootDir) => {
    const out = [];
    const walk = async currentDir => {
        const entries = await pfs.readdir(currentDir);
        for (const entry of entries) {
            const full = `${currentDir}/${entry}`;
            const stat = await pfs.stat(full);
            if (stat.isDirectory()) {
                await walk(full);
            } else {
                out.push(full);
            }
        }
    };
    await walk(rootDir);
    return out;
};

const clearWorkdirExceptGit = async pfs => {
    let entries;
    try {
        entries = await pfs.readdir(REPO_DIR);
    } catch (e) {
        return;
    }
    for (const entry of entries) {
        if (entry === '.git') continue;
        await removeRecursive(pfs, `${REPO_DIR}/${entry}`);
    }
};

const initRepo = async ({defaultBranch = 'main', vm = null, onProgress} = {}) => {
    if (!defaultBranch || typeof defaultBranch !== 'string') {
        throw new Error('Invalid default branch name');
    }

    const fs = getFs();
    const pfs = fs.promises;
    await ensureDir(pfs, REPO_DIR);

    const already = await repoExists();
    if (!already) {
        if (typeof onProgress === 'function') {
            onProgress({
                phase: 'init',
                message: getFormattedMessage('mw.git.initializing', 'Initializing repository…'),
                completed: 0,
                total: 1
            });
        }

        try {
            await git.init({fs, dir: REPO_DIR, defaultBranch});
            await pfs.writeFile(pathJoin(REPO_DIR, '.gitignore'), '');
            await git.add({fs, dir: REPO_DIR, filepath: '.gitignore'});

            if (vm) {
                if (typeof onProgress === 'function') {
                    onProgress({
                        phase: 'snapshot',
                        message: getFormattedMessage('mw.git.savingSnapshot', 'Saving project snapshot…'),
                        completed: 0,
                        total: 1
                    });
                }

                if (typeof vm.saveProjectSb3 !== 'function') {
                    throw new Error('VM does not support saveProjectSb3');
                }

                await writeProjectToFractchTree({vm, fs: pfs, dir: REPO_DIR, onProgress});
                await stageAll(fs, REPO_DIR, {onProgress});
            }

            await git.commit({
                fs,
                dir: REPO_DIR,
                message: getFormattedMessage('mw.git.initialCommit', 'Initialize repository'),
                author: getDefaultAuthor()
            });
        } catch (e) {
            // Clean up partial initialization on error
            try {
                await removeRecursive(pfs, REPO_DIR);
            } catch (cleanupError) {
                console.warn('Failed to clean up after initialization error:', cleanupError);
            }
            throw e;
        }
    }

    resetRepoCache();
    return {
        fs,
        dir: REPO_DIR
    };
};

const readSnapshot = async () => {
    const fs = getFs();
    const pfs = fs.promises;
    const snapshotPath = pathJoin(REPO_DIR, SNAPSHOT_FILE);

    if (!(await exists(pfs, snapshotPath))) {
        throw new Error('Project snapshot not found');
    }

    try {
        const data = await pfs.readFile(snapshotPath);
        const view = data instanceof Uint8Array ? data : new Uint8Array(data);
        return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    } catch (e) {
        throw new Error(`Failed to read project snapshot: ${e.message}`);
    }
};

const buildSb3FromCommit = async oid => {
    const fs = getFs();
    const pfs = fs.promises;
    const tmpDir = `${REPO_DIR}-export-${Date.now()}`;
    try {
        await ensureDir(pfs, tmpDir);
        const files = await git.listFiles({fs, dir: REPO_DIR, ref: oid});
        for (const filepath of files) {
            if (filepath === '.gitignore' || filepath === SNAPSHOT_FILE) continue;
            const {blob} = await git.readBlob({fs, dir: REPO_DIR, oid, filepath});
            const dest = pathJoin(tmpDir, filepath);
            await ensureParentDir(pfs, dest);
            await pfs.writeFile(dest, blob instanceof Uint8Array ? blob : new Uint8Array(blob));
        }
        const bytes = await buildSb3FromFractchTree({fs: pfs, dir: tmpDir});
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } finally {
        await removeRecursive(pfs, tmpDir);
    }
};

const readSnapshotAtCommit = async oid => {
    if (!oid || typeof oid !== 'string') {
        throw new Error('Invalid commit OID');
    }

    const fs = getFs();
    try {
        const {blob} = await git.readBlob({fs, dir: REPO_DIR, oid, filepath: SNAPSHOT_FILE});
        const view = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
        return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    } catch (e) {
        // New fractch-only commits have no project.sb3 blob; rebuild from the text tree.
        try {
            return await buildSb3FromCommit(oid);
        } catch (rebuildError) {
            throw new Error(`Failed to read snapshot at commit ${oid}: ${rebuildError.message}`);
        }
    }
};

const restoreProjectFromCurrentRef = async vm => {
    if (!vm) throw new Error('VM not provided');
    if (!(await repoExists())) throw new Error('Repository not initialized');

    try {
        const fs = getFs();
        const pfs = fs.promises;
        const snapshotPath = pathJoin(REPO_DIR, SNAPSHOT_FILE);

        // Old commits carry a binary project.sb3 snapshot; new commits are
        // fractch-only, so repack the text tree into an sb3.
        let snapshot;
        if (await exists(pfs, snapshotPath)) {
            snapshot = await readSnapshot();
        } else {
            const bytes = await buildSb3FromFractchTree({fs: pfs, dir: REPO_DIR});
            snapshot = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        }

        if (typeof vm.quit !== 'function') {
            throw new Error('VM does not support quit method');
        }
        if (typeof vm.loadProject !== 'function') {
            throw new Error('VM does not support loadProject method');
        }

        await RestorePointAPI.createSafetyRestorePoint(vm, 'Before git restore');
        vm.quit();
        await vm.loadProject(snapshot, {skipGitImport: true});
    } catch (e) {
        throw new Error(`Failed to restore project: ${e.message}`);
    }
    resetRepoCache();
};

const describeRepoChange = ([, head, workdir, stage]) => {
    if (head === 1 && workdir === 2 && stage === 1) return 'modified';
    if (head === 0 && workdir === 2) return 'untracked';
    if (head === 1 && stage === 2) return 'staged';
    if (head === 1 && workdir === 0) return 'deleted';
    return 'unmodified';
};

const getRepoChanges = async vm => {
    if (!(await repoExists())) {
        throw new Error('Repository not initialized');
    }
    const fs = getFs();
    const pfs = fs.promises;
    const dir = REPO_DIR;

    // 项目哈希未变时跳过昂贵的全量工作树重建（见模块顶部注释）。
    // 只有首次或项目内容真正变化时才重建，避免编辑过程中每次 poll 都卡顿。
    const projectHash = await computeProjectHash(vm);
    if (!worktreeInitialized || projectHash !== lastProjectHash) {
        await writeProjectToFractchTree({vm, fs: pfs, dir});
        // 写入完成后才翻转同步标记。所有调用方（面板轮询 / 提交短路）都由
        // _pollPromise 或 busy 状态串行，不存在并发 getRepoChanges，安全。
        // eslint-disable-next-line require-atomic-updates
        worktreeInitialized = true;
        // eslint-disable-next-line require-atomic-updates
        lastProjectHash = projectHash;
    }

    const status = await git.statusMatrix({
        fs,
        dir
    });
    return status.map(row => {
        const [filepath] = row;
        const description = describeRepoChange(row);
        return {
            filepath,
            description
        };
    })
        .filter(v => v.description !== 'unmodified');
};

const getRepoStatus = async vm => {
    const fs = getFs();
    const pfs = fs.promises;
    const initialized = await exists(pfs, pathJoin(REPO_DIR, '.git'));
    if (!initialized) {
        return {
            initialized: false,
            currentBranch: null,
            branches: [],
            commits: [],
            changes: []
        };
    }

    const currentBranch = await readCurrentBranch();
    const branches = await git.listBranches({fs, dir: REPO_DIR});
    const commits = await git.log({fs, dir: REPO_DIR, depth: 20});
    const changes = await getRepoChanges(vm);

    return {
        initialized: true,
        currentBranch,
        branches,
        commits,
        changes
    };
};

const createBranch = async ({ref} = {}) => {
    if (!ref || typeof ref !== 'string') {
        throw new Error('Invalid branch name');
    }

    if (!/^[a-zA-Z0-9._/-]+$/.test(ref) || ref.startsWith('/') || ref.endsWith('/') || ref.includes('//')) {
        throw new Error('Invalid branch name format');
    }

    const fs = getFs();
    const pfs = fs.promises;

    if (!(await exists(pfs, pathJoin(REPO_DIR, '.git')))) {
        throw new Error('Repository not initialized');
    }

    try {
        await git.resolveRef({fs, dir: REPO_DIR, ref: 'HEAD'});
    } catch (e) {
        throw new Error('Cannot create branch: HEAD is missing. Initialize or check out a commit.');
    }

    try {
        await git.branch({fs, dir: REPO_DIR, ref});
    } catch (e) {
        throw new Error(`Failed to create branch ${ref}: ${e.message}`);
    }
    return 'ok';
};

const checkoutBranch = async ref => {
    if (!ref || typeof ref !== 'string') {
        throw new Error('Invalid branch reference');
    }

    const fs = getFs();
    try {
        await clearWorkdirExceptGit(fs.promises);
        await git.checkout({fs, dir: REPO_DIR, ref, force: true});
    } catch (e) {
        throw new Error(`Failed to checkout branch ${ref}: ${e.message}`);
    }
    resetRepoCache();
    return 'ok';
};

const checkoutCommit = async oid => {
    if (!oid || typeof oid !== 'string') {
        throw new Error('Invalid commit OID');
    }

    const fs = getFs();
    try {
        await clearWorkdirExceptGit(fs.promises);
        await git.checkout({fs, dir: REPO_DIR, ref: oid, force: true});
    } catch (e) {
        throw new Error(`Failed to checkout commit ${oid}: ${e.message}`);
    }
    resetRepoCache();
    return 'ok';
};

const checkoutBranchAndRestore = async ({vm, ref}) => {
    await checkoutBranch(ref);
    await restoreProjectFromCurrentRef(vm);
    resetRepoCache();
    return 'ok';
};

const checkoutCommitAndRestore = async ({vm, oid}) => {
    await checkoutCommit(oid);
    await restoreProjectFromCurrentRef(vm);
    resetRepoCache();
    return 'ok';
};

const addRemote = async ({vm, name, url}) => {
    if (!vm) {
        throw new Error('VM is required');
    }

    const fs = getFs();

    if (!(await repoExists())) {
        await initRepo({defaultBranch: 'main', vm: vm});
    }

    await git.addRemote({fs, dir: REPO_DIR, remote: name, url});
};

const removeRemote = async ({vm, name}) => {
    if (!vm) {
        throw new Error('VM is required');
    }

    const fs = getFs();

    if (!(await repoExists())) {
        await initRepo({defaultBranch: 'main', vm: vm});
    }

    await git.deleteRemote({fs, dir: REPO_DIR, name});
};

const getRemotes = async vm => {
    if (!vm) {
        throw new Error('VM is required');
    }

    const fs = getFs();

    if (!(await repoExists())) {
        await initRepo({defaultBranch: 'main', vm: vm});
    }

    const remotes = await git.listRemotes({fs, dir: REPO_DIR});

    // isomorphic-git returns {remote, url}; expose it as {name, url}.
    return remotes.map(remote => ({
        name: remote.remote || remote.name,
        url: remote.url
    }));
};

const DEFAULT_CORS_PROXY = 'https://cors.isomorphic-git.org';

// All browser-side git HTTP goes through this CORS proxy (a pure-browser
// implementation cannot talk to git remotes directly). Kept as a function so a
// per-remote proxy (e.g. a self-hosted one) can be plugged in later.
// eslint-disable-next-line no-unused-vars
const corsProxyForUrl = url => DEFAULT_CORS_PROXY;

const corsProxyForRemote = async (fs, remoteName) => {
    try {
        const remotes = await git.listRemotes({fs, dir: REPO_DIR});
        const match = remotes.find(r => (r.remote || r.name) === remoteName);
        if (match && match.url) {
            return corsProxyForUrl(match.url);
        }
    } catch (e) {
        // ignore
    }
    return DEFAULT_CORS_PROXY;
};

// Point refs/remotes/<remote>/<branch> at the local branch's tip, mirroring the
// bookkeeping that a fetch would do. Creates the containing directories because
// isomorphic-git's writeRef does not.
const writeRemoteTrackingRef = async (fs, remote, branch) => {
    const pfs = fs.promises;
    const refName = `refs/remotes/${remote}/${branch}`;
    const oid = await git.resolveRef({fs, dir: REPO_DIR, ref: branch});
    const refDir = refName.substring(0, refName.lastIndexOf('/'));
    const parts = refDir.split('/').filter(Boolean);
    let current = `${REPO_DIR}/.git`;
    for (const part of parts) {
        current = `${current}/${part}`;
        await ensureDir(pfs, current);
    }
    await git.writeRef({fs, dir: REPO_DIR, ref: refName, value: oid, force: true});
};

const push = async ({vm, remote, branch, ref, setUpstream = true, onProgress, ...options}) => {
    if (!vm) {
        throw new Error('VM is required');
    }

    const fs = getFs();

    if (!(await repoExists())) {
        await initRepo({defaultBranch: 'main', vm: vm});
    }

    // isomorphic-git's push uses `ref`/`remoteRef`, not `branch`. Default to the
    // current branch, and create the same-named branch on the remote.
    let localRef = ref || branch;
    if (!localRef) {
        localRef = await readCurrentBranch();
    }
    if (!localRef) {
        throw new Error('No branch to push. Check out a branch first.');
    }

    // Make sure the repo identity (name + email) is configured so it travels
    // with the pushed history.
    try {
        const author = getDefaultAuthor();
        if (author.name) {
            await git.setConfig({fs, dir: REPO_DIR, path: 'user.name', value: author.name});
        }
        if (author.email) {
            await git.setConfig({fs, dir: REPO_DIR, path: 'user.email', value: author.email});
        }
    } catch (e) {
        // Non-fatal.
    }

    const result = await git.push({
        fs,
        http,
        corsProxy: await corsProxyForRemote(fs, remote),
        dir: REPO_DIR,
        remote,
        ref: localRef,
        remoteRef: localRef,
        onProgress: evt => {
            if (typeof onProgress === 'function' && evt) {
                onProgress({
                    phase: 'push',
                    message: getFormattedMessage(
                        'mw.git.pushProgress',
                        'Pushing… {phase}',
                        {phase: translateGitProgressPhase(evt.phase)}
                    ).trim(),
                    completed: evt.loaded,
                    total: evt.total
                });
            }
        },
        ...options
    });

    // Emulate `git push -u`: record the upstream so future pulls/pushes track it.
    if (setUpstream) {
        try {
            await git.setConfig({fs, dir: REPO_DIR, path: `branch.${localRef}.remote`, value: remote});
            await git.setConfig({fs, dir: REPO_DIR, path: `branch.${localRef}.merge`, value: `refs/heads/${localRef}`});
        } catch (e) {
            // Non-fatal: the push itself succeeded.
            console.warn('Failed to set upstream tracking:', e);
        }
    }

    // Real `git push` also advances the local remote-tracking ref
    // (refs/remotes/<remote>/<branch>). isomorphic-git's push does not, so do it
    // by hand — otherwise the History view would show the remote branch chip
    // ("origin/main") only after the next pull/fetch.
    if (result && result.ok) {
        try {
            await writeRemoteTrackingRef(fs, remote, localRef);
        } catch (e) {
            console.warn('Failed to update remote-tracking ref after push:', e);
        }
    }

    resetRepoCache();
    return result;
};

// Shared git.fetch wrapper: every fetch (standalone Fetch, pull's internal
// fetch) funnels through here so auth/CORS/progress handling stays in one place.
const runFetch = async ({
    remote,
    ref,
    tags = true,
    prune = true,
    onAuth,
    onProgress
}) => {
    const fs = getFs();
    await git.fetch({
        fs,
        http,
        corsProxy: await corsProxyForRemote(fs, remote),
        dir: REPO_DIR,
        remote,
        ref,
        singleBranch: Boolean(ref),
        tags: Boolean(tags),
        prune: Boolean(prune),
        onAuth,
        onProgress: evt => {
            if (typeof onProgress === 'function' && evt) {
                onProgress({
                    phase: 'fetch',
                    message: getFormattedMessage(
                        'mw.git.fetchProgress',
                        'Fetching… {phase}',
                        {phase: translateGitProgressPhase(evt.phase)}
                    ).trim(),
                    completed: evt.loaded,
                    total: evt.total
                });
            }
        }
    });
};

// Standalone fetch: update refs/remotes/* (and prune deleted ones) without
// touching the working tree or HEAD. This is what populates the purple
// "origin/xxx" branch chips before any pull/merge happens.
const fetchRemote = async ({remote = 'origin', ref, onAuth, onProgress} = {}) => {
    if (!(await repoExists())) {
        throw new Error('Repository not initialized');
    }
    await runFetch({remote, ref, tags: true, prune: true, onAuth, onProgress});
    resetRepoCache();
    return {status: 'fetched'};
};

// The configured upstream ({remote, branch}) of a local branch, from
// branch.<name>.remote / branch.<name>.merge (set by push -u or clone).
const getUpstreamBranch = async ({branch} = {}) => {
    const fs = getFs();
    if (!(await repoExists())) return null;
    const name = branch || await readCurrentBranch();
    if (!name) return null;
    try {
        const remote = await git.getConfig({fs, dir: REPO_DIR, path: `branch.${name}.remote`});
        const merge = await git.getConfig({fs, dir: REPO_DIR, path: `branch.${name}.merge`});
        if (remote && merge && merge.startsWith('refs/heads/')) {
            return {remote, branch: merge.slice('refs/heads/'.length)};
        }
    } catch (e) {
        // Config not readable — treat as no upstream.
    }
    return null;
};

// Behavioural clone of `git pull`: fetch first, then fast-forward the checked
// out branch when the remote is ahead of it. Returns a structured result so the
// UI can distinguish "nothing to do" from "updated":
//   {status: 'up-to-date'} — the tips already match (no working tree change)
//   {status: 'ahead'}      — local is ahead of the remote tip (nothing pulled)
//   {status: 'pulled'}     — remote commits were fast-forwarded into the branch
// A diverged branch (both sides have commits the other lacks) throws a
// localized error steering the user to the visual merge flow instead of
// leaving them with a raw FastForwardError.
//
// The direction of the two reachability checks lives in `remote/reconcile.js`:
// getting it backwards means the one case `git pull` exists for ("the remote
// has commits I do not") reports "nothing to pull", and the no-op case rebuilds
// the open project for nothing. Covered by test/unit/git/remote-reconcile.test.js.
const pull = async ({vm, remote, ref, author, onAuth, onProgress} = {}) => {
    if (!vm) {
        throw new Error('VM is required');
    }
    const fs = getFs();
    if (!(await repoExists())) {
        throw new Error('Repository not initialized');
    }

    let localRef = ref;
    if (!localRef) {
        localRef = await readCurrentBranch();
    }
    if (!localRef) {
        throw new Error('No branch checked out to pull into');
    }
    const remoteName = remote || 'origin';
    const trackingRef = `refs/remotes/${remoteName}/${localRef}`;

    // 1) Always fetch first (real `git pull` does; the tracking ref may be stale).
    await runFetch({
        remote: remoteName,
        tags: false,
        prune: false,
        onAuth,
        onProgress
    });

    let remoteOid;
    try {
        remoteOid = await git.resolveRef({fs, dir: REPO_DIR, ref: trackingRef});
    } catch (e) {
        throw new Error(
            `No upstream branch ${remoteName}/${localRef} on the remote. ` +
            'Push the branch once with "Push" to publish it, then pull will track it.'
        );
    }

    const headOid = await git.resolveRef({fs, dir: REPO_DIR, ref: 'HEAD'});
    // `git.isDescendent({oid, ancestor})` answers "is `ancestor` reachable from
    // `oid`" — the wrapper keeps the argument order honest at the call site.
    const contains = (oid, ancestor) => git.isDescendent({
        fs,
        dir: REPO_DIR,
        oid,
        ancestor,
        depth: -1
    }).catch(() => false);

    const verdict = await classifyPull({headOid, remoteOid, contains});
    if (verdict === PULL_VERDICTS.UP_TO_DATE) {
        return {status: 'up-to-date'};
    }
    if (verdict === PULL_VERDICTS.LOCAL_AHEAD) {
        // Only the local side moved on: nothing to pull, the fix is a push.
        return {status: 'ahead'};
    }
    if (verdict === PULL_VERDICTS.DIVERGED) {
        throw new Error(
            'Diverged branches: your local branch and the remote have commits ' +
            'the other side does not. Fast-forward is impossible — merge manually ' +
            'in the Branches view (Merge…) then pull again.'
        );
    }

    // 2) Fast-forward: move the local branch (and the fractch working tree) to
    // the remote tip. fastForwardOnly is safe here because we proved above that
    // the remote tip is a descendent of HEAD.
    try {
        const result = await git.merge({
            fs,
            dir: REPO_DIR,
            ours: localRef,
            theirs: trackingRef,
            fastForwardOnly: true,
            author: author || getDefaultAuthor()
        });
        // Trust the merge's own report over the pre-flight verdict: a race or a
        // stale tracking ref must not be reported as "pulled" when the branch
        // never moved (the caller then rebuilds the whole open project).
        if (result && result.oid === remoteOid && result.oid !== headOid) {
            // A fast-forward only moves the branch ref: isomorphic-git, unlike
            // `git pull`, leaves the working tree alone. Refresh it from the new
            // tip, otherwise the editor would rebuild the project from a stale
            // tree and the pull would be invisible in the project. Same recipe as
            // checkoutBranch: clear first so files the commit deleted are gone.
            await clearWorkdirExceptGit(fs.promises);
            await git.checkout({fs, dir: REPO_DIR, ref: localRef, force: true});
            return {status: 'pulled', oid: remoteOid};
        }
        if (result && (result.alreadyMerged || result.oid === headOid)) {
            return {status: 'up-to-date'};
        }
        return {status: 'pulled', oid: (result && result.oid) || remoteOid};
    } catch (e) {
        if (e && (e.code === 'FastForwardError' || /fast-forward/i.test(e.message || ''))) {
            throw new Error(
                'Diverged branches: your local branch and the remote have commits ' +
                'the other side does not. Fast-forward is impossible — merge manually ' +
                'in the Branches view (Merge…) then pull again.'
            );
        }
        throw new Error(`Failed to pull: ${e && e.message ? e.message : String(e)}`);
    }
    resetRepoCache();
};

// `onlyStaged` (decision D2): when true the index is left exactly as the user
// staged it, so committing never silently stages the whole working tree. The
// working tree is still refreshed from the project first — that is what makes
// the freshly edited files visible to `git status` — but the staging call is
// skipped. Callers that own no staging UI (the File menu) keep the old
// stage-everything behaviour by leaving it false.
const commitProject = async ({vm, message, author, onProgress, onlyStaged = false} = {}) => {
    if (!message || typeof message !== 'string' || !message.trim()) {
        throw new Error('Commit message is required');
    }

    if (!vm) {
        throw new Error('VM is required');
    }

    const fs = getFs();
    const pfs = fs.promises;

    if (!(await repoExists())) {
        await initRepo({defaultBranch: 'main', vm: vm});
    }

    if (typeof vm.saveProjectSb3 !== 'function' || typeof vm.loadProject !== 'function') {
        throw new Error('VM does not support save/load project');
    }

    // Compute hash *before* rebuilding the working tree. If it already matches
// the last cached hash, the current worktree is still consistent with the VM
// and we can skip the expensive re-serialization below. We still run the
// statusMatrix afterwards so the "no changes" decision is *never* based on
// the cache alone — the cache is purely a performance hint.
    const projectHash = await computeProjectHash(vm);
    const worktreeAlreadyFresh = worktreeInitialized &&
        lastProjectHash !== null &&
        lastProjectHash === projectHash;

    let sb3ArrayBuffer;

    if (!worktreeAlreadyFresh) {
        try {
            sb3ArrayBuffer = await vm.saveProjectSb3('arraybuffer');
            if (!sb3ArrayBuffer || sb3ArrayBuffer.byteLength === 0) {
                throw new Error('Failed to save project');
            }
        } catch (e) {
            throw new Error(`Failed to save project: ${e.message}`);
        }
    }

    if (typeof onProgress === 'function') {
        onProgress({
            phase: 'snapshot',
            message: getFormattedMessage('mw.git.savingSnapshot', 'Saving project snapshot…'),
            completed: 0,
            total: 1
        });
    }

    try {
        // Only rebuild the working tree when the project actually changed.
        // When the hash was already fresh the worktree is still the one we
        // produced last time, so skip rebuild + rely on the cached status.
        if (!worktreeAlreadyFresh) {
            await writeProjectToFractchTree({vm, sb3ArrayBuffer, fs: pfs, dir: REPO_DIR, onProgress});
        }

        // Ensure any new files are discoverable by isomorphic-git (it uses callback fs,
        // but LightningFS mirrors state).
        if (!onlyStaged) {
            await stageAll(fs, REPO_DIR, {onProgress});
        }

        // After staging, ensure there are changes to commit.
        // If there are no differences, abort the commit.
        const matrixAfter = await git.statusMatrix({fs, dir: REPO_DIR});
        const rowsAfter = matrixAfter.filter(row => row && row[0] !== '.gitignore');
        const hasChanges = rowsAfter.some(row => {
            // statusMatrix rows can be [path, HEAD, WORKDIR] or [path, HEAD, WORKDIR, STAGE]
            const head = row[1];
            if (row.length >= 4) {
                const stage = row[3];
                return head !== stage;
            }
            const workdir = row[2];
            return head !== workdir;
        });

        if (!hasChanges) {
            throw new Error(onlyStaged ? 'No staged changes to commit' : 'No changes to commit');
        }

        const effectiveAuthor = author || getDefaultAuthor();
        if (author) setDefaultAuthor(author);

        if (typeof onProgress === 'function') {
            onProgress({
                phase: 'commit',
                message: getFormattedMessage('mw.git.commit', 'Creating commit…'),
                completed: 1,
                total: 1
            });
        }


        const ret = await git.commit({
            fs,
            dir: REPO_DIR,
            message: message.trim(),
            author: effectiveAuthor
        });
        // HEAD moved — the old hash/worktree cache is now stale. Drop it so
        // the next getRepoChanges rebuilds from the *new* HEAD instead of
        // diffing a freshly edited project against a commit that is no longer
        // the current one.
        resetRepoCache();
        return ret;
    } catch (e) {
        throw new Error(`Failed to commit: ${e.message}`);
    }
};

const deleteRepo = async () => {
    const fs = getFs();
    const pfs = fs.promises;
    if (!(await exists(pfs, REPO_DIR))) return;
    await removeRecursive(pfs, REPO_DIR);
    resetRepoCache();
};

const deleteBranch = async ref => {
    if (!ref || typeof ref !== 'string') {
        throw new Error('Invalid branch name');
    }

    const fs = getFs();
    try {
        const currentBranch = await readCurrentBranch();
        if (currentBranch && currentBranch === ref) {
            throw new Error('Cannot delete the currently checked out branch');
        }
        await git.deleteBranch({fs, dir: REPO_DIR, ref});
    } catch (e) {
        throw new Error(`Failed to delete branch ${ref}: ${e.message}`);
    }
    resetRepoCache();
};

const listBranches = async () => {
    const fs = getFs();
    try {
        return await git.listBranches({fs, dir: REPO_DIR});
    } catch (e) {
        throw new Error(`Failed to list branches: ${e.message}`);
    }
};

const mergeBranchesPreview = async ({ours, theirs} = {}) => {
    if (!ours || !theirs || typeof ours !== 'string' || typeof theirs !== 'string') {
        throw new Error('Invalid branches for merge preview');
    }
    const fs = getFs();
    try {
        const result = await git.merge({
            fs,
            dir: REPO_DIR,
            ours,
            theirs,
            abortOnConflict: true,
            dryRun: true
        });
        return {
            result,
            conflicts: []
        };
    } catch (e) {
        if (Errors && e instanceof Errors.MergeConflictError) {
            const data = e.data || {};
            const conflicts = Array.isArray(data.filepaths) ? data.filepaths : [];
            return {
                result: null,
                conflicts
            };
        }
        throw new Error(`Failed to preview merge: ${e.message}`);
    }
};

const TEXT_MERGE_RE = /\.(fractch|json|svg|txt|md)$/i;

const mergeBranchesApply = async ({ours, theirs, resolutions, author} = {}) => {
    if (!ours || !theirs || typeof ours !== 'string' || typeof theirs !== 'string') {
        throw new Error('Invalid branches for merge');
    }
    const fs = getFs();
    const pfs = fs.promises;
    const map = resolutions && typeof resolutions === 'object' ? resolutions : {};
    const mergeAuthor = author || getDefaultAuthor();
    const message = `Merge branch '${theirs}' into ${ours}`;

    const oursOid = await git.resolveRef({fs, dir: REPO_DIR, ref: ours});
    const theirsOid = await git.resolveRef({fs, dir: REPO_DIR, ref: theirs});
    const {conflicts} = await mergeBranchesPreview({ours, theirs});

    let res;
    if (conflicts.length === 0) {
        res = await git.merge({
            fs,
            dir: REPO_DIR,
            ours,
            theirs,
            abortOnConflict: true,
            author: mergeAuthor,
            message
        });
    } else {
        const mergeDriver = ({path, contents}) => {
            const mergedText = map[path] === 'theirs' ? contents[2] : contents[1];
            return {cleanMerge: true, mergedText};
        };
        try {
            res = await git.merge({
                fs,
                dir: REPO_DIR,
                ours,
                theirs,
                abortOnConflict: false,
                author: mergeAuthor,
                message,
                mergeDriver
            });
        } catch (e) {
            await clearWorkdirExceptGit(pfs);
            await git.checkout({fs, dir: REPO_DIR, ref: ours, force: true});
            throw new Error(`Failed to merge: ${e.message}`);
        }
    }

    await clearWorkdirExceptGit(pfs);
    await git.checkout({fs, dir: REPO_DIR, ref: ours, force: true});

    const binaryConflicts = conflicts.filter(p => !TEXT_MERGE_RE.test(p));
    if (binaryConflicts.length > 0) {
        for (const filepath of binaryConflicts) {
            const sideOid = map[filepath] === 'theirs' ? theirsOid : oursOid;
            let blob = null;
            try {
                ({blob} = await git.readBlob({fs, dir: REPO_DIR, oid: sideOid, filepath}));
            } catch (e) {
                blob = null;
            }
            const dest = pathJoin(REPO_DIR, filepath);
            if (blob) {
                await ensureParentDir(pfs, dest);
                await pfs.writeFile(dest, blob instanceof Uint8Array ? blob : new Uint8Array(blob));
                await git.add({fs, dir: REPO_DIR, filepath});
            } else {
                try {
                    await pfs.unlink(dest);
                } catch (e) {
                    // already absent
                }
                await git.remove({fs, dir: REPO_DIR, filepath});
            }
        }
        res = await git.commit({
            fs,
            dir: REPO_DIR,
            message,
            author: mergeAuthor,
            parent: [oursOid, theirsOid]
        });
    }
    resetRepoCache();
    return res;
};

const getBranchLogs = async ({depth = 50} = {}) => {
    const fs = getFs();
    const branches = await git.listBranches({fs, dir: REPO_DIR});
    const out = [];
    for (const b of branches) {
        const commits = await git.log({fs, dir: REPO_DIR, ref: b, depth});
        out.push({branch: b, commits});
    }
    return out;
};

const CONFLICT_MARKER_RE = /^(?:<{7}|={7}|>{7})/m;

let pendingMerge = null;

const getPendingMerge = () => (pendingMerge ? {...pendingMerge} : null);

const setPendingMerge = value => {
    pendingMerge = value;
};

const startEditorMerge = async ({ours, theirs, author} = {}) => {
    if (!ours || !theirs || typeof ours !== 'string' || typeof theirs !== 'string') {
        throw new Error('Invalid branches for merge');
    }
    const fs = getFs();
    const oursOid = await git.resolveRef({fs, dir: REPO_DIR, ref: ours});
    const theirsOid = await git.resolveRef({fs, dir: REPO_DIR, ref: theirs});
    const message = `Merge branch '${theirs}' into ${ours}`;
    try {
        const result = await git.merge({
            fs,
            dir: REPO_DIR,
            ours,
            theirs,
            abortOnConflict: false,
            author: author || getDefaultAuthor(),
            message
        });
        setPendingMerge(null);
        return {conflicts: [], merged: true, result};
    } catch (e) {
        if (!(Errors && e instanceof Errors.MergeConflictError)) throw e;
        const data = e.data || {};
        const conflicts = Array.isArray(data.filepaths) ? data.filepaths : [];
        const text = conflicts.filter(filepath => TEXT_MERGE_RE.test(filepath));
        setPendingMerge({
            binary: conflicts.filter(filepath => !TEXT_MERGE_RE.test(filepath)),
            conflicts: text,
            message,
            ours,
            oursOid,
            theirs,
            theirsOid
        });
        return {conflicts: text, merged: false};
    }
    resetRepoCache();
};

const abortEditorMerge = async () => {
    if (!pendingMerge) return;
    const fs = getFs();
    const {ours} = pendingMerge;
    setPendingMerge(null);
    await clearWorkdirExceptGit(fs.promises);
    await git.checkout({fs, dir: REPO_DIR, ref: ours, force: true});
    resetRepoCache();
};

const completeEditorMerge = async ({author} = {}) => {
    if (!pendingMerge) throw new Error('No merge in progress');
    const fs = getFs();
    const pfs = fs.promises;
    const unresolved = [];
    for (const filepath of pendingMerge.conflicts) {
        const data = await pfs.readFile(pathJoin(REPO_DIR, filepath), 'utf8');
        if (CONFLICT_MARKER_RE.test(String(data))) unresolved.push(filepath);
    }
    if (unresolved.length > 0) {
        throw new Error(`Still has conflict markers: ${unresolved.join(', ')}`);
    }
    for (const filepath of pendingMerge.conflicts) {
        await git.add({fs, dir: REPO_DIR, filepath});
    }
    const oid = await git.commit({
        fs,
        dir: REPO_DIR,
        message: pendingMerge.message,
        author: author || getDefaultAuthor(),
        parent: [pendingMerge.oursOid, pendingMerge.theirsOid]
    });
    setPendingMerge(null);
    return oid;
};

// Remote-tracking refs (refs/remotes/<remote>/<branch>) only exist once a
// clone/fetch/pull (or a push through this module) has happened. Each becomes a
// *label* on the commits it points at ("origin/main"), never a lane of its own.
const listRemoteBranchLogs = async ({fs, depth = 50} = {}) => {
    const out = [];
    let remotes = [];
    try {
        remotes = await git.listRemotes({fs, dir: REPO_DIR});
    } catch (e) {
        remotes = [];
    }
    for (const entry of remotes) {
        const remote = entry.remote || entry.name;
        if (!remote) continue;
        let names = [];
        try {
            names = await git.listBranches({fs, dir: REPO_DIR, remote});
        } catch (e) {
            continue; // nothing fetched for this remote yet
        }
        for (const name of names) {
            // Skip the per-remote "HEAD" symbolic ref if a tool created one —
            // it would duplicate the branch it points at as a separate label.
            if (!name || name === 'HEAD') continue;
            let commits = [];
            try {
                commits = await git.log({
                    fs,
                    dir: REPO_DIR,
                    ref: `refs/remotes/${remote}/${name}`,
                    depth
                });
            } catch (e) {
                continue;
            }
            if (Array.isArray(commits) && commits.length > 0) {
                out.push({branch: `${remote}/${name}`, commits});
            }
        }
    }
    return out;
};

// Cheap signature of every remote-tracking ref (name + oid). Used by the UI
// container to key the commit-graph cache: a push/fetch/pull that only moves a
// refs/remotes/* ref (without touching the local history) must still rebuild
// the graph so the new remote chips show up.
const getRemoteTrackingState = async () => {
    const fs = getFs();
    let remotes = [];
    try {
        remotes = await git.listRemotes({fs, dir: REPO_DIR});
    } catch (e) {
        return '';
    }
    const parts = [];
    for (const entry of remotes) {
        const remote = entry.remote || entry.name;
        if (!remote) continue;
        let names = [];
        try {
            names = await git.listBranches({fs, dir: REPO_DIR, remote});
        } catch (e) {
            continue;
        }
        for (const name of names) {
            if (!name || name === 'HEAD') continue;
            try {
                const oid = await git.resolveRef({
                    fs,
                    dir: REPO_DIR,
                    ref: `refs/remotes/${remote}/${name}`
                });
                parts.push(`${remote}/${name}:${oid}`);
            } catch (e) {
                // Dangling or missing ref — skip it.
            }
        }
    }
    return parts.sort().join('|');
};

const computeCommitGraph = async ({depth = 50} = {}) => {
    const fs = getFs();
    const branches = await git.listBranches({fs, dir: REPO_DIR});
    const logs = await getBranchLogs({depth});

    // Detached HEAD: after "restore this commit" the HEAD points straight at an
    // oid (no local branch). Any commit made in that state lives on no branch,
    // so walking only local branches would silently hide it from History —
    // the graph would show just the fetched/remote history. Fold the HEAD chain
    // in as a virtual branch so those local commits stay visible.
    const headBranch = await readCurrentBranch();
    if (!headBranch) {
        try {
            const headLog = await git.log({fs, dir: REPO_DIR, depth});
            if (Array.isArray(headLog) && headLog.length > 0) {
                logs.push({branch: DETACHED_BRANCH, commits: headLog});
            }
        } catch (e) {
            // HEAD may not resolve yet (unborn branch); nothing to fold in.
        }
    }

    // Remote-tracking refs feed the same node map as *extra labels only*: they
    // stay out of `logs`/`branchLogs`, so graph-layout never grants them a lane.
    // A pulled branch therefore renders with both chips on one lane —
    // local "main" (blue) plus remote "origin/main" (purple).
    const remoteLogs = await listRemoteBranchLogs({fs, depth});

    const map = new Map();
    const absorb = entry => {
        for (const c of entry.commits) {
            const key = c.oid;
            if (!map.has(key)) {
                const parents = Array.isArray(c.commit.parent) ?
                    c.commit.parent :
                    (Array.isArray(c.commit.parents) ?
                        c.commit.parents : []);
                map.set(key, {oid: c.oid, commit: c.commit, branches: new Set(), parents});
            }
            map.get(key).branches.add(entry.branch);
        }
    };
    logs.forEach(absorb);
    remoteLogs.forEach(absorb);

    const nodes = Array.from(map.values())
        .map(n => ({oid: n.oid, commit: n.commit, branches: Array.from(n.branches), parents: n.parents}))
        .sort((a, b) => (b.commit.author.timestamp || 0) - (a.commit.author.timestamp || 0));
    const branchLogs = logs.map(l => ({branch: l.branch, oids: l.commits.map(c => c.oid)}));
    return {
        branches,
        nodes,
        branchLogs,
        remoteBranches: remoteLogs.map(l => l.branch)
    };
};

const exportRepoToZip = async ({includeGitDir = true} = {}) => {
    const fs = getFs();
    const pfs = fs.promises;

    if (!(await repoExists())) {
        throw new Error('Repository not initialized');
    }

    const zip = new JSZip();
    const root = REPO_DIR;

    const files = await listFilesRecursive(pfs, root);

    for (const absPath of files) {
        if (!includeGitDir && absPath.startsWith(`${REPO_DIR}/.git/`)) {
            continue;
        }

        const relPath = absPath.replace(`${REPO_DIR}/`, '');

        try {
            const data = await pfs.readFile(absPath);
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

            zip.file(relPath, bytes);
        } catch (e) {
            console.warn('Skipping file during zip export:', relPath, e);
        }
    }

    return zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {level: 6}
    });
};

const downloadRepoZip = async options => {
    const blob = await exportRepoToZip(options);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-repo.zip';
    a.click();
    URL.revokeObjectURL(url);
};

const commitSb3 = async ({
    sb3ArrayBuffer,
    message,
    author,
    onProgress,
    vm
} = {}) => {
    if (!sb3ArrayBuffer || !(sb3ArrayBuffer instanceof ArrayBuffer)) {
        throw new Error('Invalid SB3 buffer');
    }
    if (!message || !message.trim()) {
        throw new Error('Commit message is required');
    }

    const fs = getFs();
    const pfs = fs.promises;

    if (!(await repoExists())) {
        await initRepo({defaultBranch: 'main'});
    }

    if (typeof onProgress === 'function') {
        onProgress({
            phase: 'snapshot',
            message: getFormattedMessage('mw.git.convertingFractch', 'Converting project to fractch…')
        });
    }

    await writeProjectToFractchTree({
        sb3ArrayBuffer,
        fs: pfs,
        dir: REPO_DIR,
        onProgress,
        vm: vm
    });

    await stageAll(fs, REPO_DIR, {onProgress});

    const authorUsed = author || getDefaultAuthor();
    if (author) setDefaultAuthor(author);

    const oid = await git.commit({
        fs,
        dir: REPO_DIR,
        message: message.trim(),
        author: authorUsed
    });

    resetRepoCache();
    return oid;
};

const pickSb3File = () => new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sb,.sb2,.sb3,.json';

    input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return reject(new Error('No file selected'));
        resolve(file);
    };

    input.click();
});

const README_FILE = 'README.md';

const readReadme = async () => {
    const fs = getFs();
    const pfs = fs.promises;
    if (!(await repoExists())) return '';
    try {
        const data = await pfs.readFile(pathJoin(REPO_DIR, README_FILE), 'utf8');
        return typeof data === 'string' ? data : new TextDecoder().decode(data);
    } catch (e) {
        return '';
    }
};

const writeReadme = async content => {
    const fs = getFs();
    const pfs = fs.promises;
    if (!(await repoExists())) {
        throw new Error('Initialize a repository first');
    }
    const text = content === null || typeof content === 'undefined' ? '' : String(content);
    if (text.length === 0) {
        // Empty README: remove the file so it doesn't linger as an empty blob.
        try {
            await pfs.unlink(pathJoin(REPO_DIR, README_FILE));
        } catch (e) {
            // not present, nothing to do
        }
        return;
    }
    await pfs.writeFile(pathJoin(REPO_DIR, README_FILE), text);
};

// Clone a git repository into LightningFS, replacing any existing repo. After
// this, the working tree holds the cloned files (fractch source + .git).
const moveDir = async (pfs, from, to) => {
    try {
        await pfs.rename(from, to);
        return;
    } catch (e) {
        // fall back to copy
    }
    await ensureDir(pfs, to);
    const entries = await pfs.readdir(from);
    for (const entry of entries) {
        const src = `${from}/${entry}`;
        const dest = `${to}/${entry}`;
        const stat = await pfs.stat(src);
        if (stat.isDirectory()) {
            await moveDir(pfs, src, dest);
        } else {
            const data = await pfs.readFile(src);
            await pfs.writeFile(dest, data instanceof Uint8Array ? data : new Uint8Array(data));
        }
    }
    await removeRecursive(pfs, from);
};

const cloneRepo = async ({url, ref, onAuth, onProgress} = {}) => {
    if (!url || typeof url !== 'string') {
        throw new Error('Repository URL is required');
    }

    const fs = getFs();
    const pfs = fs.promises;
    const tmpDir = `${REPO_DIR}-clone-${Date.now()}`;

    try {
        await ensureDir(pfs, tmpDir);
        const cloneOptions = {
            fs,
            http,
            dir: tmpDir,
            url: url.trim(),
            corsProxy: corsProxyForUrl(url.trim()),
            singleBranch: false,
            onAuth,
            onProgress: evt => {
                if (typeof onProgress === 'function' && evt) {
                    onProgress({
                        phase: 'clone',
                        message: getFormattedMessage(
                            'mw.git.cloneProgress',
                            'Cloning… {phase}',
                            {phase: translateGitProgressPhase(evt.phase)}
                        ).trim(),
                        completed: evt.loaded,
                        total: evt.total
                    });
                }
            }
        };
        if (ref) cloneOptions.ref = ref;
        await git.clone(cloneOptions);
    } catch (e) {
        try {
            await removeRecursive(pfs, tmpDir);
        } catch (cleanupError) {
            // ignore
        }
        throw new Error(`Failed to clone: ${e.message}`);
    }

    await deleteRepo();
    await moveDir(pfs, tmpDir, REPO_DIR);

    resetRepoCache();
    return {fs, dir: REPO_DIR};
};

// True if the repo working tree contains at least one .fractch source file.
const repoHasFractch = async () => {
    const fs = getFs();
    const pfs = fs.promises;
    if (!(await repoExists())) return false;
    try {
        const files = await listFilesRecursive(pfs, REPO_DIR);
        return files.some(f => /\.fractch$/i.test(f) && !f.includes('/.git/'));
    } catch (e) {
        return false;
    }
};

const normalizeWorktreePath = filepath => {
    if (!filepath || typeof filepath !== 'string' || filepath.includes('\\')) {
        throw new Error('Invalid workspace path');
    }
    const parts = filepath.replace(/^\.\//, '').split('/');
    if (filepath.startsWith('/') || parts.some(part => !part || part === '.' || part === '..') || parts[0] === '.git') {
        throw new Error('Invalid workspace path');
    }
    return parts.join('/');
};

const listWorktreeFiles = async () => {
    if (!(await repoExists())) return [];
    const files = await listFilesRecursive(getFs().promises, REPO_DIR);
    return files
        .filter(file => !file.startsWith(`${REPO_DIR}/.git/`))
        .map(file => file.slice(REPO_DIR.length + 1))
        .sort();
};

const readWorktreeFile = async filepath => {
    const relative = normalizeWorktreePath(filepath);
    const data = await getFs().promises.readFile(pathJoin(REPO_DIR, relative));
    return data instanceof Uint8Array ? data : new TextEncoder().encode(data);
};

const writeWorktreeFile = async (filepath, data) => {
    const relative = normalizeWorktreePath(filepath);
    const destination = pathJoin(REPO_DIR, relative);
    await ensureParentDir(getFs().promises, destination);
    await getFs().promises.writeFile(destination, data);
};

const deleteWorktreeFile = async filepath => {
    const relative = normalizeWorktreePath(filepath);
    await removeRecursive(getFs().promises, pathJoin(REPO_DIR, relative));
};

const readHeadFile = async filepath => {
    const relative = normalizeWorktreePath(filepath);
    const fs = getFs();
    try {
        const oid = await git.resolveRef({fs, dir: REPO_DIR, ref: 'HEAD'});
        const {blob} = await git.readBlob({fs, dir: REPO_DIR, oid, filepath: relative});
        return new TextDecoder().decode(blob instanceof Uint8Array ? blob : new Uint8Array(blob));
    } catch (e) {
        return null;
    }
};

const prepareFractchWorkspace = async vm => {
    await initRepo({vm});
    await writeProjectToFractchTree({vm, fs: getFs().promises, dir: REPO_DIR});
    return listWorktreeFiles();
};

const applyFractchWorkspace = async vm => {
    if (!vm) throw new Error('VM not provided');
    const bytes = await buildSb3FromFractchTree({fs: getFs().promises, dir: REPO_DIR});
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await RestorePointAPI.createSafetyRestorePoint(vm, 'Before git restore');
    vm.quit();
    await vm.loadProject(buffer, {skipGitImport: true});
    if (vm.renderer) vm.renderer.draw();
};

// Copy the entire LightningFS repo (fractch working tree + .git) into an sb3 zip
// under GIT_EMBED_DIR, leaving the normal project.json/assets at the top level.
// Returns a new Blob; if there is no repo, the original blob is returned as-is.
const embedRepoIntoSb3Blob = async blob => {
    if (!blob) return blob;
    if (!(await repoExists())) return blob;

    const fs = getFs();
    const pfs = fs.promises;

    let zip;
    try {
        zip = await JSZip.loadAsync(blob);
    } catch (e) {
        console.warn('Could not open sb3 to embed git history:', e);
        return blob;
    }

    const files = await listFilesRecursive(pfs, REPO_DIR);
    for (const absPath of files) {
        const rel = absPath.slice(REPO_DIR.length + 1);
        if (!rel) continue;
        try {
            const data = await pfs.readFile(absPath);
            zip.file(`${GIT_EMBED_DIR}/${rel}`, data instanceof Uint8Array ? data : new Uint8Array(data));
        } catch (e) {
            console.warn('Skipping repo file while embedding:', rel, e);
        }
    }

    // Level 1 (not 6): this re-compresses the ENTIRE project zip on every save,
    // including the whole embedded .git object store. Git objects are already
    // compressed internally, so level 6 buys little extra ratio here while making
    // every Ctrl+S noticeably slower on medium/large repos.
    return zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {level: 1}
    });
};

// Restore a repo previously embedded by embedRepoIntoSb3Blob back into LightningFS.
// If the sb3 has no embedded repo, any stale repo is cleared so the git panel
// matches the freshly loaded project. Returns true when a repo was imported.
const importRepoFromSb3 = async input => {
    if (!input) return false;

    let zip;
    try {
        zip = await JSZip.loadAsync(input);
    } catch (e) {
        try {
            await deleteRepo();
        } catch (cleanupError) {
            // ignore
        }
        return false;
    }

    const prefix = `${GIT_EMBED_DIR}/`;
    const entryPaths = Object.keys(zip.files).filter(p => p.startsWith(prefix) && !zip.files[p].dir);

    const fs = getFs();
    const pfs = fs.promises;

    if (entryPaths.length === 0) {
        // Deliberate "switch workspace" semantics: the git panel's repository is
        // bound to the project that was saved/loaded. Loading a project without
        // an embedded repo (e.g. an external .sb3) therefore clears any stale
        // repo from a previous session, otherwise the panel would show the old
        // project's history. Note: locally saved RemixWarp projects always embed the
        // repo (see embedRepoIntoSb3Blob), so reopening your own file restores it.
        console.info('[git] loaded project has no embedded repo; clearing stale repo');
        try {
            await deleteRepo();
        } catch (e) {
            // ignore
        }
        return false;
    }

    await deleteRepo();
    await ensureDir(pfs, REPO_DIR);

    for (const p of entryPaths) {
        const rel = p.slice(prefix.length);
        if (!rel) continue;
        const segments = rel.split('/');
        if (segments.some(s => s === '..' || s === '')) {
            console.warn('Skipping unsafe embedded repo path on import:', p);
            continue;
        }
        try {
            const data = await zip.files[p].async('uint8array');
            const dest = pathJoin(REPO_DIR, rel);
            await ensureParentDir(pfs, dest);
            await pfs.writeFile(dest, data);
        } catch (e) {
            console.warn('Skipping embedded repo file on import:', p, e);
        }
    }

    resetRepoCache();
    return true;
};

const pickAndCommitSb3 = async ({
    message,
    author,
    onProgress,
    vm
}) => {
    const file = await pickSb3File();
    const buffer = await file.arrayBuffer();

    return commitSb3({
        sb3ArrayBuffer: buffer,
        message,
        author,
        onProgress,
        vm
    });
};

export {
    getDefaultAuthor,
    setDefaultAuthor,
    ensureParentDir,
    getRepoStatus,
    getRepoChanges,
    getFs,
    initRepo,
    repoExists,
    createBranch,
    checkoutBranch,
    checkoutBranchAndRestore,
    listBranches,
    checkoutCommitAndRestore,
    restoreProjectFromCurrentRef,
    readSnapshotAtCommit,
    getBranchLogs,
    computeCommitGraph,
    getRemoteTrackingState,
    deleteRepo,
    deleteBranch,
    commitProject,
    mergeBranchesPreview,
    mergeBranchesApply,
    addRemote,
    removeRemote,
    getRemotes,
    push,
    pull,
    fetchRemote,
    getUpstreamBranch,
    exportRepoToZip,
    downloadRepoZip,
    commitSb3,
    pickAndCommitSb3,
    embedRepoIntoSb3Blob,
    importRepoFromSb3,
    cloneRepo,
    repoHasFractch,
    repoHasHead,
    readCurrentBranch,
    startEditorMerge,
    completeEditorMerge,
    abortEditorMerge,
    getPendingMerge,
    listWorktreeFiles,
    readWorktreeFile,
    readHeadFile,
    writeWorktreeFile,
    deleteWorktreeFile,
    prepareFractchWorkspace,
    applyFractchWorkspace,
    readReadme,
    writeReadme,
    REPO_DIR,
    git
};

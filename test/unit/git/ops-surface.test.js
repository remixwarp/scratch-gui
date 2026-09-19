/**
 * Integration tests for the mw-git operation layer (ops).
 *
 * The real repository needs OPFS/IndexedDB, which jest cannot provide, so the
 * browser-git backend is mocked. What is *not* mocked is the layer under test —
 * the lock, the shared store and the error normalization — which is exactly the
 * contract M0 introduced:
 *   - every op reports into the single store,
 *   - overlapping ops serialize instead of interleaving,
 *   - failures become typed errors and never leave the UI stuck "busy".
 *
 * NOTE: modules under test are required (not imported) on purpose — this
 * project's babel transformer does not hoist `jest.mock`, so a top-level
 * `import` would load the real browser-git before the mock is registered
 * (same pattern as test/unit/browser-terminal.test.js).
 */

jest.mock('../../../src/lib/git/browser-git', () => {
    const git = {
        statusMatrix: jest.fn(async () => []),
        listRemotes: jest.fn(async () => []),
        currentBranch: jest.fn(async () => 'main'),
        resolveRef: jest.fn(async () => 'abc123'),
        log: jest.fn(async () => []),
        listBranches: jest.fn(async () => []),
        add: jest.fn(async () => {}),
        remove: jest.fn(async () => {}),
        resetIndex: jest.fn(async () => {}),
        // Rename detection reads the HEAD blob of a deleted path and hashes the
        // working-tree bytes of an untracked one.
        readBlob: jest.fn(async () => ({oid: 'blob-same'})),
        hashBlob: jest.fn(async () => ({oid: 'blob-same'}))
    };
    return {
        git,
        getFs: () => ({promises: {readFile: async () => new Uint8Array([1, 2, 3])}}),
        REPO_DIR: '/repo',
        repoExists: jest.fn(async () => true),
        repoHasFractch: jest.fn(async () => true),
        // A repository whose HEAD is readable; `readCurrentBranch` mirrors the
        // backend helper that swallows "Could not find HEAD." instead of throwing.
        repoHasHead: jest.fn(async () => true),
        readCurrentBranch: jest.fn(async () => 'main'),
        initRepo: jest.fn(async () => {}),
        deleteRepo: jest.fn(async () => {}),
        readSnapshotAtCommit: jest.fn(async () => new ArrayBuffer(0)),
        getDefaultAuthor: () => ({name: 'User', email: 'user@example.com'}),
        setDefaultAuthor: jest.fn(),
        getRepoChanges: jest.fn(async () => []),
        getUpstreamBranch: jest.fn(async () => null),
        getBranchLogs: jest.fn(async () => []),
        computeCommitGraph: jest.fn(async () => ({branches: ['main'], nodes: [], remoteBranches: []})),
        listBranches: jest.fn(async () => ['main']),
        createBranch: jest.fn(async () => 'ok'),
        deleteBranch: jest.fn(async () => 'ok'),
        checkoutBranchAndRestore: jest.fn(async () => 'ok'),
        checkoutCommitAndRestore: jest.fn(async () => 'ok'),
        restoreProjectFromCurrentRef: jest.fn(async () => {}),
        commitProject: jest.fn(async () => 'new-oid'),
        mergeBranchesPreview: jest.fn(async () => ({result: {}, conflicts: []})),
        mergeBranchesApply: jest.fn(async () => ({})),
        startEditorMerge: jest.fn(async () => ({conflicts: [], merged: true})),
        completeEditorMerge: jest.fn(async () => 'merge-oid'),
        abortEditorMerge: jest.fn(async () => {}),
        getPendingMerge: jest.fn(() => null),
        addRemote: jest.fn(async () => {}),
        removeRemote: jest.fn(async () => {}),
        push: jest.fn(async () => ({ok: true})),
        pull: jest.fn(async () => ({status: 'ahead'})),
        fetchRemote: jest.fn(async () => ({status: 'fetched'})),
        cloneRepo: jest.fn(async () => ({fs: {}, dir: '/repo'})),
        readReadme: jest.fn(async () => ''),
        writeReadme: jest.fn(async () => {})
    };
});

const bg = require('../../../src/lib/git/browser-git');
const ops = require('../../../src/lib/git/ops').default;
const gitStore = require('../../../src/lib/git/state/store').default;
const {GIT_ERROR_CODES} = require('../../../src/lib/git/errors');

// jest 21 has no mockResolvedValue / mockRejectedValue — emulate them.
const atResolve = value => () => Promise.resolve(value);
const atReject = error => () => Promise.reject(error);

const deferred = () => {
    let resolve;
    const promise = new Promise(res => {
        resolve = res;
    });
    return {promise, resolve};
};

describe('git ops', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        gitStore.reset();
        bg.repoExists.mockImplementation(atResolve(true));
        bg.repoHasHead.mockImplementation(atResolve(true));
        bg.readCurrentBranch.mockImplementation(atResolve('main'));
        bg.git.currentBranch.mockImplementation(atResolve('main'));
        bg.git.statusMatrix.mockImplementation(atResolve([]));
        bg.git.listRemotes.mockImplementation(atResolve([]));
        bg.getUpstreamBranch.mockImplementation(atResolve(null));
        bg.getRepoChanges.mockImplementation(atResolve([]));
        bg.commitProject.mockImplementation(atResolve('new-oid'));
        bg.pull.mockImplementation(atResolve({status: 'ahead'}));
        bg.fetchRemote.mockImplementation(atResolve({status: 'fetched'}));
        bg.repoHasFractch.mockImplementation(atResolve(true));
        bg.git.log.mockImplementation(atResolve([]));
        bg.git.readBlob.mockImplementation(atResolve({oid: 'blob-same'}));
        bg.git.hashBlob.mockImplementation(atResolve({oid: 'blob-same'}));
    });

    test('refreshRepository hydrates the shared store', async () => {
        await ops.refreshRepository({projectId: 'p1'});
        const state = gitStore.getState();
        expect(state.repo.initialized).toBe(true);
        expect(state.repo.branch).toBe('main');
        expect(state.repo.detached).toBe(false);
        expect(state.repo.projectId).toBe('p1');
    });

    test('refreshRepository publishes the commits and branches summary', async () => {
        bg.git.log.mockImplementation(atResolve([{oid: 'c2'}, {oid: 'c1'}]));
        bg.git.listBranches.mockImplementation(atResolve(['main', 'dev']));
        await ops.refreshRepository({});
        const state = gitStore.getState();
        expect(state.commits.map(c => c.oid)).toEqual(['c2', 'c1']);
        expect(state.branches).toEqual(['main', 'dev']);
    });

    test('refreshRepository reports an uninitialized repo without throwing', async () => {
        bg.repoExists.mockImplementation(atResolve(false));
        bg.repoHasHead.mockImplementation(atResolve(false));
        const result = await ops.refreshRepository({});
        expect(result.initialized).toBe(false);
        expect(gitStore.getState().repo.initialized).toBe(false);
        expect(gitStore.getState().changes).toEqual([]);
    });

    // The sb3 importer writes an embedded repository file by file, so a refresh
    // can catch the skeleton (.git/ exists, HEAD not written yet) — every
    // isomorphic-git read throws "Could not find HEAD." there, which used to
    // surface as "Failed to refresh git state" (test F1). It must read as
    // "not initialized yet" instead.
    test('a repository without HEAD reads as uninitialized instead of erroring', async () => {
        bg.repoExists.mockImplementation(atResolve(true));
        bg.repoHasHead.mockImplementation(atResolve(false));
        const result = await ops.refreshRepository({});
        expect(result.initialized).toBe(false);
        expect(gitStore.getState().repo.initialized).toBe(false);
        expect(gitStore.getState().error).toBe(null);
        // The read path must not even ask for the branch.
        expect(bg.git.currentBranch).not.toHaveBeenCalled();
    });

    test('commit resolves with the new oid and leaves the ui idle', async () => {
        const result = await ops.commit({vm: {}, message: 'feat: x'});
        expect(result.oid).toBe('new-oid');
        expect(bg.commitProject).toHaveBeenCalledTimes(1);
        expect(gitStore.getState().op).toBe(null);
        expect(gitStore.getState().error).toBe(null);
        expect(gitStore.getState().notice).toBeTruthy();
    });

    test('a failing commit becomes a typed error and clears the busy flag', async () => {
        bg.commitProject.mockImplementation(atReject(new Error('No changes to commit')));
        let caught = null;
        try {
            await ops.commit({vm: {}, message: 'feat: x'});
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeTruthy();
        expect(caught.code).toBe(GIT_ERROR_CODES.NO_CHANGES);
        expect(gitStore.getState().op).toBe(null);
        expect(gitStore.getState().error.code).toBe(GIT_ERROR_CODES.NO_CHANGES);
    });

    test('overlapping operations are serialized, never interleaved', async () => {
        const gate = deferred();
        const order = [];
        bg.push.mockImplementation(async () => {
            order.push('push-start');
            await gate.promise;
            order.push('push-end');
            return {ok: true};
        });
        bg.commitProject.mockImplementation(async () => {
            order.push('commit');
            return 'after-oid';
        });

        const pushing = ops.pushBranch({vm: {}, remote: 'origin', branch: 'main'});
        const committing = ops.commit({vm: {}, message: 'feat: y'});
        // Let the queue reach the push, then release it.
        await Promise.resolve();
        await Promise.resolve();
        gate.resolve();

        await Promise.all([pushing, committing]);
        expect(order).toEqual(['push-start', 'push-end', 'commit']);
    });

    test('the store is busy while an operation runs', async () => {
        const gate = deferred();
        bg.fetchRemote.mockImplementation(async () => {
            await gate.promise;
            return {status: 'fetched'};
        });
        const running = ops.fetchRemote({remote: 'origin'});
        await Promise.resolve();
        expect(gitStore.getState().op).toBeTruthy();
        gate.resolve();
        await running;
        expect(gitStore.getState().op).toBe(null);
    });

    test('the busy descriptor belongs to the running op, not the queued one', async () => {
        // A4: both surfaces can fire at once. The queued operation used to raise
        // its own busy label before it owned the lock (so the panel said
        // "fetching" during a push) and then cleared `op` when the *first* one
        // finished — leaving the second running with no indicator.
        const tick = () => new Promise(resolve => setTimeout(resolve, 0));
        const pushGate = deferred();
        const fetchGate = deferred();
        bg.push.mockImplementation(async () => {
            await pushGate.promise;
            return {ok: true};
        });
        bg.fetchRemote.mockImplementation(async () => {
            await fetchGate.promise;
            return {status: 'fetched'};
        });

        const pushing = ops.pushBranch({vm: {}, remote: 'origin', branch: 'main'});
        const fetching = ops.fetchRemote({remote: 'origin'});
        await tick();
        expect(gitStore.getState().op && gitStore.getState().op.name).toBe('push');

        pushGate.resolve();
        await pushing;
        // Wait for the queued fetch to take the slot it was waiting for.
        for (let i = 0; i < 20 && !gitStore.getState().op; i++) {
            await tick();
        }
        expect(gitStore.getState().op && gitStore.getState().op.name).toBe('fetch');

        fetchGate.resolve();
        await fetching;
        expect(gitStore.getState().op).toBe(null);
    });

    test('pull distinguishes up-to-date from advanced', async () => {
        // The backend now reports the three cases apart (remote/reconcile.js),
        // so ops no longer guesses "ahead vs in sync" from the ahead counter.
        // Both no-op verdicts must leave the open project untouched — rebuilding
        // it is what used to throw away the undo stack on a local-ahead pull.
        bg.pull.mockImplementation(atResolve({status: 'up-to-date'}));
        const upToDate = await ops.pullBranch({vm: {}, remote: 'origin'});
        expect(upToDate.kind).toBe('up-to-date');
        expect(bg.restoreProjectFromCurrentRef).not.toHaveBeenCalled();

        bg.pull.mockImplementation(atResolve({status: 'ahead'}));
        const ahead = await ops.pullBranch({vm: {}, remote: 'origin'});
        expect(ahead.kind).toBe('ahead');
        expect(bg.restoreProjectFromCurrentRef).not.toHaveBeenCalled();

        bg.pull.mockImplementation(atResolve({status: 'pulled', oid: 'remote-oid'}));
        const advanced = await ops.pullBranch({vm: {}, remote: 'origin'});
        expect(advanced.kind).toBe('fast-forwarded');
        expect(advanced.oid).toBe('remote-oid');
        expect(bg.restoreProjectFromCurrentRef).toHaveBeenCalledTimes(1);
    });

    test('a diverged pull surfaces the DIVERGED code', async () => {
        bg.pull.mockImplementation(atReject(new Error('Diverged branches: your local branch and the remote have commits')));
        let caught = null;
        try {
            await ops.pullBranch({vm: {}, remote: 'origin'});
        } catch (e) {
            caught = e;
        }
        expect(caught.code).toBe(GIT_ERROR_CODES.DIVERGED);
    });

    test('staging a modified file goes through the index, a deleted one through remove', async () => {
        bg.git.statusMatrix.mockImplementation(atResolve([
            ['a.fractch', 1, 2, 1],
            ['b.fractch', 1, 0, 1]
        ]));
        await ops.stageFiles({vm: {}, filepaths: ['a.fractch', 'b.fractch']});
        expect(bg.git.add).toHaveBeenCalledWith(expect.objectContaining({filepath: 'a.fractch'}));
        expect(bg.git.remove).toHaveBeenCalledWith(expect.objectContaining({filepath: 'b.fractch'}));
    });

    test('unstaging only touches paths staged in the index', async () => {
        bg.git.statusMatrix.mockImplementation(atResolve([
            ['staged.fractch', 1, 2, 2],
            ['untouched.fractch', 1, 1, 1]
        ]));
        await ops.unstageAllFiles({vm: {}});
        expect(bg.git.resetIndex).toHaveBeenCalledTimes(1);
        expect(bg.git.resetIndex).toHaveBeenCalledWith(expect.objectContaining({filepath: 'staged.fractch'}));
    });

    test('previewMerge reports whether the merge is clean', async () => {
        expect((await ops.previewMerge({ours: 'main', theirs: 'dev'})).clean).toBe(true);
        bg.mergeBranchesPreview.mockImplementation(atResolve({result: null, conflicts: ['a.fractch']}));
        expect((await ops.previewMerge({ours: 'main', theirs: 'dev'})).clean).toBe(false);
    });

    test('startMerge keeps the editor flow when conflicts remain', async () => {
        bg.getPendingMerge.mockReturnValue({conflicts: ['a.fractch'], binary: []});
        bg.startEditorMerge.mockImplementation(atResolve({conflicts: ['a.fractch'], merged: false}));
        const result = await ops.startMerge({vm: {}, ours: 'main', theirs: 'dev'});
        expect(result.merged).toBe(false);
        expect(result.conflicts).toEqual(['a.fractch']);
        expect(gitStore.getState().conflicts).toEqual(['a.fractch']);
    });

    test('read-only surface stays available and pure', () => {
        expect(typeof ops.getState).toBe('function');
        expect(typeof ops.subscribe).toBe('function');
        expect(ops.exportRepositoryConfig({}).kind).toBe('remixwarp-git-config');
    });

    // --- M1 additions ------------------------------------------------------

    test('clone refuses a repository without a fractch tree and cleans up', async () => {
        bg.repoHasFractch.mockImplementation(atResolve(false));
        let caught = null;
        try {
            await ops.cloneRepository({vm: {}, url: 'https://example.com/x.git'});
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeTruthy();
        expect(caught.code).toBe(GIT_ERROR_CODES.NOT_FRACTCH);
        // The half-cloned repository must not be left behind...
        expect(bg.deleteRepo).toHaveBeenCalledTimes(1);
        // ...and the open project must not be touched.
        expect(bg.restoreProjectFromCurrentRef).not.toHaveBeenCalled();
    });

    test('undoLastCommit refuses to run on a detached HEAD', async () => {
        // ops reads the checked-out branch through the tolerant helper (null
        // means detached *or* an unreadable HEAD), not via git.currentBranch.
        bg.readCurrentBranch.mockImplementation(atResolve(null));
        let caught = null;
        try {
            await ops.undoLastCommit({vm: {}});
        } catch (e) {
            caught = e;
        }
        expect(caught.code).toBe(GIT_ERROR_CODES.DETACHED_HEAD);
        expect(bg.commitProject).not.toHaveBeenCalled();
    });

    test('undoLastCommit needs a previous commit', async () => {
        bg.git.log.mockImplementation(atResolve([{oid: 'only', commit: {message: 'init'}}]));
        let caught = null;
        try {
            await ops.undoLastCommit({vm: {}});
        } catch (e) {
            caught = e;
        }
        expect(caught.code).toBe(GIT_ERROR_CODES.NO_PREVIOUS_COMMIT);
        expect(gitStore.getState().op).toBe(null);
    });

    test('undoLastCommit reloads the previous snapshot and commits it back', async () => {
        const vm = {quit: jest.fn(), loadProject: jest.fn(async () => {})};
        bg.git.log.mockImplementation(atResolve([
            {oid: 'head-oid', commit: {message: 'feat: two\n\nbody'}},
            {oid: 'prev-oid', commit: {message: 'feat: one'}}
        ]));
        await ops.undoLastCommit({vm});
        expect(bg.readSnapshotAtCommit).toHaveBeenCalledWith('prev-oid');
        expect(vm.quit).toHaveBeenCalledTimes(1);
        expect(vm.loadProject).toHaveBeenCalledTimes(1);
        expect(bg.commitProject).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Undo: feat: two'
        }));
    });

    test('pushBranch forwards the credentials to the backend', async () => {
        const onAuth = () => ({username: 'u', password: 't'});
        await ops.pushBranch({vm: {}, remote: 'origin', branch: 'main', onAuth});
        expect(bg.push).toHaveBeenCalledWith(expect.objectContaining({onAuth}));
    });

    test('downloading a commit reports as an operation', async () => {
        const gate = deferred();
        bg.readSnapshotAtCommit.mockImplementation(async () => {
            await gate.promise;
            return new ArrayBuffer(8);
        });
        const running = ops.readSnapshotAtCommit('oid1');
        await Promise.resolve();
        expect(gitStore.getState().op.name).toBe('download-commit');
        gate.resolve();
        await running;
        expect(gitStore.getState().op).toBe(null);
    });

    // --- M2 additions ------------------------------------------------------

    test('the git window commits only what was staged (decision D2)', async () => {
        await ops.commit({vm: {}, message: 'feat: staged only'});
        expect(bg.commitProject).toHaveBeenCalledWith(expect.objectContaining({onlyStaged: true}));
    });

    test('surfaces without a staging area keep committing everything', async () => {
        await ops.commit({vm: {}, message: 'feat: all', all: true});
        expect(bg.commitProject).toHaveBeenCalledWith(expect.objectContaining({onlyStaged: false}));
    });

    test('staging does not re-serialize the project', async () => {
        bg.git.statusMatrix.mockImplementation(atResolve([['a.fractch', 1, 2, 1]]));
        await ops.stageFiles({vm: {}, filepaths: ['a.fractch']});
        // Ticking a checkbox must stay instant: the working tree is already
        // current, so the expensive rebuild must not run.
        expect(bg.getRepoChanges).not.toHaveBeenCalled();
        expect(bg.git.add).toHaveBeenCalledTimes(1);
        expect(gitStore.getState().changes).toHaveLength(1);
    });

    test('refreshing with a VM does rebuild the working tree', async () => {
        await ops.refreshRepository({vm: {}});
        expect(bg.getRepoChanges).toHaveBeenCalledTimes(1);
    });

    test('a deleted + untracked pair with identical bytes reads as one rename', async () => {
        bg.git.statusMatrix.mockImplementation(atResolve([
            ['Stage/assets/__1.svg', 1, 0, 1],
            ['Stage/assets/__2.svg', 0, 2, 0],
            ['Stage/main.fractch', 1, 2, 1]
        ]));
        await ops.refreshRepository({vm: {}});
        const changes = gitStore.getState().changes;
        const renamed = changes.find(change => change.description === 'renamed');
        expect(renamed).toBeTruthy();
        expect(renamed.oldPath).toBe('Stage/assets/__1.svg');
        expect(renamed.filepath).toBe('Stage/assets/__2.svg');
        expect(renamed.unstaged).toBe(true);
        // The pair is folded into one entry, so the real edit is not buried.
        expect(changes).toHaveLength(2);
        expect(changes.map(change => change.filepath)).toContain('Stage/main.fractch');
    });

    test('different bytes stay a real delete plus a real add', async () => {
        bg.git.readBlob.mockImplementation(atResolve({oid: 'old-blob'}));
        bg.git.hashBlob.mockImplementation(atResolve({oid: 'new-blob'}));
        bg.git.statusMatrix.mockImplementation(atResolve([
            ['Stage/assets/a.svg', 1, 0, 1],
            ['Stage/assets/b.svg', 0, 2, 0]
        ]));
        await ops.refreshRepository({vm: {}});
        const changes = gitStore.getState().changes;
        expect(changes.some(change => change.description === 'renamed')).toBe(false);
        expect(changes).toHaveLength(2);
    });

    test('staging a rename also stages the removal of the old path', async () => {
        bg.git.statusMatrix.mockImplementation(atResolve([
            ['Stage/assets/new.svg', 0, 2, 0],
            ['Stage/assets/old.svg', 1, 0, 1]
        ]));
        await ops.stageFiles({vm: {}, filepaths: ['Stage/assets/new.svg']});
        expect(bg.git.add).toHaveBeenCalledWith(expect.objectContaining({filepath: 'Stage/assets/new.svg'}));
        // Without this the old file stays tracked and the rename becomes a copy.
        expect(bg.git.remove).toHaveBeenCalledWith(expect.objectContaining({filepath: 'Stage/assets/old.svg'}));
    });
});

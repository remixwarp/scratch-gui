/**
 * M0 foundation tests for the mw-git rewrite: the single state store, its
 * selectors, the operation lock, the per-project registry and the typed errors.
 *
 * These modules are framework-free on purpose, so they can be exercised without
 * a VM, a filesystem or a running editor. The ops/workspace layers that do touch
 * those are covered by their own imports elsewhere.
 */

import gitStore, {createGitStore} from '../../../src/lib/git/state/store';
import * as selectors from '../../../src/lib/git/state/selectors';
import {createLock} from '../../../src/lib/git/ops/lock';
import registry from '../../../src/lib/git/workspace/registry';
import {GIT_ERROR_CODES, classifyGitError, toGitError, GitError} from '../../../src/lib/git/errors';
import translateGitError from '../../../src/lib/git/errors';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// registry/safe-storage read `window.localStorage`; jsdom's version is not
// guaranteed to exist, so provide a deterministic in-memory one.
const installStorage = () => {
    const memory = new Map();
    window.localStorage = {
        getItem: key => (memory.has(key) ? memory.get(key) : null),
        setItem: (key, value) => {
            memory.set(key, String(value));
        },
        removeItem: key => {
            memory.delete(key);
        },
        clear: () => memory.clear()
    };
};

describe('git store', () => {
    test('notifies subscribers on change and merges patches', () => {
        const store = createGitStore();
        let notifications = 0;
        store.subscribe(() => {
            notifications += 1;
        });

        store.setRepo({branch: 'dev'});
        expect(notifications).toBe(1);
        expect(store.getState().repo.branch).toBe('dev');
        // A patch merges into the existing branch instead of replacing it.
        expect(store.getState().repo.initialized).toBe(false);
    });

    test('skips a no-op update whose value is reference-identical', () => {
        const store = createGitStore();
        const changes = [];
        let notifications = 0;
        store.subscribe(() => {
            notifications += 1;
        });

        store.setState({changes});
        const afterFirst = notifications;
        store.setState({changes});
        expect(notifications).toBe(afterFirst);
    });

    test('unsubscribe stops notifications', () => {
        const store = createGitStore();
        let notifications = 0;
        const unsubscribe = store.subscribe(() => {
            notifications += 1;
        });
        unsubscribe();
        store.setRepo({branch: 'dev'});
        expect(notifications).toBe(0);
    });

    test('a broken subscriber cannot break the others', () => {
        const store = createGitStore();
        const seen = [];
        store.subscribe(() => {
            throw new Error('bad listener');
        });
        store.subscribe(() => seen.push('ok'));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        store.setRepo({branch: 'dev'});
        expect(seen).toEqual(['ok']);
        console.error.mockRestore();
    });

    test('op lifecycle tracks progress and cannot be resurrected', () => {
        const store = createGitStore();
        store.beginOp('push', 'Pushing…');
        expect(store.getState().op.progress).toBe(null);

        store.updateOp({progress: 0.5, message: 'half way'});
        expect(store.getState().op.progress).toBe(0.5);
        expect(store.getState().op.message).toBe('half way');

        store.endOp();
        store.updateOp({progress: 1});
        expect(store.getState().op).toBe(null);
    });

    test('beginOp clears the previous error', () => {
        const store = createGitStore();
        store.setError({code: 'AUTH', message: 'nope'});
        store.beginOp('pull', 'Pulling…');
        expect(store.getState().error).toBe(null);
    });
});

describe('git selectors', () => {
    const base = () => ({
        repo: {initialized: true, branch: 'main', detached: false},
        upstream: {remote: 'origin', branch: 'main', tracking: true, ahead: 2, behind: 0},
        changes: [{filepath: 'a.fractch'}],
        conflicts: [],
        remotes: [{name: 'origin', url: 'https://example.com/a.git'}],
        history: {branches: ['main', 'dev'], nodes: [], remoteBranches: [], branchLogs: []},
        op: null,
        error: null,
        notice: null
    });

    test('syncStatus classifies each tracking state', () => {
        expect(selectors.syncStatus(base())).toBe('ahead');
        expect(selectors.syncStatus({
            ...base(),
            upstream: {...base().upstream, behind: 3}
        })).toBe('diverged');
        expect(selectors.syncStatus({
            ...base(),
            upstream: {...base().upstream, tracking: false}
        })).toBe('untracked');
        expect(selectors.syncStatus({...base(), repo: {initialized: false}})).toBe('uninitialized');
    });

    test('canCommit requires changes and no unresolved conflicts', () => {
        expect(selectors.canCommit(base())).toBe(true);
        expect(selectors.canCommit({...base(), conflicts: [{filepath: 'x.fractch'}]})).toBe(false);
        expect(selectors.canCommit({...base(), changes: []})).toBe(false);
    });

    test('any write is blocked while an operation runs', () => {
        const busy = {...base(), op: {name: 'push'}};
        expect(selectors.anyActionBlocked(busy)).toBe(true);
        expect(selectors.canPush(busy)).toBe(false);
        expect(selectors.canPull(busy)).toBe(false);
        expect(selectors.canFetch(busy)).toBe(false);
    });

    test('canMerge needs a second branch', () => {
        expect(selectors.canMerge(base())).toBe(true);
        expect(selectors.canMerge({...base(), history: {branches: ['main']}})).toBe(false);
    });

    test('defaultRemoteName prefers the tracked remote', () => {
        expect(selectors.defaultRemoteName({
            remotes: [{name: 'backup'}, {name: 'origin'}],
            upstream: {remote: 'origin'}
        })).toBe('origin');
        expect(selectors.defaultRemoteName({remotes: [{name: 'backup'}], upstream: {}})).toBe('backup');
        expect(selectors.defaultRemoteName({remotes: [], upstream: {}})).toBe(null);
    });
});

describe('git operation lock', () => {
    test('serializes overlapping tasks in submission order', async () => {
        const lock = createLock();
        const order = [];
        const first = lock.run('first', async () => {
            order.push('first-start');
            await sleep(20);
            order.push('first-end');
            return 1;
        });
        const second = lock.run('second', async () => {
            order.push('second-start');
            order.push('second-end');
            return 2;
        });

        await expect(first).resolves.toBe(1);
        await expect(second).resolves.toBe(2);
        expect(order).toEqual(['first-start', 'first-end', 'second-start', 'second-end']);
    });

    test('a failure rejects its own task but not the queue', async () => {
        const lock = createLock();
        // jest 21 lacks `rejects.toThrow`, so capture the rejection manually.
        let failure = null;
        try {
            await lock.run('boom', () => {
                throw new Error('boom');
            });
        } catch (e) {
            failure = e;
        }
        expect(failure).toBeInstanceOf(Error);
        expect(failure.message).toBe('boom');
        await expect(lock.run('after', async () => 'ok')).resolves.toBe('ok');
    });

    test('reports busy/pending and drains', async () => {
        const lock = createLock();
        const states = [];
        const tracked = createLock({onChange: state => states.push(state.pending)});
        const work = tracked.run('work', async () => {
            await sleep(10);
            return 'done';
        });
        expect(tracked.isBusy() || tracked.pending() > 0).toBe(true);
        await work;
        await tracked.drain();
        expect(tracked.isBusy()).toBe(false);
        expect(tracked.pending()).toBe(0);
        expect(states.length).toBeGreaterThan(0);
        expect(lock.isBusy()).toBe(false);
    });

    test('rejects a non-function task', async () => {
        const lock = createLock();
        await expect(lock.run('bad', null)).rejects.toBeInstanceOf(TypeError);
    });
});

describe('git registry', () => {
    beforeEach(() => {
        installStorage();
        registry.readRegistry().entries &&
            Object.keys(registry.readRegistry().entries)
                .forEach(id => registry.removeEntry(id));
    });

    test('stores an entry and strips credentials from remote urls', () => {
        registry.upsertEntry('p1', {
            defaultBranch: 'main',
            remotes: [{name: 'origin', url: 'https://user:tok3n@github.com/a/b.git'}],
            author: {name: 'N', email: 'n@example.com'}
        });
        const entry = registry.getEntry('p1');
        expect(entry).toBeTruthy();
        expect(entry.remotes[0].url).toBe('https://github.com/a/b.git');
        expect(entry.defaultBranch).toBe('main');
        expect(entry.author.email).toBe('n@example.com');
    });

    test('exported configuration never carries a token', () => {
        registry.upsertEntry('p1', {
            remotes: [{name: 'origin', url: 'https://user:tok3n@github.com/a/b.git'}]
        });
        const exported = registry.exportConfig({projectId: 'p1'});
        expect(exported.kind).toBe('remixwarp-git-config');
        expect(JSON.stringify(exported)).not.toContain('tok3n');
        expect(exported.projects).toHaveLength(1);
    });

    test('imports a configuration and locates projects by remote', () => {
        registry.upsertEntry('p1', {remotes: [{name: 'origin', url: 'https://github.com/a/b.git'}]});
        const exported = registry.exportConfig({projectId: 'p1'});
        const result = registry.importConfig({
            ...exported,
            projects: [{...exported.projects[0], projectId: 'p2'}]
        });
        expect(result.imported).toBe(1);
        expect(registry.getEntry('p2')).toBeTruthy();
        expect(registry.findByUrl('https://github.com/a/b.git')).toHaveLength(2);
    });

    test('rejects a malformed configuration', () => {
        expect(() => registry.importConfig({nope: true})).toThrow();
    });

    test('removeEntry deletes only the requested project', () => {
        registry.upsertEntry('p1', {});
        registry.upsertEntry('p2', {});
        expect(registry.removeEntry('p1')).toBe(true);
        expect(registry.getEntry('p1')).toBe(null);
        expect(registry.getEntry('p2')).toBeTruthy();
    });

    test('survives a corrupted registry payload', () => {
        window.localStorage.setItem('mw:git-registry', '{not json');
        expect(registry.listEntries()).toEqual([]);
    });
});

describe('typed git errors', () => {
    test('classifies the known prose failures', () => {
        expect(classifyGitError('Repository not initialized')).toBe(GIT_ERROR_CODES.NOT_INITIALIZED);
        expect(classifyGitError('No changes to commit')).toBe(GIT_ERROR_CODES.NO_CHANGES);
        expect(classifyGitError('Diverged branches: ...')).toBe(GIT_ERROR_CODES.DIVERGED);
        expect(classifyGitError('No upstream branch origin/main on the remote.')).toBe(GIT_ERROR_CODES.NO_UPSTREAM);
        expect(classifyGitError('Failed to fetch: NetworkError')).toBe(GIT_ERROR_CODES.NETWORK);
        expect(classifyGitError('401 Unauthorized')).toBe(GIT_ERROR_CODES.AUTH);
        expect(classifyGitError('something else entirely')).toBe(GIT_ERROR_CODES.UNKNOWN);
    });

    test('toGitError normalises foreign errors and preserves typed ones', () => {
        const wrapped = toGitError(new Error('No changes to commit'));
        expect(wrapped).toBeInstanceOf(GitError);
        expect(wrapped.code).toBe(GIT_ERROR_CODES.NO_CHANGES);
        expect(wrapped.raw).toBe('No changes to commit');

        const passedThrough = toGitError(new GitError(GIT_ERROR_CODES.AUTH, 'localized'));
        expect(passedThrough.code).toBe(GIT_ERROR_CODES.AUTH);
        expect(passedThrough.message).toBe('localized');
    });

    test('a GitError carries raw detail and an actionable hint', () => {
        const error = new GitError(GIT_ERROR_CODES.NON_FAST_FORWARD, 'localized', {
            raw: 'rejected (non-fast-forward)',
            hint: 'pull first'
        });
        expect(error.name).toBe('GitError');
        expect(error.raw).toBe('rejected (non-fast-forward)');
        expect(error.hint).toBe('pull first');
    });

    test('localizes every failure prose the UI can surface', () => {
        expect(translateGitError('Repository not initialized')).toBe('尚未初始化 Git 仓库');
        expect(translateGitError('No changes to commit')).toBe('没有可提交的更改（工作区与上次提交一致）');
        expect(translateGitError('Invalid git configuration file')).toBe('Git 配置文件格式不正确或已损坏');
        expect(translateGitError('No merge in progress')).toBe('当前没有进行中的合并');
        // Unrecognized text must pass through untouched rather than vanish.
        expect(translateGitError('something raw')).toBe('something raw');
    });
});

describe('default store instance', () => {
    test('is shared so both surfaces cannot diverge', () => {
        const before = gitStore.getState();
        gitStore.setNotice({kind: 'test', message: null, at: Date.now()});
        expect(gitStore.getState()).not.toBe(before);
        expect(gitStore.getState().notice.kind).toBe('test');
        gitStore.reset();
        expect(gitStore.getState().notice).toBe(null);
    });
});

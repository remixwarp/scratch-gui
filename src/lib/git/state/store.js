// Single source of truth for the editor's git state.
//
// Before this module the same repository was described twice: the git window
// kept a 20-field `state` object and the menu bar kept its own status flags,
// so the two could disagree (and did). Everything derived from the repository
// now lives here, and both surfaces subscribe to it.
//
// Framework-agnostic on purpose: React components wrap it with a tiny adapter,
// nothing in lib/git should import React.

// Repository identity + where its working tree lives.
const initialRepo = () => ({
    initialized: false,
    projectId: null,
    head: null,
    branch: null,
    detached: false
});

// Tracking relationship of the checked-out branch and how far it has drifted
// from its upstream. `ahead` = local commits not on the remote, `behind` = the
// other way round. Both 0 means in sync; null means "not computed yet".
const initialUpstream = () => ({
    remote: null,
    branch: null,
    tracking: false,
    ahead: null,
    behind: null
});

export const createInitialState = () => ({
    repo: initialRepo(),
    upstream: initialUpstream(),
    // Light status summary — cheap to read (one `git.log` + `listBranches`) and
    // needed by every surface: the git window's History/undo guards and the
    // menu bar's "is there anything to commit" check. The expensive graph walk
    // stays in `history`.
    commits: [],
    branches: [],
    // Working-tree changes, already classified by browser-git (modified /
    // untracked / deleted / …).
    changes: [],
    // Merge conflicts currently awaiting resolution; empty when clean.
    conflicts: [],
    remotes: [],
    history: {
        nodes: [],
        branches: [],
        remoteBranches: [],
        branchLogs: [],
        layout: null
    },
    // In-flight long operation, or null when idle. Shape:
    // {name, message, progress(0..1|null), startedAt}
    op: null,
    // Last failure: {code, message, raw}. Cleared when a new operation starts.
    error: null,
    // Transient success feedback: {kind, message, at}. Consumers expire it.
    notice: null
});

// Minimal observable store: subscribe/getState/setState with shallow change
// detection, so a no-op update never re-renders subscribers.
export const createGitStore = () => {
    let state = createInitialState();
    const listeners = new Set();

    const getState = () => state;

    const subscribe = listener => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };

    const notify = () => {
        // Snapshot first: a listener may unsubscribe during notification.
        for (const listener of Array.from(listeners)) {
            try {
                listener(state);
            } catch (e) {
                // A broken subscriber must not break the others.
                console.error('git store listener failed', e);
            }
        }
    };

    // Accepts either a patch object or an updater. Returns the new state
    // (unchanged reference when nothing actually differs).
    const setState = patch => {
        const next = typeof patch === 'function' ? patch(state) : patch;
        if (!next) return state;
        let changed = false;
        const merged = Object.assign({}, state);
        for (const key of Object.keys(next)) {
            if (!Object.is(merged[key], next[key])) {
                merged[key] = next[key];
                changed = true;
            }
        }
        if (!changed) return state;
        state = merged;
        notify();
        return state;
    };

    const reset = () => {
        state = createInitialState();
        notify();
    };

    // --- Domain mutators -----------------------------------------------------
    // Small, intention-revealing updates so callers never hand-roll patches.

    const setRepo = patch => setState(prev => ({repo: Object.assign({}, prev.repo, patch)}));

    const setUpstream = patch => setState(prev => ({upstream: Object.assign({}, prev.upstream, patch)}));

    const setChanges = changes => setState({changes: Array.isArray(changes) ? changes : []});

    const setConflicts = conflicts => setState({conflicts: Array.isArray(conflicts) ? conflicts : []});

    const setRemotes = remotes => setState({remotes: Array.isArray(remotes) ? remotes : []});

    // One notify for both summary fields (they always change together).
    const setStatus = ({commits, branches} = {}) => setState({
        commits: Array.isArray(commits) ? commits : [],
        branches: Array.isArray(branches) ? branches : []
    });

    const setHistory = patch => setState(prev => ({history: Object.assign({}, prev.history, patch)}));

    const beginOp = (name, message) => setState({
        op: {
            name: name || null,
            message: message || null,
            progress: null,
            startedAt: Date.now()
        },
        error: null
    });

    // Patch the running operation's message/progress; ignored when idle so a
    // late progress callback from a finished op cannot resurrect the spinner.
    const updateOp = patch => setState(prev => {
        if (!prev.op) return null;
        return {op: Object.assign({}, prev.op, patch)};
    });

    const endOp = () => setState({op: null});

    const setError = error => setState({error: error || null});

    const clearError = () => setState(prev => (prev.error ? {error: null} : null));

    const setNotice = notice => setState({notice: notice || null});

    return {
        getState,
        setState,
        subscribe,
        reset,
        setRepo,
        setUpstream,
        setChanges,
        setConflicts,
        setRemotes,
        setStatus,
        setHistory,
        beginOp,
        updateOp,
        endOp,
        setError,
        clearError,
        setNotice
    };
};

// Application-wide instance. The git window and the menu bar share this, which
// is what makes their states impossible to diverge.
const gitStore = createGitStore();

export default gitStore;

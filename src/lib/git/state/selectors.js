// Derived read-only views over the git store.
//
// Keeping these here (instead of inline in components) guarantees the window and
// the menu bar enable/disable the same actions for the same reasons — the most
// visible symptom of the old duplicated implementations was buttons that were
// enabled in one surface and disabled in the other.

export const isInitialized = state => Boolean(state && state.repo && state.repo.initialized);

export const isBusy = state => Boolean(state && state.op);

export const isDetached = state => Boolean(state && state.repo && state.repo.detached);

export const hasChanges = state => Boolean(state && state.changes && state.changes.length > 0);

export const hasConflicts = state => Boolean(state && state.conflicts && state.conflicts.length > 0);

export const hasRemotes = state => Boolean(state && state.remotes && state.remotes.length > 0);

export const currentBranch = state => (state && state.repo ? state.repo.branch : null);

// Any long operation blocks every other mutation: the repository is a single
// shared resource, so the UI must not offer a second write while one runs.
export const anyActionBlocked = state => isBusy(state) || !isInitialized(state);

export const canInit = state => Boolean(state) && !isInitialized(state) && !isBusy(state);

// Committing needs staged/modified content; committing on top of unresolved
// conflicts would record the marker files, so it stays blocked until they clear.
export const canCommit = state =>
    isInitialized(state) && hasChanges(state) && !hasConflicts(state) && !isBusy(state);

export const canCheckout = state => isInitialized(state) && !isBusy(state) && !hasConflicts(state);

export const canPush = state =>
    isInitialized(state) && Boolean(currentBranch(state)) && hasRemotes(state) && !isBusy(state);

// Pulling needs a local branch to advance and somewhere to pull from.
export const canPull = state =>
    isInitialized(state) && Boolean(currentBranch(state)) && hasRemotes(state) && !isBusy(state);

export const canFetch = state => isInitialized(state) && hasRemotes(state) && !isBusy(state);

export const canMerge = state =>
    isInitialized(state) &&
    Boolean(currentBranch(state)) &&
    (state.history.branches || []).length > 1 &&
    !isBusy(state);

export const defaultRemoteName = state => {
    const remotes = (state && state.remotes) || [];
    if (remotes.length === 0) return null;
    // Prefer the tracked remote, fall back to the first configured one.
    const tracked = state.upstream && state.upstream.remote;
    if (tracked && remotes.some(r => r.name === tracked)) return tracked;
    return remotes[0].name;
};

// Whether the checked-out branch carries local commits the upstream lacks.
// Returns null when the comparison was never computed (no commit yet).
export const aheadCount = state => (state && state.upstream ? state.upstream.ahead : null);

export const behindCount = state => (state && state.upstream ? state.upstream.behind : null);

// Coarse sync classification, mirroring what a git client shows next to the
// branch name.
export const syncStatus = state => {
    if (!isInitialized(state)) return 'uninitialized';
    if (!state.upstream || !state.upstream.tracking) return 'untracked';
    const ahead = aheadCount(state);
    const behind = behindCount(state);
    if (ahead === null || behind === null) return 'unknown';
    if (ahead > 0 && behind > 0) return 'diverged';
    if (ahead > 0) return 'ahead';
    if (behind > 0) return 'behind';
    return 'in-sync';
};

// Human-meaningful phase for the transient notice bar.
export const noticeKind = state => (state.notice && state.notice.kind) || null;

export const graphLayout = state => (state && state.history ? state.history.layout : null);

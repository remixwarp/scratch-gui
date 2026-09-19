// Which way a pull has to move the checked-out branch.
//
// This module exists because of a real, reproducible bug (probe:
// `temp/probe-pull.cjs`, now a unit test): `pull()` used to name its two
// reachability checks after the *remote* ("remoteReachableFromHead") while
// passing them to `git.isDescendent({oid, ancestor})`, whose argument order
// asks the opposite question ("is `oid` a descendant of `ancestor`?"). The
// consequences were exactly backwards:
//
//   remote ahead (the case `git pull` exists for) -> reported "nothing to pull"
//   local ahead                                  -> ran a no-op merge and then
//                                                   rebuilt the open project
//
// Naming the question after what is actually being asked — "does the local tip
// *contain* the remote tip?" — makes the inversion very hard to repeat, and the
// decision is pure so it can be tested without a repository.

// Verdicts. `up-to-date` and `local-ahead` both mean "the pull changes
// nothing"; only `fast-forward` moves the branch.
export const PULL_VERDICTS = Object.freeze({
    UP_TO_DATE: 'up-to-date',
    LOCAL_AHEAD: 'local-ahead',
    FAST_FORWARD: 'fast-forward',
    DIVERGED: 'diverged'
});

// `contains(oid, ancestor)` must resolve true when `ancestor` is reachable from
// `oid` — i.e. isomorphic-git's `git.isDescendent({oid, ancestor})`.
export const classifyPull = async ({headOid, remoteOid, contains} = {}) => {
    if (!headOid || !remoteOid) {
        // Unborn branch or unpushed remote branch: there is no common tip to
        // fast-forward, the caller reports it as its own error.
        return PULL_VERDICTS.DIVERGED;
    }
    if (headOid === remoteOid) {
        return PULL_VERDICTS.UP_TO_DATE;
    }
    if (typeof contains !== 'function') {
        return PULL_VERDICTS.DIVERGED;
    }
    // Local tip already includes the remote tip → nothing to fetch into it.
    if (await contains(headOid, remoteOid)) {
        return PULL_VERDICTS.LOCAL_AHEAD;
    }
    // Remote tip includes the local tip → a plain fast-forward.
    if (await contains(remoteOid, headOid)) {
        return PULL_VERDICTS.FAST_FORWARD;
    }
    return PULL_VERDICTS.DIVERGED;
};

export default classifyPull;

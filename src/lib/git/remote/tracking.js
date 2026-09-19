// Ahead/behind tracking for a branch against its remote-tracking ref.
//
// "Normal local development" means the editor can answer two questions at a
// glance: does the remote have commits I do not, and do I have commits the
// remote does not. The old module had no notion of either — every local commit
// carried a vague "(detached)" risk and the user had to diff by eye.
//
// Counts are derived from a depth-bounded log walk rather than a full topology
// traversal: cheap enough to run on every refresh, and exact for any history up
// to the depth bound (DEFAULT_DEPTH commits per side).

import {git, getFs, REPO_DIR} from '../browser-git.js';

export const DEFAULT_TRACKING_DEPTH = 200;

// Returns the commit oids reachable from `ref`, or null when the ref does not
// exist (unborn branch, never-pushed remote branch).
const logOids = async ({fs, dir, ref, depth}) => {
    try {
        const entries = await git.log({fs, dir, ref, depth});
        return Array.isArray(entries) ? entries.map(entry => entry.oid) : [];
    } catch (e) {
        return null;
    }
};

// {tracking, ahead, behind}. `tracking` is false (with null counts) whenever the
// remote-tracking ref is absent — i.e. the branch has never been pushed.
//
// `branch` is the *local* branch whose tip we count from; `remoteBranch`
// defaults to it but is passed separately because a branch may be configured to
// track a differently named remote branch (`branch.<name>.merge`).
export const computeTracking = async ({remote, branch, remoteBranch, depth = DEFAULT_TRACKING_DEPTH} = {}) => {
    if (!remote || !branch) {
        return {tracking: false, ahead: null, behind: null, remote: null, branch: null};
    }
    const fs = getFs();
    const localOids = await logOids({fs, dir: REPO_DIR, ref: branch, depth});
    if (!localOids) {
        return {tracking: false, ahead: null, behind: null, remote, branch};
    }
    const remoteOids = await logOids({
        fs,
        dir: REPO_DIR,
        ref: `refs/remotes/${remote}/${remoteBranch || branch}`,
        depth
    });
    if (!remoteOids) {
        return {tracking: false, ahead: null, behind: null, remote, branch};
    }
    const remoteSet = new Set(remoteOids);
    const localSet = new Set(localOids);
    let ahead = 0;
    for (const oid of localOids) {
        if (!remoteSet.has(oid)) ahead += 1;
    }
    let behind = 0;
    for (const oid of remoteOids) {
        if (!localSet.has(oid)) behind += 1;
    }
    return {tracking: true, ahead, behind, remote, branch};
};

export default computeTracking;

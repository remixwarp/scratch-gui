// The only place in lib/git that touches the VM.
//
// Everything above this line works on the repository (fractch text tree in
// OPFS); everything below is the editor's project (VM + sb3). Keeping the
// translation in one module means the "project ↔ working tree" contract has a
// single implementation — the old code had it scattered across the god module,
// the menu bar and the sb3 uploader, which is how they drifted apart.
//
// Decision D4: loading a project without an embedded repository must NOT wipe
// the current one anymore. `importRepo` therefore takes an explicit policy and
// defaults to the non-destructive one; the legacy "switch workspace" behaviour
// stays reachable via `importRepoLegacy` until the uploader is rewired in M1.

import {
    prepareFractchWorkspace,
    applyFractchWorkspace,
    restoreProjectFromCurrentRef,
    checkoutBranchAndRestore,
    checkoutCommitAndRestore,
    embedRepoIntoSb3Blob,
    importRepoFromSb3,
    repoExists,
    initRepo,
    repoHasFractch
} from '../browser-git.js';
import RestorePointAPI from '../../api/restore-points.js';
import JSZip from 'jszip';
import {zipHasEntryUnder} from '../zip-probe.js';
import registry from './registry.js';

export const IMPORT_POLICIES = Object.freeze({
    // Import when the sb3 carries one, otherwise leave the current repo alone
    // and report the missing association (D4).
    PRESERVE: 'preserve',
    // Legacy: no embedded repo → clear the stale one.
    SWITCH_WORKSPACE: 'switch-workspace'
});

export const createRestorePoint = async (vm, label) => {
    if (!vm || typeof RestorePointAPI.createSafetyRestorePoint !== 'function') return null;
    try {
        return await RestorePointAPI.createSafetyRestorePoint(vm, label);
    } catch (e) {
        // A restore point is a safety net, not a prerequisite: never block the
        // user's action because the net could not be raised.
        console.warn('Failed to create git restore point', e);
        return null;
    }
};

// Bind the single OPFS repository to a project. Idempotent: an existing
// repository is kept and simply re-associated; a missing one is created so the
// caller never has to branch on "does a repo exist".
export const bindProject = async ({vm, projectId, defaultBranch = 'main', author} = {}) => {
    const existed = await repoExists();
    if (!existed) {
        await initRepo({defaultBranch, vm});
    }
    if (projectId) {
        registry.upsertEntry(projectId, {defaultBranch, author});
    }
    const entry = projectId ? registry.getEntry(projectId) : null;
    return {existed, entry};
};

// Mirror the VM project into the fractch working tree. Returns the flat list of
// worktree files so callers can render the fractch workspace immediately.
export const prepareWorkspace = vm => {
    if (!vm) throw new Error('VM is required');
    return prepareFractchWorkspace(vm);
};

// Rebuild the VM project from the working tree (after a checkout/merge).
export const applyWorkspace = vm => {
    if (!vm) throw new Error('VM is required');
    return applyFractchWorkspace(vm);
};

export const restoreToCurrentRef = vm => {
    if (!vm) throw new Error('VM is required');
    return restoreProjectFromCurrentRef(vm);
};

export const checkoutBranchRef = ({vm, ref}) => {
    if (!vm) throw new Error('VM is required');
    return checkoutBranchAndRestore({vm, ref});
};

export const checkoutCommitRef = ({vm, oid}) => {
    if (!vm) throw new Error('VM is required');
    return checkoutCommitAndRestore({vm, oid});
};

export const hasFractch = () => repoHasFractch();

// Write the current repository into the sb3 blob so history travels with the
// file. No-op (returns the input) when there is nothing to embed.
export const embedRepo = blob => {
    if (!blob) return Promise.resolve(blob);
    return embedRepoIntoSb3Blob(blob);
};

// Directory `embedRepoIntoSb3Blob` (browser-git.js, which has its own
// GIT_EMBED_DIR) writes an embedded repository under. Duplicated because that
// module does not export the constant.
const EMBEDDED_REPO_PREFIX = '.remixwarp-git/';

// Peek inside an sb3 for `.remixwarp-git/` entries without touching the repo.
//
// This runs before the import on every "open from computer", so it answers from
// the ZIP central directory (see ../zip-probe.js) rather than letting JSZip
// build an entry object for every asset in the project -- ~110 ms on a 33 MB
// project, against ~0.05 ms for the directory scan. JSZip remains the fallback
// for anything the cheap scan declines to decide.
export const hasEmbeddedRepo = async input => {
    if (!input) return false;
    const scanned = zipHasEntryUnder(input, EMBEDDED_REPO_PREFIX);
    if (scanned !== null) return scanned;
    try {
        const zip = await JSZip.loadAsync(input);
        return Object.keys(zip.files).some(
            path => path.startsWith(EMBEDDED_REPO_PREFIX) && !zip.files[path].dir
        );
    } catch (e) {
        return false;
    }
};

// Restore an embedded repository from an sb3.
//   {imported:true}                    — an embedded repo was found and applied
//   {imported:false, reason:'absent'}  — nothing embedded; current repo kept
export const importRepo = async ({input, projectId, policy = IMPORT_POLICIES.PRESERVE} = {}) => {
    if (policy === IMPORT_POLICIES.SWITCH_WORKSPACE) {
        const imported = await importRepoFromSb3(input);
        return {imported, policy};
    }
    // Preserve: probe for an embedded repo without mutating the filesystem.
    const embedded = await hasEmbeddedRepo(input);
    if (!embedded) {
        return {imported: false, policy, reason: 'absent', projectId: projectId || null};
    }
    const imported = await importRepoFromSb3(input);
    return {imported, policy, reason: imported ? 'imported' : 'failed', projectId: projectId || null};
};

// Legacy entry point, kept so the sb3 uploader keeps its previous behaviour
// until M1 rewires it onto the policy-aware `importRepo`.
export const importRepoLegacy = input => importRepoFromSb3(input);

export default {
    IMPORT_POLICIES,
    createRestorePoint,
    bindProject,
    prepareWorkspace,
    applyWorkspace,
    restoreToCurrentRef,
    checkoutBranchRef,
    checkoutCommitRef,
    hasFractch,
    embedRepo,
    importRepo,
    importRepoLegacy,
    hasEmbeddedRepo
};

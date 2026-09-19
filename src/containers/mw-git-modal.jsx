import PropTypes from 'prop-types';
import {getItem as getStorageItem} from '../lib/utils/safe-storage.js';
import React from 'react';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import VM from 'scratch-vm';

import GitModalComponent from '../components/mw-git-modal/git-modal.jsx';
import {closeGitModal} from '../reducers/modals.js';

import downloadBlob from '../lib/utils/download-blob.js';
import {openFractchMode} from '../lib/git/fractch-mode.js';

// Every repository mutation goes through the shared ops layer: it owns the
// single-flight lock (one OPFS repository, two surfaces that used to be able to
// write it at once), the typed errors and the post-mutation refreshes. See
// lib/git/ops/index.js.
import gitOps from '../lib/git/ops/index.js';
import translateGitError, {GIT_ERROR_CODES} from '../lib/git/errors.js';
import buildHttpAuth from '../lib/git/auth.js';
import {getDefaultAuthor, setDefaultAuthor, getFs, REPO_DIR} from '../lib/git/browser-git.js';
import buildCommitGraphLayout from '../lib/git/graph-layout.js';
import {setDefaultBranch as persistDefaultBranch} from '../lib/git/config.js';
import {
    getFileContentAtCommit,
    getChangedFilesBetweenCommits,
    getCommitParents,
    computeLineDiff
} from '../lib/git/git-diff.js';

const TOKEN_KEY = 'mw:git-token';
const DEFAULT_BRANCH_KEY = 'mw:git-default-branch';

const messages = defineMessages({
    refreshing: {
        defaultMessage: 'Refreshing…',
        description: 'Busy message while refreshing repo status',
        id: 'mw.git.busy.refreshing'
    },
    initializing: {
        defaultMessage: 'Initializing repository…',
        description: 'Busy message while initializing the repository',
        id: 'mw.git.busy.initializing'
    },
    cloning: {
        defaultMessage: 'Cloning…',
        description: 'Busy message while cloning a repository',
        id: 'mw.git.busy.cloning'
    },
    committing: {
        defaultMessage: 'Committing…',
        description: 'Busy message while committing',
        id: 'mw.git.busy.committing'
    },
    undoing: {
        defaultMessage: 'Undoing commit…',
        description: 'Busy message while undoing a commit',
        id: 'mw.git.busy.undoing'
    },
    creatingBranch: {
        defaultMessage: 'Creating branch…',
        description: 'Busy message while creating a branch',
        id: 'mw.git.busy.creatingBranch'
    },
    checkingOut: {
        defaultMessage: 'Checking out branch…',
        description: 'Busy message while checking out a branch',
        id: 'mw.git.busy.checkingOut'
    },
    restoring: {
        defaultMessage: 'Restoring commit…',
        description: 'Busy message while restoring a commit',
        id: 'mw.git.busy.restoring'
    },
    preparingDownload: {
        defaultMessage: 'Preparing download…',
        description: 'Busy message while preparing a commit download',
        id: 'mw.git.busy.preparingDownload'
    },
    deletingRepo: {
        defaultMessage: 'Deleting repository…',
        description: 'Busy message while deleting the repository',
        id: 'mw.git.busy.deletingRepo'
    },
    deletingBranch: {
        defaultMessage: 'Deleting branch…',
        description: 'Busy message while deleting a branch',
        id: 'mw.git.busy.deletingBranch'
    },
    addingRemote: {
        defaultMessage: 'Adding remote…',
        description: 'Busy message while adding a remote',
        id: 'mw.git.busy.addingRemote'
    },
    removingRemote: {
        defaultMessage: 'Removing remote…',
        description: 'Busy message while removing a remote',
        id: 'mw.git.busy.removingRemote'
    },
    pushing: {
        defaultMessage: 'Pushing {branch} to {remote}…',
        description: 'Busy message while pushing a branch to a remote',
        id: 'mw.git.busy.pushing'
    },
    pulling: {
        defaultMessage: 'Pulling…',
        description: 'Busy message while pulling from a remote',
        id: 'mw.git.busy.pulling'
    },
    fetching: {
        defaultMessage: 'Fetching from the remote…',
        description: 'Busy message while fetching from a remote',
        id: 'mw.git.busy.fetching'
    },
    savingReadme: {
        defaultMessage: 'Saving README…',
        description: 'Busy message while saving the README',
        id: 'mw.git.busy.savingReadme'
    },
    analyzingMerge: {
        defaultMessage: 'Analyzing merge…',
        description: 'Busy message while analyzing a merge',
        id: 'mw.git.busy.analyzingMerge'
    },
    preparingMerge: {
        defaultMessage: 'Preparing merge…',
        description: 'Busy message while preparing an editor merge',
        id: 'mw.git.busy.preparingMerge'
    },
    merging: {
        defaultMessage: 'Merging…',
        description: 'Busy message while applying a merge',
        id: 'mw.git.busy.merging'
    },
    pullReplaceConfirm: {
        defaultMessage: 'Pulling will replace your open project with the repository version. Continue?',
        description: 'Confirmation before git pull replaces the open project',
        id: 'mw.git.confirm.pullReplace'
    },
    cloneUrlRequired: {
        defaultMessage: 'Enter a git URL to clone',
        description: 'Error when cloning with an empty URL',
        id: 'mw.git.error.cloneUrl'
    },
    notFractch: {
        defaultMessage: 'That repository is not a fractch project (no .fractch files found).',
        description: 'Error when cloning a non-fractch repository',
        id: 'mw.git.error.notFractch'
    },
    commitMessageRequired: {
        defaultMessage: 'Commit message is required',
        description: 'Error when committing with an empty message',
        id: 'mw.git.error.commitMessageRequired'
    },
    detachedCommitConfirm: {
        // eslint-disable-next-line max-len
        defaultMessage: 'You are on a detached HEAD (not on any branch). This commit will not show up in any branch and cannot be pushed. Create or switch to a branch first (Branches tab). Commit anyway?',
        description: 'Confirm before committing while HEAD is detached',
        id: 'mw.git.confirm.detachedCommit'
    },
    branchNameRequired: {
        defaultMessage: 'Branch name is required',
        description: 'Error when creating a branch with an empty name',
        id: 'mw.git.error.branchNameRequired'
    },
    noProjectData: {
        defaultMessage: 'No project data found at this commit',
        description: 'Error when a commit has no downloadable project data',
        id: 'mw.git.error.noProjectData'
    },
    remoteRequired: {
        defaultMessage: 'Remote name and URL are required',
        description: 'Error when adding a remote without a name or URL',
        id: 'mw.git.error.remoteRequired'
    },
    selectRemote: {
        defaultMessage: 'Select a remote to push to',
        description: 'Error when pushing with no remote selected',
        id: 'mw.git.error.selectRemote'
    },
    selectBranch: {
        defaultMessage: 'Select a branch to push',
        description: 'Error when pushing with no branch selected',
        id: 'mw.git.error.selectBranch'
    },
    // Push and pull both need a checked-out branch to move. When HEAD holds a
    // raw commit instead, "select a branch" is misleading — there is none to
    // select from the push form, the user has to check one out first.
    detachedNoBranch: {
        defaultMessage: 'HEAD is detached (not on any branch), so there is nothing to push or pull into. ' +
            'Switch to a branch in the Branches view first.',
        description: 'Error when push/pull is attempted on a detached HEAD',
        id: 'mw.git.error.detachedNoBranch'
    },
    selectDifferentBranch: {
        defaultMessage: 'Select a different branch to merge.',
        description: 'Error when merging a branch into itself',
        id: 'mw.git.error.selectDifferentBranch'
    },
    binaryConflicts: {
        defaultMessage: 'Only binary files conflict here; pick a side for each file instead.',
        description: 'Message when a merge only has binary conflicts',
        id: 'mw.git.error.binaryConflicts'
    },
    configInvalid: {
        defaultMessage: 'That file is not a valid repository configuration.',
        description: 'Error when an imported git config JSON is malformed',
        id: 'mw.git.error.configInvalid'
    },
    noticePullNoUpdate: {
        defaultMessage: 'Already up to date.',
        description: 'Success message when a pull brought nothing new',
        id: 'mw.git.notice.pullNoUpdate'
    },
    noticePullDone: {
        defaultMessage: 'Pulled the latest changes.',
        description: 'Success message after a pull that updated the project',
        id: 'mw.git.notice.pullDone'
    },
    noticeFetchDone: {
        defaultMessage: 'Fetched from the remote.',
        description: 'Success message after a fetch',
        id: 'mw.git.notice.fetchDone'
    },
    noticeConfigExported: {
        defaultMessage: 'Repository configuration exported.',
        description: 'Success message after exporting the git repo config',
        id: 'mw.git.notice.configExported'
    },
    noticeConfigImported: {
        defaultMessage: 'Repository configuration imported.',
        description: 'Success message after importing the git repo config',
        id: 'mw.git.notice.configImported'
    },
    restoreDetachConfirm: {
        defaultMessage: 'Restoring this commit checks it out directly (detached HEAD): ' +
            'it will not belong to any branch, so you cannot push it and the History ' +
            'view will treat your next commit as detached — until you switch back to a branch. Continue?',
        description: 'Confirmation before checking out a commit (detaches HEAD)',
        id: 'mw.git.confirm.restoreDetach'
    },
    deleteRepoConfirm: {
        // eslint-disable-next-line max-len
        defaultMessage: 'Delete this repository? Every commit, branch and remote stored in this browser is removed for good — this cannot be undone. Your open project is not affected. Continue?',
        description: 'Confirmation before deleting the local git repository',
        id: 'mw.git.confirm.deleteRepo'
    }
});

const readLocal = (key, fallback) => {
    try {
        const value = getStorageItem(key);
        return value === null ? fallback : value;
    } catch (e) {
        return fallback;
    }
};

const writeLocal = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // ignore
    }
};

const isDiffable = filepath => /\.(fractch|svg|json|txt|md)$/i.test(filepath || '');

// Cheap content signature so a live-refreshing diff only re-renders when it changed.
const diffSignature = diff => (diff && Array.isArray(diff.hunks) ? JSON.stringify(diff.hunks) : '');

// Repository-config files exist in two shapes: v1 (remotes/author/defaultBranch
// at the top level) and the registry's portable shape (`projects[]`). Both are
// read here, so a file exported by either build keeps importing.
const firstProject = config => {
    if (!config || typeof config !== 'object') return null;
    return Array.isArray(config.projects) && config.projects.length ? config.projects[0] : null;
};

const configRemoteList = config => {
    if (!config || typeof config !== 'object') return null;
    if (Array.isArray(config.remotes)) return config.remotes;
    const project = firstProject(config);
    return project && Array.isArray(project.remotes) ? project.remotes : null;
};

const configAuthor = config => {
    if (!config || typeof config !== 'object') return null;
    if (config.author && typeof config.author === 'object') return config.author;
    const project = firstProject(config);
    return project && project.author && typeof project.author === 'object' ? project.author : null;
};

const configDefaultBranch = config => {
    if (!config || typeof config !== 'object') return null;
    if (typeof config.defaultBranch === 'string') return config.defaultBranch;
    const project = firstProject(config);
    return project && typeof project.defaultBranch === 'string' ? project.defaultBranch : null;
};

// Lane colours for the commit graph (the chips themselves are styled by the
// view layer: local blue / remote purple).
const BRANCH_PALETTE = [
    '#4db6ac', '#9575cd', '#64b5f6',
    '#f06292', '#ba68c8', '#4fc3f7',
    '#81c784', '#ffb74d', '#e57373'
];

// Which copy describes the running operation. Keyed by the stable op name the
// ops layer reports, so lib/git stays free of React/intl while the panel still
// says "Committing…" instead of a generic spinner. Long operations that emit
// progress override this with the backend's own message.
const BUSY_MESSAGES = {
    'init': 'initializing',
    'clone': 'cloning',
    'commit': 'committing',
    'undo-commit': 'undoing',
    'create-branch': 'creatingBranch',
    'checkout': 'checkingOut',
    'checkout-commit': 'restoring',
    'delete-repo': 'deletingRepo',
    'delete-branch': 'deletingBranch',
    'add-remote': 'addingRemote',
    'remove-remote': 'removingRemote',
    'push': 'pushing',
    'pull': 'pulling',
    'fetch': 'fetching',
    'download-commit': 'preparingDownload',
    'readme-write': 'savingReadme',
    'merge-preview': 'analyzingMerge',
    'merge-start': 'preparingMerge',
    'merge': 'merging',
    'merge-complete': 'merging'
};

const layoutSignature = (branch, nodes, branchLogs) => [
    branch || '',
    nodes.length,
    nodes[0] ? nodes[0].oid : '',
    branchLogs.map(log => `${log.branch}:${log.oids.length}`).join(',')
].join('|');

class TWGitModal extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            // --- repository view, mirrored from the shared git store ---------
            // Everything here is derived: no operation writes it directly.
            initialized: false,
            currentBranch: null,
            // `repo.detached` is HEAD holding a raw commit instead of a branch.
            // It is a dead end in this product (a detached commit can neither be
            // pushed nor show up in any branch), so the view surfaces it with a
            // one-click way back instead of only saying "no branch".
            detached: false,
            branches: [],
            commits: [],
            graphNodes: [],
            graphBranchLogs: [],
            graphRemoteBranches: [],
            commitGraphLayout: null,
            changes: [],
            upstream: {remote: null, branch: null, tracking: false, ahead: null, behind: null},
            busy: true,
            busyMessage: props.intl.formatMessage(messages.refreshing),
            busyProgress: null,
            error: null,
            success: null,
            // --- purely local UI state ---------------------------------------
            commitMessage: '',
            commitType: 'feat',
            newBranchName: '',
            mergeSourceBranch: '',
            mergeConflicts: [],
            mergeResolutions: {},
            // Remotes
            remotes: [],
            newRemoteName: 'origin',
            newRemoteUrl: '',
            pushRemote: 'origin',
            pushBranch: '',
            remoteToken: readLocal(TOKEN_KEY, ''),
            remoteService: '',
            // Clone
            cloneUrl: '',
            cloneConfirm: false,
            // Readme
            readmeContent: '',
            readmeDirty: false,
            // Diff
            diffLoading: false,
            diffFilepath: null,
            diffData: null,
            diffContext: null,
            selectedCommitOid: null,
            commitFiles: [],
            // Settings
            defaultBranch: readLocal(DEFAULT_BRANCH_KEY, 'main')
        };

        this._unsubscribe = null;
        this._successTimer = null;
        this._pollTimer = null;
        this._openDiffSig = null;
        this._layoutKey = null;
        this._lastErrorShown = null;
        this._branchColors = null;
        this._lastStoreState = null;
        this._lastProgressAt = 0;

        bindAll(this, [
            'refresh',
            'handleStoreChange',
            'applyStoreState',
            'localizeStoreError',
            'computeWorkingDiff',
            'handleProjectChanged',
            'handleRefresh',
            'handleInit',
            'handleClone',
            'handleCancelClone',
            'handleChangeCloneUrl',
            'handleCommit',
            'handleUndoCommit',
            'handleStageFile',
            'handleUnstageFile',
            'handleStageAll',
            'handleUnstageAll',
            'handleCheckoutBranch',
            'handleCreateBranch',
            'handleRestoreCommit',
            'handleDownloadCommit',
            'handleDeleteRepo',
            'handleDeleteBranch',
            'handleClose',
            'handleChangeCommitMessage',
            'handleChangeCommitType',
            'handleChangeNewBranchName',
            'handleChangeReadme',
            'handleChangeMergeSourceBranch',
            'handlePreviewMerge',
            'handleResolveInEditor',
            'handleSetMergeResolution',
            'handleApplyMerge',
            'handleDiffChangedFile',
            'handleSelectCommit',
            'handleDiffCommitFile',
            'handleClearDiff',
            'handleChangeNewRemoteName',
            'handleChangeNewRemoteUrl',
            'handleChangePushRemote',
            'handleChangePushBranch',
            'handleChangeRemoteToken',
            'handleChangeRemoteService',
            'handleAddRemote',
            'handleRemoveRemote',
            'handlePush',
            'handlePull',
            'handleFetch',
            'handleExportRepoConfig',
            'handleImportRepoConfig',
            'handleSaveReadme'
        ]);
    }

    componentDidMount () {
        // Single source of truth: every operation writes the shared store and
        // every surface renders from it. This replaces the old local
        // busy/error/changes bookkeeping that the menu bar could not see.
        this._lastStoreState = gitOps.getState();
        this._unsubscribe = gitOps.subscribe(this.handleStoreChange);

        this.refresh({history: true});
        // Re-check working changes only when the VM reports an actual project
        // edit, debounced so a burst of edits triggers a single re-serialization.
        // The refresh itself runs inside the ops lock and is coalesced, so it
        // can never interleave with a running commit/pull.
        if (this.props.vm && typeof this.props.vm.on === 'function') {
            this.props.vm.on('PROJECT_CHANGED', this.handleProjectChanged);
        }
    }

    componentWillUnmount () {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        if (this.props.vm && typeof this.props.vm.off === 'function') {
            this.props.vm.off('PROJECT_CHANGED', this.handleProjectChanged);
        }
        if (this._pollTimer) {
            clearTimeout(this._pollTimer);
            this._pollTimer = null;
        }
        if (this._successTimer) {
            clearTimeout(this._successTimer);
            this._successTimer = null;
        }
    }

    // -----------------------------------------------------------------------
    // Store → view
    // -----------------------------------------------------------------------

    handleStoreChange () {
        const state = gitOps.getState();
        const prev = this._lastStoreState;
        this._lastStoreState = state;

        // Progress callbacks from isomorphic-git are the only high-frequency
        // updates. Throttle them; the final state (op cleared) always renders
        // immediately, so nothing is lost.
        const progressTick = Boolean(prev && prev.op && state.op) &&
            prev.repo === state.repo &&
            prev.changes === state.changes &&
            prev.remotes === state.remotes &&
            prev.history === state.history &&
            prev.commits === state.commits &&
            prev.branches === state.branches &&
            prev.upstream === state.upstream &&
            prev.error === state.error &&
            prev.notice === state.notice;
        const now = Date.now();
        if (progressTick && (now - this._lastProgressAt) < 100) {
            return;
        }
        this._lastProgressAt = now;

        this.applyStoreState(state);
    }

    applyStoreState (state) {
        const repo = state.repo || {};
        const commits = state.commits || [];
        const branches = state.branches || [];
        const history = state.history || {};
        const graphNodes = history.nodes || [];
        const graphBranchLogs = history.branchLogs || [];
        const graphRemoteBranches = history.remoteBranches || [];

        // Branch colours + lane geometry are pure view concerns over the graph:
        // recompute only when the graph actually changed.
        const signature = layoutSignature(repo.branch, graphNodes, graphBranchLogs);
        if (signature !== this._layoutKey) {
            const branchColors = {};
            branches.concat(graphRemoteBranches).forEach((name, index) => {
                branchColors[name] = BRANCH_PALETTE[index % BRANCH_PALETTE.length];
            });
            this._branchColors = branchColors;
            this._layoutKey = signature;
        }

        const remotes = state.remotes || [];
        const nextPushRemote = (remotes[0] && remotes[0].name) || this.state.pushRemote;
        const nextPushBranch = this.state.pushBranch ||
            repo.branch ||
            (branches.includes('main') ? 'main' : branches[0]) ||
            '';

        // Local validation messages ("Commit message is required") outlive the
        // click that produced them; a store error is cleared as soon as the next
        // operation begins, so starting one drops the local message too.
        const localError = state.op ? null : this.state.localError;
        const storeError = state.op ? null : this.localizeStoreError(state.error);
        const error = localError || storeError;

        // A3: failures are reported through the bottom-right toast (❌️) — the
        // same channel the File menu uses — instead of an inline bar, so the two
        // surfaces stopped looking different. De-duplicated because the store
        // syncs on every change and must not re-toast the same failure.
        if (storeError) {
            this.showError(storeError);
        } else if (!localError) {
            this._lastErrorShown = null;
        }

        this.setState({
            initialized: Boolean(repo.initialized) && commits.length > 0,
            currentBranch: repo.detached ? null : (repo.branch || null),
            detached: Boolean(repo.initialized) && Boolean(repo.detached),
            branches,
            commits,
            graphNodes,
            graphBranchLogs,
            graphRemoteBranches,
            commitGraphLayout: buildCommitGraphLayout({
                graphNodes,
                graphBranchLogs,
                branchColors: this._branchColors || {}
            }),
            changes: state.changes || [],
            upstream: state.upstream || {remote: null, branch: null, tracking: false, ahead: null, behind: null},
            remotes,
            pushRemote: nextPushRemote,
            pushBranch: nextPushBranch,
            busy: Boolean(state.op),
            busyMessage: state.op ? this.busyMessageFor(state.op) : null,
            busyProgress: state.op ? state.op.progress : null,
            localError,
            error
        });
    }

    // Backend progress text wins when the operation reports any (push/pull
    // download the pack and know how far along they are).
    busyMessageFor (op) {
        if (op.message) return op.message;
        const key = BUSY_MESSAGES[op.name];
        if (!key) return null;
        const descriptor = messages[key];
        if (op.name === 'push') {
            return this.props.intl.formatMessage(descriptor, {
                branch: this.state.pushBranch || this.state.currentBranch || '',
                remote: this.state.pushRemote
            });
        }
        return this.props.intl.formatMessage(descriptor);
    }

    // Typed errors carry a stable code, so intent survives even when the text
    // is unhelpful. NOT_FRACTCH is the one case with a UI-owned message (the
    // user-facing copy lives next to the other clone strings).
    localizeStoreError (error) {
        if (!error) return null;
        if (error.code === GIT_ERROR_CODES.NOT_FRACTCH) {
            return this.props.intl.formatMessage(messages.notFractch);
        }
        return translateGitError(error.message || '', error.raw || '');
    }

    // Transient green confirmation at the top of the panel ("Pulled latest
    // changes", "Config exported"…). Auto-clears after a few seconds.
    showSuccess (message) {
        if (this._successTimer) {
            clearTimeout(this._successTimer);
        }
        this.setState({success: message});
        this._successTimer = setTimeout(() => {
            this._successTimer = null;
            this.setState({success: null});
        }, 3200);
    }

    // Every git failure ends up here, whichever surface started it: an app-wide
    // toast in the bottom-right corner marked ❌️. Errors used to be a red bar
    // inside this window only, which is why the File menu "reported" the same
    // failure with a browser alert (see A3 in the test checklist).
    //
    // `_lastErrorShown` folds repeats: the store notifies on every state change
    // and a single failure would otherwise re-appear on each of them.
    showError (message) {
        if (!message || this._lastErrorShown === message) return;
        this._lastErrorShown = message;
        if (typeof this.props.showToast === 'function') {
            this.props.showToast(message, 'error', 'bottom-right');
        }
    }

    // Client-side validation feedback (empty commit message, missing remote…).
    // Kept apart from the store's error so a subsequent operation — which clears
    // the store error — also clears this one.
    setLocalError (message) {
        this.setState({localError: message, error: message});
        this.showError(message);
    }

    handleProjectChanged () {
        if (this._pollTimer) clearTimeout(this._pollTimer);
        this._pollTimer = setTimeout(() => {
            this._pollTimer = null;
            this.refresh();
        }, 700);
    }

    // Resync the working tree from the project. Runs inside the ops lock, so a
    // refresh can never interleave with a commit/pull that is writing the
    // repository.
    //
    // `history` is opt-in on purpose: walking the commit graph is the expensive
    // part (it walks every ref), and every history-changing operation already
    // refreshes it from inside ops. A plain edit-driven resync must not rebuild
    // it, or typing in the editor would re-walk the whole graph every 700ms.
    async refresh ({history = false} = {}) {
        try {
            await gitOps.refreshRepository({vm: this.props.vm, projectId: this.props.projectId});
            if (history) {
                await gitOps.refreshHistory();
            }
            if (!this.state.readmeDirty && gitOps.getState().repo.initialized) {
                let readme = '';
                try {
                    readme = await gitOps.loadReadme();
                } catch (e) {
                    readme = '';
                }
                this.setState({readmeContent: typeof readme === 'string' ? readme : ''});
            }
            // Keep an open working-tree diff in sync with live edits, swapping
            // the content in place (no loading flash) and only when it changed.
            if (this.state.diffContext === 'working' && this.state.diffFilepath && !this.state.diffLoading) {
                try {
                    const diff = await this.computeWorkingDiff(this.state.diffFilepath);
                    const sig = diffSignature(diff);
                    if (sig !== this._openDiffSig) {
                        this._openDiffSig = sig;
                        this.setState({diffData: diff});
                    }
                } catch (e) {
                    // ignore: the manual diff path still works
                }
            }
        } catch (e) {
            // ops already recorded a typed error; the store renders it.
            console.error('Failed to refresh git state', e);
        }
    }

    handleRefresh () {
        this.refresh({history: true});
    }

    async handleInit () {
        try {
            await gitOps.initRepository({
                vm: this.props.vm,
                projectId: this.props.projectId,
                defaultBranch: this.state.defaultBranch || 'main',
                author: getDefaultAuthor()
            });
        } catch (e) {
            // reported through the store
        }
    }

    handleChangeCloneUrl (e) {
        this.setState({cloneUrl: e.target.value, cloneConfirm: false});
    }

    handleCancelClone () {
        this.setState({cloneConfirm: false});
    }

    async handleClone () {
        const url = (this.state.cloneUrl || '').trim();
        if (!url) {
            this.setLocalError(this.props.intl.formatMessage(messages.cloneUrlRequired));
            return;
        }
        if (this.props.projectChanged && !this.state.cloneConfirm) {
            this.setState({cloneConfirm: true, localError: null});
            return;
        }
        this.setState({cloneConfirm: false});
        try {
            await gitOps.cloneRepository({
                vm: this.props.vm,
                projectId: this.props.projectId,
                url,
                author: getDefaultAuthor(),
                onAuth: this.buildAuth()
            });
            this.setState({cloneUrl: ''});
        } catch (e) {
            // reported through the store
        }
    }

    // Shared auth rule (see lib/git/auth.js): author name as username
    // (Gitea/GitLab/self-hosted) or 'x-access-token' placeholder when unset
    // (GitHub PAT style). Anonymous when no token is stored.
    buildAuth () {
        return buildHttpAuth({
            token: this.state.remoteToken,
            username: (getDefaultAuthor().name || '').trim()
        });
    }

    async handleCommit () {
        const rawMessage = this.state.commitMessage.trim();
        if (!rawMessage) {
            this.setLocalError(this.props.intl.formatMessage(messages.commitMessageRequired));
            return;
        }
        // Follow Conventional Commits: the type comes from the selector, e.g.
        // "feat: ...". If the user already typed a prefixed message like
        // "fix: ..." themselves, keep it untouched to avoid double prefixes.
        const type = (this.state.commitType || 'feat').trim();
        const alreadyPrefixed = /^[a-z]+(\([^)]*\))?!?: /i.test(rawMessage);
        const message = alreadyPrefixed ? rawMessage : `${type}: ${rawMessage}`;

        // Detached HEAD guard: a commit made while HEAD points straight at an
        // oid (after "restore to this commit") belongs to no branch — it would
        // be invisible in branch history and unpushable. Ask before creating
        // such a commit so users don't lose track of it.
        if (!this.state.currentBranch && this.state.initialized) {
            // eslint-disable-next-line no-alert
            const proceed = window.confirm(
                this.props.intl.formatMessage(messages.detachedCommitConfirm)
            );
            if (!proceed) return;
        }

        try {
            await gitOps.commit({
                vm: this.props.vm,
                message,
                author: getDefaultAuthor()
            });
            this.setState({commitMessage: '', diffData: null, diffFilepath: null});
        } catch (e) {
            // reported through the store
        }
    }

    async handleUndoCommit () {
        try {
            await gitOps.undoLastCommit({
                vm: this.props.vm,
                restorePointLabel: this.props.projectTitle
            });
            this.setState({diffData: null, diffFilepath: null});
        } catch (e) {
            // reported through the store (detached HEAD / nothing to undo)
        }
    }

    // -----------------------------------------------------------------------
    // Staging (decision D2)
    //
    // Each toggle only moves bytes between the index and the working tree, so
    // ops refreshes the status *without* re-serializing the project — ticking
    // one checkbox stays instant instead of rebuilding the whole working tree.
    // -----------------------------------------------------------------------

    async handleStageFile (filepath) {
        if (!filepath) return;
        try {
            await gitOps.stageFiles({vm: this.props.vm, filepaths: [filepath]});
        } catch (e) {
            // reported through the store
        }
    }

    async handleUnstageFile (filepath) {
        if (!filepath) return;
        try {
            await gitOps.unstageFiles({vm: this.props.vm, filepaths: [filepath]});
        } catch (e) {
            // reported through the store
        }
    }

    async handleStageAll () {
        try {
            await gitOps.stageAllFiles({vm: this.props.vm});
        } catch (e) {
            // reported through the store
        }
    }

    async handleUnstageAll () {
        try {
            await gitOps.unstageAllFiles({vm: this.props.vm});
        } catch (e) {
            // reported through the store
        }
    }

    async handleCreateBranch () {
        const ref = this.state.newBranchName.trim();
        if (!ref) {
            this.setLocalError(this.props.intl.formatMessage(messages.branchNameRequired));
            return;
        }
        try {
            await gitOps.createBranch({ref});
            await gitOps.checkoutBranch({vm: this.props.vm, ref});
            this.setState({newBranchName: ''});
        } catch (e) {
            // reported through the store
        }
    }

    async handleCheckoutBranch (e) {
        const ref = e && e.target ? e.target.value : null;
        if (!ref) return;
        try {
            await gitOps.checkoutBranch({vm: this.props.vm, ref});
        } catch (err) {
            // reported through the store
        }
    }

    async handleRestoreCommit (e) {
        const oid = e && e.currentTarget ? e.currentTarget.dataset.oid : null;
        if (!oid) return;
        // Restoring a commit checks the commit out directly, which detaches HEAD
        // from every branch. In this product that is a dead end (the commit can
        // be neither pushed nor seen on a branch), and it used to happen on a
        // single stray click on the ⟲ icon with no warning at all. Ask first.
        // eslint-disable-next-line no-alert
        const ok = window.confirm(this.props.intl.formatMessage(messages.restoreDetachConfirm));
        if (!ok) return;
        try {
            await gitOps.checkoutCommit({vm: this.props.vm, oid});
        } catch (err) {
            // reported through the store
        }
    }

    async handleDownloadCommit (e) {
        const oid = e && e.currentTarget ? e.currentTarget.dataset.oid : null;
        if (!oid) return;
        try {
            const sb3ArrayBuffer = await gitOps.readSnapshotAtCommit(oid);
            if (!sb3ArrayBuffer || sb3ArrayBuffer.byteLength === 0) {
                throw new Error(this.props.intl.formatMessage(messages.noProjectData));
            }
            const short = oid.slice(0, 7);
            downloadBlob(`commit-${short}.sb3`, new Blob([sb3ArrayBuffer], {type: 'application/x.scratch.sb3'}));
        } catch (err) {
            this.setLocalError(err && err.message ? err.message : String(err));
        }
    }

    async handleDeleteRepo () {
        // The Danger zone button used to delete the repository — every commit,
        // branch and remote — on a single click, while "restore this commit"
        // asked for confirmation first. Same rule for both now.
        // eslint-disable-next-line no-alert
        const ok = window.confirm(this.props.intl.formatMessage(messages.deleteRepoConfirm));
        if (!ok) return;
        try {
            await gitOps.deleteRepository();
            this.setState({
                diffData: null,
                diffFilepath: null,
                selectedCommitOid: null,
                commitFiles: [],
                commitGraphLayout: null
            });
        } catch (err) {
            // reported through the store
        }
    }

    async handleDeleteBranch (eOrRef) {
        let ref = null;
        if (typeof eOrRef === 'string') {
            ref = eOrRef;
        } else if (eOrRef && eOrRef.currentTarget) {
            ref = eOrRef.currentTarget.dataset.ref || null;
        }
        if (!ref) return;
        try {
            await gitOps.deleteBranch({ref});
        } catch (err) {
            // reported through the store
        }
    }

    async computeWorkingDiff (filepath) {
        const fs = getFs();
        const pfs = fs.promises;
        let workingText = '';
        try {
            const data = await pfs.readFile(`${REPO_DIR}/${filepath}`, 'utf8');
            workingText = typeof data === 'string' ? data : new TextDecoder().decode(data);
        } catch (e) {
            workingText = '';
        }
        let headText = '';
        // isomorphic-git's readBlob does not resolve the symbolic ref "HEAD",
        // so use the resolved oid of the latest commit instead.
        const headOid = Array.isArray(this.state.commits) && this.state.commits[0] ?
            this.state.commits[0].oid : null;
        if (headOid) {
            try {
                const res = await getFileContentAtCommit({fs, dir: REPO_DIR, oid: headOid, filepath});
                headText = res.text || '';
            } catch (e) {
                headText = '';
            }
        }
        return computeLineDiff(headText, workingText);
    }

    async handleDiffChangedFile (filepath) {
        if (!filepath || !isDiffable(filepath)) return;
        // Clicking the already-open file toggles its diff closed instead of
        // recomputing (which caused a brief flicker).
        if (this.state.diffContext === 'working' && this.state.diffFilepath === filepath && !this.state.diffLoading) {
            this.setState({diffData: null, diffFilepath: null});
            this._openDiffSig = null;
            return;
        }
        this.setState({diffLoading: true, diffFilepath: filepath, diffData: null, diffContext: 'working'});
        try {
            const diff = await this.computeWorkingDiff(filepath);
            this._openDiffSig = diffSignature(diff);
            this.setState({diffData: diff, diffLoading: false});
        } catch (err) {
            this.setState({diffLoading: false});
            this.setLocalError(err && err.message ? err.message : String(err));
        }
    }

    async handleSelectCommit (oid) {
        if (!oid) return;
        this.setState({selectedCommitOid: oid, diffData: null, diffFilepath: null, diffContext: 'commit'});
        try {
            const fs = getFs();
            const parents = await getCommitParents({fs, dir: REPO_DIR, oid});
            const parent = parents[0] || null;
            let files = [];
            if (parent) {
                files = await getChangedFilesBetweenCommits({fs, dir: REPO_DIR, oidA: parent, oidB: oid});
            }
            this.setState({commitFiles: files});
        } catch (err) {
            this.setLocalError(err && err.message ? err.message : String(err));
        }
    }

    async handleDiffCommitFile (filepath) {
        const oid = this.state.selectedCommitOid;
        if (!oid || !filepath || !isDiffable(filepath)) return;
        if (this.state.diffContext === 'commit' && this.state.diffFilepath === filepath && !this.state.diffLoading) {
            this.setState({diffData: null, diffFilepath: null});
            return;
        }
        this.setState({diffLoading: true, diffFilepath: filepath, diffData: null, diffContext: 'commit'});
        try {
            const fs = getFs();
            const parents = await getCommitParents({fs, dir: REPO_DIR, oid});
            const parent = parents[0] || null;
            const newRes = await getFileContentAtCommit({fs, dir: REPO_DIR, oid, filepath});
            const oldRes = parent ?
                await getFileContentAtCommit({fs, dir: REPO_DIR, oid: parent, filepath}) :
                {text: ''};
            const diff = await computeLineDiff(oldRes.text || '', newRes.text || '');
            this.setState({diffData: diff, diffLoading: false});
        } catch (err) {
            this.setState({diffLoading: false});
            this.setLocalError(err && err.message ? err.message : String(err));
        }
    }

    handleClearDiff () {
        this.setState({diffData: null, diffFilepath: null});
    }

    handleChangeNewRemoteName (e) {
        this.setState({newRemoteName: e.target.value});
    }

    handleChangeNewRemoteUrl (e) {
        this.setState({newRemoteUrl: e.target.value});
    }

    handleChangePushRemote (e) {
        this.setState({pushRemote: e.target.value});
    }

    handleChangePushBranch (e) {
        this.setState({pushBranch: e.target.value});
    }

    handleChangeRemoteToken (e) {
        const token = e.target.value;
        this.setState({remoteToken: token});
        writeLocal(TOKEN_KEY, token);
    }

    handleChangeRemoteService (e) {
        const service = e.target.value;
        let url = '';
        if (service === 'github') {
            url = 'https://github.com/';
        } else if (service === 'gitlab') {
            url = 'https://gitlab.com/';
        } else if (service === 'gitee') {
            url = 'https://gitee.com/';
        }
        this.setState({remoteService: service, newRemoteUrl: url});
    }

    async handleAddRemote () {
        const name = this.state.newRemoteName.trim();
        const url = this.state.newRemoteUrl.trim();
        if (!name || !url) {
            this.setLocalError(this.props.intl.formatMessage(messages.remoteRequired));
            return;
        }
        try {
            await gitOps.addRemoteEntry({vm: this.props.vm, name, url});
            this.setState({newRemoteUrl: ''});
        } catch (err) {
            // reported through the store
        }
    }

    async handleRemoveRemote (eOrName) {
        let name = null;
        if (typeof eOrName === 'string') {
            name = eOrName;
        } else if (eOrName && eOrName.currentTarget) {
            name = eOrName.currentTarget.dataset.name || null;
        }
        if (!name) return;
        try {
            await gitOps.removeRemoteEntry({vm: this.props.vm, name});
        } catch (err) {
            // reported through the store
        }
    }

    async handlePush () {
        const remote = this.state.pushRemote;
        const branch = this.state.pushBranch || this.state.currentBranch;
        if (!remote) {
            this.setLocalError(this.props.intl.formatMessage(messages.selectRemote));
            return;
        }
        if (!branch) {
            this.setLocalError(this.props.intl.formatMessage(
                this.state.detached ? messages.detachedNoBranch : messages.selectBranch
            ));
            return;
        }
        try {
            await gitOps.pushBranch({
                vm: this.props.vm,
                remote,
                branch,
                setUpstream: true,
                onAuth: this.buildAuth()
            });
        } catch (err) {
            // reported through the store
        }
    }

    async handlePull () {
        const remote = this.state.pushRemote;
        const {vm} = this.props;
        if (!remote) {
            this.setLocalError(this.props.intl.formatMessage(messages.selectRemote));
            return;
        }
        if (!this.state.currentBranch) {
            // Detached HEAD: pull needs a branch to fast-forward into.
            this.setLocalError(this.props.intl.formatMessage(messages.detachedNoBranch));
            return;
        }
        if (this.props.projectChanged) {
            // Pulling rewrites the project working copy; confirm like the
            // menu-bar pull does before replacing the open project.
            // eslint-disable-next-line no-alert
            const ok = window.confirm(this.props.intl.formatMessage(messages.pullReplaceConfirm));
            if (!ok) {
                return;
            }
        }
        try {
            // pullBranch raises its own safety restore point and only rebuilds
            // the open project when the working tree actually moved.
            const result = await gitOps.pullBranch({
                vm,
                remote,
                author: getDefaultAuthor(),
                onAuth: this.buildAuth(),
                restorePointLabel: this.props.projectTitle
            });
            this.showSuccess(this.props.intl.formatMessage(
                result && result.kind === 'fast-forwarded' ?
                    messages.noticePullDone :
                    messages.noticePullNoUpdate
            ));
        } catch (err) {
            // reported through the store
        }
    }

    async handleFetch () {
        const remote = this.state.pushRemote;
        if (!remote) {
            this.setLocalError(this.props.intl.formatMessage(messages.selectRemote));
            return;
        }
        try {
            await gitOps.fetchRemote({remote, onAuth: this.buildAuth()});
            this.showSuccess(this.props.intl.formatMessage(messages.noticeFetchDone));
        } catch (err) {
            // reported through the store
        }
    }

    handleExportRepoConfig () {
        try {
            const remotes = gitOps.getState().remotes || [];
            const author = getDefaultAuthor();
            const {projectId} = this.props;
            const project = {
                projectId: projectId === null || typeof projectId === 'undefined' ? null : String(projectId),
                defaultBranch: this.state.defaultBranch || 'main',
                remotes: remotes.map(r => ({name: r.name, url: r.url})),
                author: {name: author.name || '', email: author.email || ''}
            };
            // v2 carries the registry's portable shape (`projects[]`) *and*
            // mirrors the v1 top-level fields. The registry section is what lets
            // the file re-bind to a project after a switch; the mirror is what
            // builds without the registry still understand.
            const payload = {
                app: 'remixwarp',
                kind: 'remixwarp-git-config',
                version: 2,
                exportedAt: new Date().toISOString(),
                projects: [project],
                defaultBranch: project.defaultBranch,
                author: project.author,
                remotes: project.remotes
            };
            const safeTitle = (this.props.projectTitle || 'project')
                .replace(/[\\/:*?"<>|.#\s]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'project';
            const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json'
            });
            downloadBlob(`${safeTitle}-git-config.json`, blob);
            this.showSuccess(this.props.intl.formatMessage(messages.noticeConfigExported));
        } catch (err) {
            this.setLocalError(err && err.message ? err.message : String(err));
        }
    }

    async handleImportRepoConfig (e) {
        const file = e && e.target && e.target.files && e.target.files[0];
        if (!file) return;
        const {vm, projectId} = this.props;
        try {
            const text = await file.text();
            const config = JSON.parse(text);
            const remotes = configRemoteList(config);
            if (!remotes) {
                throw new Error('invalid');
            }
            const current = getDefaultAuthor();
            const cfgAuthor = configAuthor(config) || {};
            const nextAuthor = {
                name: cfgAuthor.name ? String(cfgAuthor.name) : current.name,
                email: cfgAuthor.email ? String(cfgAuthor.email) : current.email
            };
            if (nextAuthor.name || nextAuthor.email) {
                setDefaultAuthor(nextAuthor);
            }
            const branch = configDefaultBranch(config);
            if (branch) {
                persistDefaultBranch(branch);
                this.setState({defaultBranch: branch});
            }
            // Remotes are written into the repository itself (the registry only
            // mirrors metadata), each entry going through ops so the whole
            // import holds the repo lock. Same-named remotes are replaced.
            for (const remote of remotes) {
                if (!remote || !remote.name || !remote.url) continue;
                try {
                    await gitOps.removeRemoteEntry({vm, name: remote.name});
                } catch (removeError) {
                    // Not present — addRemoteEntry will create it.
                }
                await gitOps.addRemoteEntry({vm, name: remote.name, url: remote.url});
            }
            // Registry-shaped files also rebind the project metadata, so the
            // configuration survives opening a different .sb3 later.
            if (firstProject(config) && projectId !== null && typeof projectId !== 'undefined') {
                try {
                    await gitOps.importRepositoryConfig(config, {overwriteProjectId: String(projectId)});
                } catch (registryError) {
                    // The remotes are already in place; a registry miss is not fatal.
                    console.warn('Failed to import repository config into the registry', registryError);
                }
            }
            // Remotes feed the graph's branch chips, so rebuild it too.
            await this.refresh({history: true});
            this.showSuccess(this.props.intl.formatMessage(messages.noticeConfigImported));
        } catch (err) {
            const invalid = !err || !err.message || err.message === 'invalid';
            this.setLocalError(invalid ?
                this.props.intl.formatMessage(messages.configInvalid) :
                (err && err.message ? err.message : String(err)));
        } finally {
            if (e && e.target) {
                e.target.value = '';
            }
        }
    }

    handleChangeReadme (e) {
        this.setState({readmeContent: e.target.value, readmeDirty: true});
    }

    async handleSaveReadme () {
        try {
            await gitOps.saveReadme(this.state.readmeContent);
            this.setState({readmeDirty: false});
        } catch (err) {
            // reported through the store
        }
    }

    handleClose () {
        this.props.onClose();
    }

    handleChangeCommitMessage (e) {
        // A validation banner ("Commit message is required") must not outlive
        // the input it complained about — clear it as soon as the user types.
        const patch = {commitMessage: e.target.value};
        if (this.state.localError) {
            patch.localError = null;
            if (this.state.error === this.state.localError) patch.error = null;
        }
        this.setState(patch);
    }

    handleChangeCommitType (e) {
        this.setState({commitType: e.target.value});
    }

    handleChangeNewBranchName (e) {
        this.setState({newBranchName: e.target.value});
    }

    handleChangeMergeSourceBranch (e) {
        this.setState({mergeSourceBranch: e.target.value});
    }

    async handlePreviewMerge () {
        const ours = this.state.currentBranch;
        const theirs = this.state.mergeSourceBranch;
        if (!ours || !theirs) return;
        if (ours === theirs) {
            this.setLocalError(this.props.intl.formatMessage(messages.selectDifferentBranch));
            return;
        }
        this.setState({mergeConflicts: [], mergeResolutions: {}});
        try {
            const preview = await gitOps.previewMerge({ours, theirs});
            const conflicts = Array.isArray(preview.conflicts) ? preview.conflicts : [];
            this.setState({mergeConflicts: conflicts});
        } catch (err) {
            // reported through the store
        }
    }

    handleSetMergeResolution (path, choice) {
        if (!path) return;
        const c = choice === 'theirs' ? 'theirs' : 'ours';
        this.setState(prev => ({mergeResolutions: {...prev.mergeResolutions, [path]: c}}));
    }

    async handleResolveInEditor () {
        const ours = this.state.currentBranch;
        const theirs = this.state.mergeSourceBranch;
        if (!ours || !theirs) return;
        try {
            const {conflicts, merged} = await gitOps.startMerge({
                vm: this.props.vm,
                ours,
                theirs,
                author: getDefaultAuthor()
            });
            if (merged) {
                this.setState({mergeConflicts: [], mergeResolutions: {}, mergeSourceBranch: ''});
                return;
            }
            if (conflicts.length === 0) {
                this.setLocalError(this.props.intl.formatMessage(messages.binaryConflicts));
                return;
            }
            this.props.onClose();
            openFractchMode();
        } catch (err) {
            // reported through the store
        }
    }

    async handleApplyMerge () {
        const ours = this.state.currentBranch;
        const theirs = this.state.mergeSourceBranch;
        if (!ours || !theirs) return;
        try {
            await gitOps.applyMerge({
                vm: this.props.vm,
                ours,
                theirs,
                resolutions: this.state.mergeResolutions,
                author: getDefaultAuthor()
            });
            this.setState({mergeConflicts: [], mergeResolutions: {}, mergeSourceBranch: ''});
        } catch (err) {
            // reported through the store
        }
    }

    render () {
        const canUndoCommit = Boolean(this.state.currentBranch) &&
            Array.isArray(this.state.commits) &&
            this.state.commits.length >= 2;

        return (
            <GitModalComponent
                busy={this.state.busy}
                busyMessage={this.state.busyMessage}
                busyProgress={this.state.busyProgress}
                success={this.state.success}
                initialized={this.state.initialized}
                currentBranch={this.state.currentBranch}
                detached={this.state.detached}
                branches={this.state.branches}
                commits={this.state.commits}
                graphNodes={this.state.graphNodes}
                graphBranchLogs={this.state.graphBranchLogs}
                graphRemoteBranches={this.state.graphRemoteBranches}
                commitGraphLayout={this.state.commitGraphLayout}
                commitMessage={this.state.commitMessage}
                newBranchName={this.state.newBranchName}
                mergeSourceBranch={this.state.mergeSourceBranch}
                mergeConflicts={this.state.mergeConflicts}
                mergeResolutions={this.state.mergeResolutions}
                canUndoCommit={canUndoCommit}
                changes={this.state.changes}
                upstream={this.state.upstream}
                remotes={this.state.remotes}
                newRemoteName={this.state.newRemoteName}
                newRemoteUrl={this.state.newRemoteUrl}
                pushRemote={this.state.pushRemote}
                pushBranch={this.state.pushBranch}
                remoteToken={this.state.remoteToken}
                remoteService={this.state.remoteService}
                diffLoading={this.state.diffLoading}
                diffFilepath={this.state.diffFilepath}
                diffData={this.state.diffData}
                diffContext={this.state.diffContext}
                selectedCommitOid={this.state.selectedCommitOid}
                commitFiles={this.state.commitFiles}
                readmeContent={this.state.readmeContent}
                readmeDirty={this.state.readmeDirty}
                onChangeReadme={this.handleChangeReadme}
                onSaveReadme={this.handleSaveReadme}
                onChangeCommitMessage={this.handleChangeCommitMessage}
                commitType={this.state.commitType}
                onChangeCommitType={this.handleChangeCommitType}
                onChangeNewBranchName={this.handleChangeNewBranchName}
                onCheckoutBranch={this.handleCheckoutBranch}
                onCreateBranch={this.handleCreateBranch}
                onCommit={this.handleCommit}
                onUndoCommit={this.handleUndoCommit}
                onStageFile={this.handleStageFile}
                onUnstageFile={this.handleUnstageFile}
                onStageAll={this.handleStageAll}
                onUnstageAll={this.handleUnstageAll}
                onInit={this.handleInit}
                cloneUrl={this.state.cloneUrl}
                cloneConfirm={this.state.cloneConfirm}
                onChangeCloneUrl={this.handleChangeCloneUrl}
                onClone={this.handleClone}
                onCancelClone={this.handleCancelClone}
                onRefresh={this.handleRefresh}
                onRestoreCommit={this.handleRestoreCommit}
                onDownloadCommit={this.handleDownloadCommit}
                onDeleteRepo={this.handleDeleteRepo}
                onDeleteBranch={this.handleDeleteBranch}
                onChangeMergeSourceBranch={this.handleChangeMergeSourceBranch}
                onPreviewMerge={this.handlePreviewMerge}
                onResolveInEditor={this.handleResolveInEditor}
                onSetMergeResolution={this.handleSetMergeResolution}
                onApplyMerge={this.handleApplyMerge}
                onDiffChangedFile={this.handleDiffChangedFile}
                onSelectCommit={this.handleSelectCommit}
                onDiffCommitFile={this.handleDiffCommitFile}
                onClearDiff={this.handleClearDiff}
                onChangeNewRemoteName={this.handleChangeNewRemoteName}
                onChangeNewRemoteUrl={this.handleChangeNewRemoteUrl}
                onChangePushRemote={this.handleChangePushRemote}
                onChangePushBranch={this.handleChangePushBranch}
                onChangeRemoteToken={this.handleChangeRemoteToken}
                onChangeRemoteService={this.handleChangeRemoteService}
                onAddRemote={this.handleAddRemote}
                onRemoveRemote={this.handleRemoveRemote}
                onPush={this.handlePush}
                onPull={this.handlePull}
                onFetch={this.handleFetch}
                onExportRepoConfig={this.handleExportRepoConfig}
                onImportRepoConfig={this.handleImportRepoConfig}
                onClose={this.handleClose}
            />
        );
    }
}

TWGitModal.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func.isRequired,
    showToast: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired,
    projectChanged: PropTypes.bool,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    projectTitle: PropTypes.string
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectChanged: state.scratchGui.projectChanged,
    projectId: state.scratchGui.projectId,
    projectTitle: state.scratchGui.projectTitle
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeGitModal()),
    // Same toast channel as the menu bar (see reducers/toast.js). The git window
    // asks for the bottom-right variant so a failure is visible over the modal
    // instead of hiding behind it.
    showToast: (message, type = 'error', position = 'bottom-right') => dispatch({
        type: 'scratch-gui/SHOW_TOAST',
        message,
        toastType: type,
        position
    })
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(TWGitModal));

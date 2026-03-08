import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import VM from 'scratch-vm';

import GitModalComponent from '../components/mw-git-modal/git-modal.jsx';
import {closeGitModal} from '../reducers/modals.js';

import downloadBlob from '../lib/utils/download-blob.js';

import {
    getDefaultAuthor,
    getRepoStatus,
    getRepoChanges,
    initRepo,
    createBranch,
    checkoutBranchAndRestore,
    checkoutCommitAndRestore,
    readSnapshotAtCommit,
    deleteRepo,
    deleteBranch,
    commitProject,
    mergeBranchesPreview,
    mergeBranchesApply,
    restoreProjectFromCurrentRef,
    computeCommitGraph,
    addRemote,
    removeRemote,
    getRemotes,
    push
} from '../lib/git/browser-git.js';

class TWGitModal extends React.Component {
    constructor (props) {
        super(props);

        const author = getDefaultAuthor();

        this.state = {
            busy: false,
            busyMessage: null,
            busyProgress: null,
            error: null,
            initialized: false,
            currentBranch: null,
            branches: [],
            commits: [],
            graphBranches: [],
            graphNodes: [],
            commitMessage: '',
            authorName: author.name,
            authorEmail: author.email,
            newBranchName: '',
            mergeSourceBranch: '',
            mergeConflicts: [],
            mergeResolutions: {},
            changes: [],
            // Remote repository state
            remotes: [],
            remoteName: '',
            remoteUrl: '',
            pushRemote: '',
            pushBranch: '',
            // Authentication state
            authUsername: '',
            authToken: '',
            disableCorsProxy: false
        };

        this._lastProgressUpdate = 0;

        bindAll(this, [
            'refresh',
            'handleRefresh',
            'handleInit',
            'handleCommit',
            'handleUndoCommit',
            'handleCheckoutBranch',
            'handleCreateBranch',
            'handleRestoreCommit',
            'handleDownloadCommit',
            'handleDeleteRepo',
            'handleDeleteBranch',
            'handleClose',
            'handleChangeCommitMessage',
            'handleChangeAuthorName',
            'handleChangeAuthorEmail',
            'handleChangeNewBranchName',
            'handleGitProgress',
            'handleChangeMergeSourceBranch',
            'handlePreviewMerge',
            'handleSetMergeResolution',
            'handleApplyMerge',
            // Remote repository handlers
            'handleAddRemote',
            'handleRemoveRemote',
            'handlePush',
            'handleChangeRemoteName',
            'handleChangeRemoteUrl',
            'handleChangePushRemote',
            'handleChangePushBranch',
            'handleChangeAuthUsername',
            'handleChangeAuthToken',
            'handleChangeDisableCorsProxy'
        ]);
    }

    componentDidMount () {
        this.refresh();
    }

    handleGitProgress (progress) {
        if (!progress || !this.state.busy) return;

        const now = Date.now();
        if (now - this._lastProgressUpdate < 100) return;
        this._lastProgressUpdate = now;

        const completed = typeof progress.completed === 'number' ? progress.completed : null;
        const total = typeof progress.total === 'number' ? progress.total : null;
        const ratio = completed !== null && total && total > 0 ? Math.max(0, Math.min(1, completed / total)) : null;

        this.setState({
            busyMessage: progress.message || this.props.intl.formatMessage({
                defaultMessage: 'Working…',
                description: 'Message shown when Git operation is in progress',
                id: 'mw.gitModal.busy'
            }),
            busyProgress: ratio
        });
    }

    async refresh () {
        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Refreshing…',
            description: 'Message shown when refreshing Git repository status',
            id: 'mw.gitModal.refreshing'
        }), busyProgress: null, error: null});
        try {
            const status = await getRepoStatus(this.props.vm);
            // If a repo exists but has no commits, treat it like uninitialized
            // so the UI prompts to initialize (this covers partially-created
            // .git metadata without history).
            const hasCommits = Array.isArray(status.commits) && status.commits.length > 0;
            const graph = status.initialized ?
                (await computeCommitGraph({depth: 50})) :
                {branches: [], nodes: [], branchLogs: []};
            
            // Get remotes if repo is initialized
            let remotes = [];
            if (status.initialized && hasCommits) {
                remotes = await getRemotes(this.props.vm);
            }
            
            const palette = [
                '#4db6ac', '#9575cd', '#64b5f6',
                '#f06292', '#ba68c8', '#4fc3f7',
                '#81c784', '#ffb74d', '#e57373'
            ];
            const branchColors = {};
            graph.branches.forEach((b, i) => {
                branchColors[b] = palette[i % palette.length];
            });
            this.setState({
                initialized: Boolean(status.initialized) && hasCommits,
                currentBranch: status.currentBranch,
                branches: status.branches,
                commits: status.commits,
                graphBranches: graph.branches,
                graphNodes: graph.nodes,
                graphBranchLogs: graph.branchLogs,
                branchColors,
                changes: status.changes,
                remotes
            });
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    handleRefresh () {
        this.refresh();
    }

    async handleInit () {
        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Initializing repository…',
            description: 'Message shown when initializing Git repository',
            id: 'mw.gitModal.init-ing'
        }), busyProgress: 0, error: null});
        try {
            await initRepo({
                vm: this.props.vm,
                onProgress: this.handleGitProgress
            });
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handleCommit () {
        const message = this.state.commitMessage.trim();
        if (!message) {
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'Commit message is required',
                description: 'Error message when commit message is empty',
                id: 'mw.gitModal.error.commitMessageRequired'
            })});
            return;
        }

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Committing…',
            description: 'Message shown when committing changes to Git repository',
            id: 'mw.gitModal.committing'
        }), busyProgress: 0, error: null});
        try {
            await commitProject({
                vm: this.props.vm,
                message,
                author: {
                    name: this.state.authorName || 'User',
                    email: this.state.authorEmail || 'user@example.com'
                },
                onProgress: this.handleGitProgress
            });
            this.setState({commitMessage: ''});
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handleUndoCommit () {
        if (!this.state.initialized) return;
        if (!this.state.currentBranch) {
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'Cannot undo commit while detached. Check out a branch first.',
                description: 'Error message when trying to undo commit while detached',
                id: 'mw.gitModal.error.cannotUndoWhileDetached'
            })});
            return;
        }

        if (!Array.isArray(this.state.commits) || this.state.commits.length < 2) {
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'No previous commit to undo to.',
                description: 'Error message when there is no previous commit',
                id: 'mw.gitModal.error.noPreviousCommit'
            })});
            return;
        }

        const head = this.state.commits[0];
        const previous = this.state.commits[1];

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Undoing commit…',
            description: 'Message shown when undoing a Git commit',
            id: 'mw.gitModal.undoingCommit'
        }), busyProgress: null, error: null});
        try {
            const snapshot = await readSnapshotAtCommit(previous.oid);
            this.props.vm.quit();
            await this.props.vm.loadProject(snapshot);

            const headLine = head && head.commit && head.commit.message ? head.commit.message.split('\n')[0] : '';
            const undoMessage = `Undo: ${headLine || head.oid.slice(0, 7)}`;

            await commitProject({
                vm: this.props.vm,
                message: undoMessage,
                author: {
                    name: this.state.authorName || 'User',
                    email: this.state.authorEmail || 'user@example.com'
                },
                onProgress: this.handleGitProgress
            });

            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handleCreateBranch () {
        const ref = this.state.newBranchName.trim();
        if (!ref) {
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'Branch name is required',
                description: 'Error message when branch name is empty',
                id: 'mw.gitModal.error.branchNameRequired'
            })});
            return;
        }

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Creating branch…',
            description: 'Message shown when creating a new Git branch',
            id: 'mw.gitModal.creatingBranch'
        }), busyProgress: null, error: null});
        try {
            await createBranch({ref, vm: this.props.vm});
            await checkoutBranchAndRestore({vm: this.props.vm, ref});
            this.setState({newBranchName: ''});
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handleCheckoutBranch (e) {
        const ref = e && e.target ? e.target.value : null;
        if (!ref) return;

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Checking out branch…',
            description: 'Message shown when checking out a Git branch',
            id: 'mw.gitModal.checkingOutBranch'
        }), busyProgress: null, error: null});
        try {
            await checkoutBranchAndRestore({vm: this.props.vm, ref});
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handleRestoreCommit (e) {
        const oid = e && e.currentTarget ? e.currentTarget.dataset.oid : null;
        if (!oid) return;

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Restoring commit…',
            description: 'Message shown when restoring a Git commit',
            id: 'mw.gitModal.restoringCommit'
        }), busyProgress: null, error: null});
        try {
            await checkoutCommitAndRestore({vm: this.props.vm, oid});
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handleDownloadCommit (e) {
        const oid = e && e.currentTarget ? e.currentTarget.dataset.oid : null;
        if (!oid) return;

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Preparing download…',
            description: 'Message shown when preparing a Git commit for download',
            id: 'mw.gitModal.preparingDownload'
        }), busyProgress: null, error: null});
        try {
            const sb3ArrayBuffer = await readSnapshotAtCommit(oid);
            if (!sb3ArrayBuffer || sb3ArrayBuffer.byteLength === 0) {
                throw new Error('No project data found at this commit');
            }

            const short = oid.slice(0, 7);
            downloadBlob(`commit-${short}.sb3`, new Blob([sb3ArrayBuffer], {type: 'application/x.scratch.sb3'}));
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handleDeleteRepo () {
        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Deleting repository…',
            description: 'Message shown when deleting a Git repository',
            id: 'mw.gitModal.deletingRepo'
        }), busyProgress: null, error: null});
        try {
            await deleteRepo();
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
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

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Deleting branch…',
            description: 'Message shown when deleting a Git branch',
            id: 'mw.gitModal.deletingBranch'
        }), busyProgress: null, error: null});
        try {
            await deleteBranch(ref);
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    handleClose () {
        this.props.onClose();
    }

    handleChangeCommitMessage (e) {
        this.setState({commitMessage: e.target.value});
    }

    handleChangeAuthorName (e) {
        this.setState({authorName: e.target.value});
    }

    handleChangeAuthorEmail (e) {
        this.setState({authorEmail: e.target.value});
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
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'Select a different branch to merge.',
                description: 'Error message when selecting same branch for merge',
                id: 'mw.gitModal.error.selectDifferentBranch'
            })});
            return;
        }
        this.setState({
            busy: true,
            busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Analyzing merge…',
            description: 'Message shown when analyzing a Git merge',
            id: 'mw.gitModal.analyzingMerge'
        }),
            busyProgress: null,
            error: null,
            mergeConflicts: [],
            mergeResolutions: {}
        });
        try {
            const preview = await mergeBranchesPreview({ours, theirs});
            const conflicts = Array.isArray(preview.conflicts) ? preview.conflicts : [];
            this.setState({mergeConflicts: conflicts});
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    handleSetMergeResolution (path, choice) {
        if (!path) return;
        const c = choice === 'theirs' ? 'theirs' : 'ours';
        this.setState(prev => ({mergeResolutions: {...prev.mergeResolutions, [path]: c}}));
    }

    async handleApplyMerge () {
        const ours = this.state.currentBranch;
        const theirs = this.state.mergeSourceBranch;
        if (!ours || !theirs) return;
        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Merging…',
            description: 'Message shown when Git merging',
            id: 'mw.gitModal.merging'
        }), busyProgress: null, error: null});
        try {
            await mergeBranchesApply({
                ours,
                theirs,
                resolutions: this.state.mergeResolutions,
                author: {
                    name: this.state.authorName || 'User',
                    email: this.state.authorEmail || 'user@example.com'
                }
            });
            await restoreProjectFromCurrentRef(this.props.vm);
            this.setState({mergeConflicts: [], mergeResolutions: {}, mergeSourceBranch: ''});
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    // Remote repository handlers
    async handleAddRemote () {
        const {remoteName, remoteUrl} = this.state;
        if (!remoteName.trim()) {
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'Remote name is required',
                description: 'Error message when remote name is empty',
                id: 'mw.gitModal.error.remoteNameRequired'
            })});
            return;
        }
        if (!remoteUrl.trim()) {
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'Remote URL is required',
                description: 'Error message when remote URL is empty',
                id: 'mw.gitModal.error.remoteUrlRequired'
            })});
            return;
        }

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Adding remote…',
            description: 'Message shown when adding a Git remote',
            id: 'mw.gitModal.addingRemote'
        }), busyProgress: null, error: null});
        try {
            await addRemote({vm: this.props.vm, name: remoteName, url: remoteUrl});
            this.setState({remoteName: '', remoteUrl: ''});
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handleRemoveRemote (remoteName) {
        if (!remoteName) return;

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Removing remote…',
            description: 'Message shown when removing a Git remote',
            id: 'mw.gitModal.removingRemote'
        }), busyProgress: null, error: null});
        try {
            await removeRemote({vm: this.props.vm, name: remoteName});
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    async handlePush () {
        const {pushRemote, pushBranch, authUsername, authToken, disableCorsProxy} = this.state;
        if (!pushRemote) {
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'Select a remote to push to',
                description: 'Error message when no remote is selected for push',
                id: 'mw.gitModal.error.selectPushRemote'
            })});
            return;
        }
        if (!pushBranch) {
            this.setState({error: this.props.intl.formatMessage({
                defaultMessage: 'Select a branch to push',
                description: 'Error message when no branch is selected for push',
                id: 'mw.gitModal.error.selectPushBranch'
            })});
            return;
        }

        this.setState({busy: true, busyMessage: this.props.intl.formatMessage({
            defaultMessage: 'Pushing to remote…',
            description: 'Message shown when pushing to a Git remote',
            id: 'mw.gitModal.pushingToRemote'
        }), busyProgress: null, error: null});
        try {
            const options = {};
            if (authUsername && authToken) {
                options.onAuth = () => ({
                    username: authUsername,
                    password: authToken
                });
                options.onAuthFailure = () => {
                    throw new Error('Authentication failed. Please check your username and token.');
                };
            }
            options.disableCorsProxy = disableCorsProxy;
            await push({vm: this.props.vm, remote: pushRemote, branch: pushBranch, ...options});
            await this.refresh();
        } catch (err) {
            this.setState({error: err && err.message ? err.message : String(err)});
        } finally {
            this.setState({busy: false, busyMessage: null, busyProgress: null});
        }
    }

    handleChangeRemoteName (e) {
        this.setState({remoteName: e.target.value});
    }

    handleChangeRemoteUrl (e) {
        this.setState({remoteUrl: e.target.value});
    }

    handleChangePushRemote (e) {
        this.setState({pushRemote: e.target.value});
    }

    handleChangePushBranch (e) {
        this.setState({pushBranch: e.target.value});
    }

    handleChangeAuthUsername (e) {
        this.setState({authUsername: e.target.value});
    }

    handleChangeAuthToken (e) {
        this.setState({authToken: e.target.value});
    }

    handleChangeDisableCorsProxy (e) {
        this.setState({disableCorsProxy: e.target.checked});
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
                error={this.state.error}
                initialized={this.state.initialized}
                currentBranch={this.state.currentBranch}
                branches={this.state.branches}
                commits={this.state.commits}
                graphBranches={this.state.graphBranches}
                graphNodes={this.state.graphNodes}
                graphBranchLogs={this.state.graphBranchLogs}
                branchColors={this.state.branchColors}
                commitMessage={this.state.commitMessage}
                authorName={this.state.authorName}
                authorEmail={this.state.authorEmail}
                newBranchName={this.state.newBranchName}
                mergeSourceBranch={this.state.mergeSourceBranch}
                mergeConflicts={this.state.mergeConflicts}
                mergeResolutions={this.state.mergeResolutions}
                canUndoCommit={canUndoCommit}
                onChangeCommitMessage={this.handleChangeCommitMessage}
                onChangeAuthorName={this.handleChangeAuthorName}
                onChangeAuthorEmail={this.handleChangeAuthorEmail}
                onChangeNewBranchName={this.handleChangeNewBranchName}
                onCheckoutBranch={this.handleCheckoutBranch}
                onCreateBranch={this.handleCreateBranch}
                onCommit={this.handleCommit}
                onUndoCommit={this.handleUndoCommit}
                onInit={this.handleInit}
                onRefresh={this.handleRefresh}
                onRestoreCommit={this.handleRestoreCommit}
                onDownloadCommit={this.handleDownloadCommit}
                onDeleteRepo={this.handleDeleteRepo}
                onDeleteBranch={this.handleDeleteBranch}
                onChangeMergeSourceBranch={this.handleChangeMergeSourceBranch}
                onPreviewMerge={this.handlePreviewMerge}
                onSetMergeResolution={this.handleSetMergeResolution}
                onApplyMerge={this.handleApplyMerge}
                onClose={this.handleClose}
                changes={this.state.changes}
                // Remote repository props
                remotes={this.state.remotes}
                remoteName={this.state.remoteName}
                remoteUrl={this.state.remoteUrl}
                pushRemote={this.state.pushRemote}
                pushBranch={this.state.pushBranch}
                authUsername={this.state.authUsername}
                authToken={this.state.authToken}
                disableCorsProxy={this.state.disableCorsProxy}
                onAddRemote={this.handleAddRemote}
                onRemoveRemote={this.handleRemoveRemote}
                onPush={this.handlePush}
                onChangeRemoteName={this.handleChangeRemoteName}
                onChangeRemoteUrl={this.handleChangeRemoteUrl}
                onChangePushRemote={this.handleChangePushRemote}
                onChangePushBranch={this.handleChangePushBranch}
                onChangeAuthUsername={this.handleChangeAuthUsername}
                onChangeAuthToken={this.handleChangeAuthToken}
                onChangeDisableCorsProxy={this.handleChangeDisableCorsProxy}
            />
        );
    }
}

TWGitModal.propTypes = {
    intl: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeGitModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(TWGitModal));

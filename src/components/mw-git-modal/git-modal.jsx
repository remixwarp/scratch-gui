import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {
    GitBranch,
    History,
    GitCommit,
    FileDiff,
    Cloud,
    FileText,
    Plus,
    RefreshCcw,
    RotateCcw,
    Download,
    Trash,
    Check,
    Upload,
    GitMerge
} from 'lucide-react';

import Box from '../box/box.jsx';
import Modal from '../../containers/windowed-modal.jsx';
import DiffViewer from '../mw-git-diff-viewer/diff-viewer.jsx';
import {
    ModalSidebar,
    ModalSidebarContent,
    ModalSidebarFooter,
    ModalSidebarItem,
    ModalSidebarLayout
} from '../modal-sidebar/modal-sidebar.jsx';
import isScratchDesktop from '../../lib/utils/isScratchDesktop.js';
import {takeGitModalInitialView} from '../../lib/git/modal-view.js';

import styles from './git-modal.css';
import {DETACHED_BRANCH} from '../../lib/git/graph-layout.js';

const pad2 = n => String(n).padStart(2, '0');

const formatYmd = ts => {
    const d = new Date(ts * 1000);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const formatYmdHms = ts => {
    const d = new Date(ts * 1000);
    return `${formatYmd(ts)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const formatRelativeTime = (intl, ts) => {
    if (!ts) return '';
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 0) {
        return intl.formatMessage(
            {id: 'mw.git.time.on', defaultMessage: 'on {date}'},
            {date: formatYmd(ts)}
        );
    }
    if (diff < 60) {
        return intl.formatMessage({id: 'mw.git.time.justNow', defaultMessage: 'just now'});
    }
    const min = Math.floor(diff / 60);
    if (min < 60) {
        return intl.formatMessage(
            {id: 'mw.git.time.minutesAgo', defaultMessage: '{n} min ago'},
            {n: min}
        );
    }
    const hr = Math.floor(min / 60);
    if (hr < 24) {
        return intl.formatMessage(
            {id: 'mw.git.time.hoursAgo', defaultMessage: '{n} h ago'},
            {n: hr}
        );
    }
    const day = Math.floor(hr / 24);
    if (day < 30) {
        return intl.formatMessage(
            {id: 'mw.git.time.daysAgo', defaultMessage: '{n} d ago'},
            {n: day}
        );
    }
    const mo = Math.floor(day / 30);
    if (mo < 12) {
        return intl.formatMessage(
            {id: 'mw.git.time.monthsAgo', defaultMessage: '{n} mo ago'},
            {n: mo}
        );
    }
    return formatYmd(ts);
};

// Conventional Commit types offered in the Changes view. The value is the
// literal `type` that ends up in the commit message ("feat: ..."). Display
// text is localised per type through mw.git.commitType.* messages.
const COMMIT_TYPES = [
    {value: 'feat', messageId: 'mw.git.commitType.feat', defaultMessage: 'New feature'},
    {value: 'fix', messageId: 'mw.git.commitType.fix', defaultMessage: 'Bug fix'},
    {value: 'docs', messageId: 'mw.git.commitType.docs', defaultMessage: 'Documentation'},
    {value: 'style', messageId: 'mw.git.commitType.style', defaultMessage: 'Code style'},
    {value: 'refactor', messageId: 'mw.git.commitType.refactor', defaultMessage: 'Refactor'},
    {value: 'perf', messageId: 'mw.git.commitType.perf', defaultMessage: 'Performance'},
    {value: 'test', messageId: 'mw.git.commitType.test', defaultMessage: 'Tests'},
    {value: 'build', messageId: 'mw.git.commitType.build', defaultMessage: 'Build system'},
    {value: 'ci', messageId: 'mw.git.commitType.ci', defaultMessage: 'Continuous integration'},
    {value: 'chore', messageId: 'mw.git.commitType.chore', defaultMessage: 'Chore'},
    {value: 'revert', messageId: 'mw.git.commitType.revert', defaultMessage: 'Revert'}
];

const messages = defineMessages({
    title: {
        defaultMessage: 'Version Control',
        description: 'Title of the git window',
        id: 'mw.git.title'
    },
    changes: {
        defaultMessage: 'Changes',
        description: 'Changes sidebar item',
        id: 'mw.git.nav.changes'
    },
    history: {
        defaultMessage: 'History',
        description: 'History sidebar item',
        id: 'mw.git.nav.history'
    },
    branches: {
        defaultMessage: 'Branches',
        description: 'Branches sidebar item',
        id: 'mw.git.nav.branches'
    },
    diff: {
        defaultMessage: 'Diff',
        description: 'Diff sidebar item',
        id: 'mw.git.nav.diff'
    },
    remote: {
        defaultMessage: 'Remote',
        description: 'Remote sidebar item',
        id: 'mw.git.nav.remote'
    },
    settings: {
        defaultMessage: 'Settings',
        description: 'Settings sidebar item',
        id: 'mw.git.nav.settings'
    },
    readme: {
        defaultMessage: 'Readme',
        description: 'Readme sidebar item',
        id: 'mw.git.nav.readme'
    },
    remoteService: {
        defaultMessage: 'Service',
        description: 'Remote service selector label',
        id: 'mw.git.remote.service'
    },
    remoteServicePlaceholder: {
        defaultMessage: 'Select a Git hosting service…',
        description: 'Service selector placeholder',
        id: 'mw.git.remote.servicePlaceholder'
    },
    githubTokenLink: {
        defaultMessage: 'Generate a GitHub token',
        description: 'Link to GitHub token page',
        id: 'mw.git.remote.githubTokenLink'
    },
    serviceOther: {
        defaultMessage: 'Other',
        description: 'Remote service option for non-GitHub/GitLab/Gitee hosts',
        id: 'mw.git.remote.serviceOther'
    },
    tokenPlaceholder: {
        defaultMessage: 'Personal access token…',
        description: 'Placeholder for the personal access token input',
        id: 'mw.git.remote.tokenPlaceholder'
    },
    readmePlaceholder: {
        defaultMessage: '# My Project\n\nDescribe your project here…',
        description: 'Placeholder for the README editor',
        id: 'mw.git.readme.placeholder'
    },
    sidebarAriaLabel: {
        defaultMessage: 'Version control sections',
        description: 'Accessible label for the git sidebar navigation',
        id: 'mw.git.sidebar.ariaLabel'
    },
    working: {
        defaultMessage: 'Working…',
        description: 'Generic busy message',
        id: 'mw.git.working'
    },
    stageFile: {
        defaultMessage: 'Stage {filepath}',
        description: 'Checkbox label that stages one file',
        id: 'mw.git.changes.stageFile'
    },
    unstageFile: {
        defaultMessage: 'Unstage {filepath}',
        description: 'Checkbox label that unstages one file',
        id: 'mw.git.changes.unstageFile'
    },
    syncUntracked: {
        defaultMessage: '{ref} is not fetched yet — push once to start tracking it.',
        description: 'Sync banner when the branch has no upstream',
        id: 'mw.git.sync.untracked'
    },
    syncUpToDate: {
        defaultMessage: 'In sync with {ref}.',
        description: 'Sync banner when local and remote match',
        id: 'mw.git.sync.upToDate'
    },
    syncDrift: {
        defaultMessage: 'Compared with {ref}:',
        description: 'Sync banner prefix before the ahead/behind counters',
        id: 'mw.git.sync.drift'
    }
});

const changeTypeClass = (styleMap, description) => {
    switch (description) {
    case 'untracked':
    case 'added':
        return styleMap.badgeAdd;
    case 'deleted':
        return styleMap.badgeDelete;
    case 'renamed':
        return styleMap.badgeRename;
    default:
        return styleMap.badgeModify;
    }
};

// Git status badge: the change-type letter (M/A/D/U/R) coloured by its kind.
const FileBadge = ({description}) => {
    const letter = description && description[0] ? description[0].toUpperCase() : '?';
    return (
        <span className={classNames(styles.badge, changeTypeClass(styles, description))}>{letter}</span>
    );
};

FileBadge.propTypes = {
    description: PropTypes.string
};

// Branch label chip. Local branches render blue, remote-tracking refs
// ("origin/main") purple — matching mainstream git UIs. After a pull the same
// commit carries both chips ("main" + "origin/main"). `current` prefixes the
// checked-out branch with "@" (History view only).
const BranchChip = ({name, isRemote, current}) => (
    <span
        className={classNames(
            styles.branchChip,
            isRemote ? styles.branchChipRemote : styles.branchChipLocal
        )}
    >
        {current && !isRemote ? `@${name}` : name}
    </span>
);

BranchChip.propTypes = {
    name: PropTypes.string.isRequired,
    isRemote: PropTypes.bool,
    current: PropTypes.bool
};

// Given the remote-tracking refs ("origin/main") and a local branch name,
// return the upstream ref that tracks it, if any. Matched by identical suffix
// after the first "/" (the remote name), mirroring git's default upstream rule.
const remoteUpstreamOf = (remoteBranches, localBranch) => {
    if (!localBranch || !Array.isArray(remoteBranches)) return '';
    const match = remoteBranches.find(rb => {
        const slash = rb.indexOf('/');
        return slash > 0 && rb.slice(slash + 1) === localBranch;
    });
    return match || '';
};

// Clone form shared by the empty state and the Remote view. Cloning replaces
// the current project and its git repository with the given remote's fractch
// project — the current project's own history stays embedded in its .sb3, so
// this behaves like opening a different repository in an IDE.
const ClonePanel = ({
    cloneUrl,
    onChangeCloneUrl,
    busy,
    cloneConfirm,
    onClone,
    onCancelClone
}) => (
    <Box>
        <Box className={styles.cloneForm}>
            <input
                className={styles.input}
                type="text"
                value={cloneUrl}
                onChange={onChangeCloneUrl}
                disabled={busy}
                placeholder="https://git.example.com/user/project.git"
            />
            <button
                className={styles.button}
                disabled={busy || !cloneUrl || !cloneUrl.trim()}
                onClick={onClone}
            >
                <Download className={styles.buttonIcon} />
                <FormattedMessage
                    defaultMessage="Clone"
                    description="Clone button"
                    id="mw.git.empty.clone"
                />
            </button>
        </Box>
        {cloneConfirm ? (
            <Box className={styles.cloneConfirm}>
                <p>
                    <FormattedMessage
                        // eslint-disable-next-line max-len
                        defaultMessage="Cloning replaces your current project and its git repository. Discard unsaved changes and clone?"
                        description="Clone overwrite confirmation"
                        id="mw.git.empty.cloneConfirm"
                    />
                </p>
                <Box className={styles.rowButtons}>
                    <button
                        className={classNames(styles.button, styles.dangerButton)}
                        disabled={busy}
                        onClick={onClone}
                    >
                        <FormattedMessage
                            defaultMessage="Clone anyway"
                            description="Confirm clone button"
                            id="mw.git.empty.cloneAnyway"
                        />
                    </button>
                    <button
                        className={styles.button}
                        disabled={busy}
                        onClick={onCancelClone}
                    >
                        <FormattedMessage
                            defaultMessage="Cancel"
                            description="Cancel clone button"
                            id="mw.git.empty.cloneCancel"
                        />
                    </button>
                </Box>
            </Box>
        ) : (
            <p className={styles.muted}>
                <FormattedMessage
                    defaultMessage="Private repos use your token (Remote) and author name (Settings)."
                    description="Clone auth hint"
                    id="mw.git.empty.cloneHint"
                />
            </p>
        )}
    </Box>
);

ClonePanel.propTypes = {
    cloneUrl: PropTypes.string,
    onChangeCloneUrl: PropTypes.func,
    busy: PropTypes.bool,
    cloneConfirm: PropTypes.bool,
    onClone: PropTypes.func,
    onCancelClone: PropTypes.func
};

class GitModalComponent extends React.Component {
    constructor (props) {
        super(props);
        this.state = {currentView: takeGitModalInitialView() || 'changes'};
        this.handleNavigate = this.handleNavigate.bind(this);
        this.handleImportConfigClick = this.handleImportConfigClick.bind(this);
        this.handleChangeRowClick = this.handleChangeRowClick.bind(this);
        this.handleStopPropagation = this.handleStopPropagation.bind(this);
        this.handleStageToggle = this.handleStageToggle.bind(this);
        this.handleUnstageToggle = this.handleUnstageToggle.bind(this);
    }

    // Delegated handlers for the staging rows. Those rows are produced inside a
    // map, so a per-row arrow function would allocate a closure on every render
    // (and trip react/jsx-no-bind); the path travels in a data attribute
    // instead.
    handleChangeRowClick (e) {
        const filepath = e.currentTarget.getAttribute('data-filepath');
        if (filepath && this.props.onDiffChangedFile) {
            this.props.onDiffChangedFile(filepath);
        }
    }

    handleStopPropagation (e) {
        // Ticking a checkbox must not also open the file diff.
        e.stopPropagation();
    }

    handleStageToggle (e) {
        const filepath = e.currentTarget.getAttribute('data-filepath');
        if (filepath && this.props.onStageFile) {
            this.props.onStageFile(filepath);
        }
    }

    handleUnstageToggle (e) {
        const filepath = e.currentTarget.getAttribute('data-filepath');
        if (filepath && this.props.onUnstageFile) {
            this.props.onUnstageFile(filepath);
        }
    }

    handleNavigate (view) {
        this.setState({currentView: view});
        this.props.onClearDiff();
    }

    // Opens the hidden file picker used to import a repo config JSON.
    handleImportConfigClick () {
        if (this._configInput) {
            this._configInput.click();
        }
    }

    renderNotInitialized () {
        return (
            <Box className={styles.emptyState}>
                <GitCommit className={styles.emptyIcon} />
                <p>
                    <FormattedMessage
                        defaultMessage="This project isn't under version control yet."
                        description="Shown when no repository exists"
                        id="mw.git.empty.description"
                    />
                </p>
                <button
                    className={styles.primaryButton}
                    disabled={this.props.busy}
                    onClick={this.props.onInit}
                >
                    <FormattedMessage
                        defaultMessage="Initialize repository"
                        description="Init button"
                        id="mw.git.empty.init"
                    />
                </button>
                <div className={styles.emptyDivider}>
                    <FormattedMessage
                        defaultMessage="or clone an existing fractch project"
                        description="Divider between init and clone"
                        id="mw.git.empty.or"
                    />
                </div>
                <ClonePanel
                    cloneUrl={this.props.cloneUrl}
                    onChangeCloneUrl={this.props.onChangeCloneUrl}
                    busy={this.props.busy}
                    cloneConfirm={this.props.cloneConfirm}
                    onClone={this.props.onClone}
                    onCancelClone={this.props.onCancelClone}
                />
            </Box>
        );
    }

    // One row of the working-changes list. `checked` is the staging state: the
    // checkbox adds the path to the index, clearing it removes it again, so the
    // list is a real staging area rather than a decorative toggle.
    renderChangeRow (change, checked, toggleHandler) {
        const showArrow = Boolean(change.oldPath) && change.oldPath !== change.filepath;
        return (
            <li
                key={`${change.oldPath || ''}->${change.filepath}`}
                data-filepath={change.filepath}
                className={classNames(styles.fileRow, {
                    [styles.fileRowClickable]: /\.(fractch|svg|json|txt|md)$/i.test(change.filepath)
                })}
                onClick={this.handleChangeRowClick}
            >
                <input
                    type="checkbox"
                    className={styles.changeCheckbox}
                    checked={checked}
                    disabled={this.props.busy}
                    onClick={this.handleStopPropagation}
                    onChange={toggleHandler}
                    data-filepath={change.filepath}
                    aria-label={this.props.intl.formatMessage(
                        checked ? messages.unstageFile : messages.stageFile,
                        {filepath: change.filepath}
                    )}
                />
                <FileBadge description={change.description} />
                <span className={styles.filePath}>
                    {showArrow ? (
                        <>
                            <span className={styles.filePathOld}>{change.oldPath}</span>
                            <span className={styles.filePathArrow}>{'→'}</span>
                            {change.filepath}
                        </>
                    ) : change.filepath}
                </span>
            </li>
        );
    }

    // Working-tree sync banner: how far the checked-out branch has drifted from
    // its upstream. Rendered above the staging area so Push/Pull never has to be
    // guessed at.
    renderSyncStatus () {
        const {upstream, remotes, currentBranch, intl} = this.props;
        if (!upstream || !upstream.remote) {
            // No upstream configured yet. `branch.<name>.remote` / `.merge` are
            // only written by a push -u (or a clone), so a repository that has a
            // remote but has never been pushed reported "no upstream" and the
            // banner returned null — the "push once to start tracking it" hint
            // below was unreachable (test C5). Show it as soon as a remote and a
            // checked-out branch exist; the ref names what the push will create.
            const known = Array.isArray(remotes) ? remotes : [];
            if (known.length === 0 || !currentBranch) return null;
            return (
                <Box className={styles.syncBar}>
                    <span className={styles.syncText}>
                        {intl.formatMessage(messages.syncUntracked, {
                            ref: `${known[0].name}/${currentBranch}`
                        })}
                    </span>
                </Box>
            );
        }
        const ahead = Number(upstream.ahead) || 0;
        const behind = Number(upstream.behind) || 0;
        const ref = `${upstream.remote}/${upstream.branch || ''}`;
        let label;
        if (!upstream.tracking) {
            label = intl.formatMessage(messages.syncUntracked, {ref});
        } else if (ahead === 0 && behind === 0) {
            label = intl.formatMessage(messages.syncUpToDate, {ref});
        } else {
            label = intl.formatMessage(messages.syncDrift, {ref});
        }
        return (
            <Box className={styles.syncBar}>
                <span className={styles.syncText}>{label}</span>
                {ahead > 0 && (
                    <span className={classNames(styles.syncCount, styles.syncAhead)}>{`↑${ahead}`}</span>
                )}
                {behind > 0 && (
                    <span className={classNames(styles.syncCount, styles.syncBehind)}>{`↓${behind}`}</span>
                )}
            </Box>
        );
    }

    renderChanges () {
        const {changes} = this.props;
        const list = Array.isArray(changes) ? changes : [];
        const stagedEntries = list.filter(change => change.staged);
        const unstagedEntries = list.filter(change => change.unstaged);
        const hasChanges = list.length > 0;
        const canCommit = stagedEntries.length > 0;
        return (
            <Box className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <FormattedMessage
                        defaultMessage="Working changes"
                        description="Changes section heading"
                        id="mw.git.changes.heading"
                    />
                </h2>
                {this.renderSyncStatus()}
                <Box className={styles.commitTypeRow}>
                    <select
                        className={styles.commitTypeSelect}
                        value={this.props.commitType || 'feat'}
                        onChange={this.props.onChangeCommitType}
                        disabled={this.props.busy}
                        aria-label={this.props.intl.formatMessage({
                            defaultMessage: 'Commit type',
                            description: 'Commit type selector label',
                            id: 'mw.git.changes.typeLabel'
                        })}
                    >
                        {COMMIT_TYPES.map(t => (
                            <option
                                key={t.value}
                                value={t.value}
                            >
                                {`${t.value} · ${this.props.intl.formatMessage({
                                    id: t.messageId,
                                    defaultMessage: t.defaultMessage
                                })}`}
                            </option>
                        ))}
                    </select>
                    <textarea
                        className={styles.commitBox}
                        placeholder={this.props.intl.formatMessage({
                            defaultMessage: 'Describe your changes…',
                            description: 'Commit message placeholder',
                            id: 'mw.git.changes.placeholder'
                        })}
                        value={this.props.commitMessage}
                        onChange={this.props.onChangeCommitMessage}
                        disabled={this.props.busy}
                    />
                </Box>
                <Box className={styles.rowButtons}>
                    <button
                        className={styles.primaryButton}
                        disabled={this.props.busy || !canCommit}
                        onClick={this.props.onCommit}
                    >
                        <Check className={styles.buttonIcon} />
                        <FormattedMessage
                            defaultMessage="Commit"
                            description="Commit button"
                            id="mw.git.changes.commit"
                        />
                    </button>
                    <button
                        className={styles.button}
                        disabled={this.props.busy || !this.props.canUndoCommit}
                        onClick={this.props.onUndoCommit}
                    >
                        <RotateCcw className={styles.buttonIcon} />
                        <FormattedMessage
                            defaultMessage="Undo last commit"
                            description="Undo commit button"
                            id="mw.git.changes.undo"
                        />
                    </button>
                </Box>
                {hasChanges ? (
                    <>
                        {stagedEntries.length > 0 && (
                            <Box className={styles.changeGroup}>
                                <Box className={styles.changeGroupHeader}>
                                    <span className={styles.changeGroupTitle}>
                                        <FormattedMessage
                                            defaultMessage="Staged changes"
                                            description="Staged changes group heading"
                                            id="mw.git.changes.staged"
                                        />
                                        <span className={styles.changeCount}>{stagedEntries.length}</span>
                                    </span>
                                    <button
                                        className={styles.linkButton}
                                        disabled={this.props.busy}
                                        onClick={this.props.onUnstageAll}
                                    >
                                        <FormattedMessage
                                            defaultMessage="Unstage all"
                                            description="Unstage everything button"
                                            id="mw.git.changes.unstageAll"
                                        />
                                    </button>
                                </Box>
                                <ul className={styles.fileList}>
                                    {stagedEntries.map(change => this.renderChangeRow(
                                        change, true, this.handleUnstageToggle
                                    ))}
                                </ul>
                            </Box>
                        )}
                        {unstagedEntries.length > 0 && (
                            <Box className={styles.changeGroup}>
                                <Box className={styles.changeGroupHeader}>
                                    <span className={styles.changeGroupTitle}>
                                        <FormattedMessage
                                            defaultMessage="Changes"
                                            description="Unstaged changes group heading"
                                            id="mw.git.changes.unstaged"
                                        />
                                        <span className={styles.changeCount}>{unstagedEntries.length}</span>
                                    </span>
                                    <button
                                        className={styles.linkButton}
                                        disabled={this.props.busy}
                                        onClick={this.props.onStageAll}
                                    >
                                        <FormattedMessage
                                            defaultMessage="Stage all"
                                            description="Stage everything button"
                                            id="mw.git.changes.stageAll"
                                        />
                                    </button>
                                </Box>
                                <ul className={styles.fileList}>
                                    {unstagedEntries.map(change => this.renderChangeRow(
                                        change, false, this.handleStageToggle
                                    ))}
                                </ul>
                            </Box>
                        )}
                        {!canCommit && (
                            <p className={styles.muted}>
                                <FormattedMessage
                                    defaultMessage="Check files above to stage them, then commit."
                                    description="Hint shown when nothing is staged yet"
                                    id="mw.git.changes.nothingStaged"
                                />
                            </p>
                        )}
                    </>
                ) : (
                    <p className={styles.muted}>
                        <FormattedMessage
                            defaultMessage="No uncommitted changes."
                            description="No changes message"
                            id="mw.git.changes.none"
                        />
                    </p>
                )}
                {this.props.diffFilepath && this.props.diffContext === 'working' && (
                    <DiffViewer
                        diff={this.props.diffData}
                        loading={this.props.diffLoading}
                        filepath={this.props.diffFilepath}
                    />
                )}
                <Box className={styles.dangerZone}>
                    <h3 className={styles.subTitle}>
                        <FormattedMessage
                            defaultMessage="Danger zone"
                            description="Danger zone heading"
                            id="mw.git.settings.danger"
                        />
                    </h3>
                    <button
                        className={classNames(styles.button, styles.dangerButton)}
                        disabled={this.props.busy}
                        onClick={this.props.onDeleteRepo}
                    >
                        <Trash className={styles.buttonIcon} />
                        <FormattedMessage
                            defaultMessage="Delete repository"
                            description="Delete repo button"
                            id="mw.git.settings.deleteRepo"
                        />
                    </button>
                </Box>
            </Box>
        );
    }

    renderHistory () {
        const {intl, currentBranch, commitGraphLayout, graphRemoteBranches} = this.props;
        const remoteBranchSet = new Set(graphRemoteBranches || []);
        const layout = commitGraphLayout || {
            rows: [],
            lanesCount: 1,
            laneWidth: 16,
            dotRadius: 5,
            rowHeight: 42
        };
        const rows = Array.isArray(layout.rows) ? layout.rows : [];
        const hasCommits = rows.length > 0;
        const rowHeight = layout.rowHeight || 42;
        const laneWidth = layout.laneWidth || 16;
        const dotRadius = layout.dotRadius || 5;
        const lanesCount = Math.max(layout.lanesCount || 1, 1);
        const graphLeft = 10;
        const graphWidth = graphLeft + (lanesCount * laneWidth) + 10;
        const svgHeight = rows.length * rowHeight;
        const xOf = lane => graphLeft + (lane * laneWidth) + (laneWidth / 2);
        const yOf = index => (index * rowHeight) + (rowHeight / 2);

        // One background colour per lane: the first commit drawn on that lane
        // decides its hue, so parallel rails read as distinct tracks.
        const laneColors = [];
        for (let l = 0; l < lanesCount; l++) {
            const first = rows.find(r => r.lane === l);
            laneColors[l] = (first && first.color) || '#888';
        }
        return (
            <Box className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <FormattedMessage
                        defaultMessage="Commit history"
                        description="History section heading"
                        id="mw.git.history.heading"
                    />
                </h2>
                {hasCommits ? (
                    <div className={styles.historyWrap}>
                        <svg
                            className={styles.historyGraph}
                            width={graphWidth}
                            height={svgHeight}
                            aria-hidden="true"
                        >
                            {laneColors.map((color, l) => (
                                <line
                                    key={`rail-${l}`}
                                    x1={xOf(l)}
                                    y1={0}
                                    x2={xOf(l)}
                                    y2={svgHeight}
                                    stroke={color}
                                    strokeOpacity={0.3}
                                    strokeWidth={2}
                                />
                            ))}
                            {rows.map(row => {
                                const ySelf = yOf(row.index);
                                const xSelf = xOf(row.lane);
                                const isHead = Boolean(currentBranch) &&
                                    Array.isArray(row.branches) &&
                                    row.branches.indexOf(currentBranch) !== -1;
                                const isMerge = Array.isArray(row.parents) &&
                                    row.parents.length > 1;
                                const dotR = isHead ? dotRadius + 2.2 :
                                    (isMerge ? dotRadius + 0.6 : dotRadius - 0.5);
                                const dotColor = row.color || laneColors[row.lane] || '#888';
                                return (
                                    <g key={`g-${row.oid}`}>
                                        {(row.parents || []).map(p => {
                                            const yParent = p.index >= 0 ? yOf(p.index) : 0;
                                            const xParent = xOf(p.lane);
                                            const color = laneColors[p.lane] || dotColor;
                                            if (xParent === xSelf) {
                                                return (
                                                    <line
                                                        key={`e-${row.oid}-${p.oid}`}
                                                        x1={xSelf}
                                                        y1={yParent + dotRadius}
                                                        x2={xSelf}
                                                        y2={ySelf - dotRadius}
                                                        stroke={color}
                                                        strokeWidth={1.6}
                                                    />
                                                );
                                            }
                                            return (
                                                <path
                                                    key={`e-${row.oid}-${p.oid}`}
                                                    d={`M ${xParent} ${yParent + dotRadius} ` +
                                                        `V ${ySelf - dotRadius} H ${xSelf}`}
                                                    stroke={color}
                                                    strokeWidth={1.6}
                                                    fill="none"
                                                />
                                            );
                                        })}
                                        <circle
                                            cx={xSelf}
                                            cy={ySelf}
                                            r={dotR}
                                            fill={dotColor}
                                            stroke={isHead ? 'rgba(255,255,255,0.85)' : 'none'}
                                            strokeWidth={isHead ? 1.6 : 0}
                                        />
                                    </g>
                                );
                            })}
                        </svg>
                        <ul className={styles.commitList}>
                            {rows.map(row => {
                                const author = (row.commit && row.commit.author) || {};
                                const authorName = author.name || '';
                                const subject = row.commit && row.commit.message ?
                                    row.commit.message.split('\n')[0] : '';
                                const timestamp = author.timestamp || 0;
                                const selected = this.props.selectedCommitOid === row.oid;
                                // Detached-HEAD-only commits carry the virtual
                                // "(detached)" label; hide it from the chips.
                                const branchChips = (row.branches || [])
                                    .filter(b => b !== DETACHED_BRANCH);
                                const isHeadHere = Boolean(currentBranch) &&
                                    Array.isArray(row.branches) &&
                                    row.branches.indexOf(currentBranch) !== -1;
                                return (
                                    <li
                                        key={row.oid}
                                        className={classNames(styles.commitRow, {
                                            [styles.commitRowSelected]: selected
                                        })}
                                        onClick={() => this.props.onSelectCommit(row.oid)}
                                    >
                                        <div
                                            className={styles.commitMain}
                                            style={{paddingLeft: graphWidth}}
                                        >
                                            <div className={styles.commitMessageRow}>
                                                <span className={styles.commitMessage}>{subject}</span>
                                                {branchChips.length > 0 && (
                                                    <span className={styles.commitChips}>
                                                        {branchChips.map(b => (
                                                            <BranchChip
                                                                key={b}
                                                                name={b}
                                                                isRemote={remoteBranchSet.has(b)}
                                                                current={isHeadHere && b === currentBranch}
                                                            />
                                                        ))}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.commitMetaRow}>
                                                {authorName && (
                                                    <span className={styles.commitAuthor}>{authorName}</span>
                                                )}
                                                {authorName && (
                                                    <span className={styles.commitMetaSep}>{'·'}</span>
                                                )}
                                                <span className={styles.commitTime}>
                                                    {formatRelativeTime(intl, timestamp)}
                                                </span>
                                                <span className={styles.commitHash}>
                                                    {row.oid.slice(0, 7)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.commitActions}>
                                            <button
                                                className={styles.iconButton}
                                                data-oid={row.oid}
                                                disabled={this.props.busy}
                                                title={intl.formatMessage({
                                                    defaultMessage: 'Restore this commit',
                                                    description: 'Restore commit tooltip',
                                                    id: 'mw.git.history.restore'
                                                })}
                                                onClick={this.props.onRestoreCommit}
                                            >
                                                <RotateCcw className={styles.buttonIcon} />
                                            </button>
                                            <button
                                                className={styles.iconButton}
                                                data-oid={row.oid}
                                                disabled={this.props.busy}
                                                title={intl.formatMessage({
                                                    defaultMessage: 'Download as .sb3',
                                                    description: 'Download commit tooltip',
                                                    id: 'mw.git.history.download'
                                                })}
                                                onClick={this.props.onDownloadCommit}
                                            >
                                                <Download className={styles.buttonIcon} />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : (
                    <p className={styles.muted}>
                        <FormattedMessage
                            defaultMessage="No commits yet."
                            description="No commits message"
                            id="mw.git.history.none"
                        />
                    </p>
                )}
                {this.props.selectedCommitOid && this.renderCommitDetail()}
            </Box>
        );
    }

    renderCommitDetail () {
        const {commitGraphLayout, graphRemoteBranches, selectedCommitOid} = this.props;
        const remoteBranchSet = new Set(graphRemoteBranches || []);
        const layout = commitGraphLayout;
        const row = layout && Array.isArray(layout.rows) ?
            layout.rows.find(r => r.oid === selectedCommitOid) : null;
        if (!row) {
            return null;
        }
        const commit = row.commit || {};
        const author = commit.author || {};
        const committer = commit.committer || author;
        const fullMessage = commit.message || '';
        const subject = fullMessage.split('\n')[0] || '';
        const body = fullMessage.indexOf('\n') >= 0 ?
            fullMessage
                .split('\n')
                .slice(1)
                .join('\n')
                .trim() : '';
        const parentOids = (commit.parent && commit.parent.length ? commit.parent :
            (commit.parents || []));
        const files = Array.isArray(this.props.commitFiles) ? this.props.commitFiles : [];
        const authorEmail = author.email || '';
        const committerName = committer.name || author.name || '';
        const committerEmail = committer.email || authorEmail;
        // Hide the virtual "(detached)" branch label from the chips.
        const rowBranches = Array.isArray(row.branches) ?
            row.branches.filter(b => b !== DETACHED_BRANCH) : [];

        return (
            <Box className={styles.commitDetail}>
                <Box className={styles.detailHeader}>
                    <h3 className={styles.detailSubject}>{subject}</h3>
                    <code className={styles.detailHash}>{row.oid.slice(0, 7)}</code>
                </Box>
                {body && (
                    <pre className={styles.detailBody}>{body}</pre>
                )}
                <Box className={styles.detailGrid}>
                    <Box className={styles.detailRow}>
                        <span className={styles.detailLabel}>
                            <FormattedMessage
                                defaultMessage="Author"
                                description="Commit author label"
                                id="mw.git.history.detail.author"
                            />
                        </span>
                        <span className={styles.detailValue}>
                            {author.name || ''}{' '}
                            {authorEmail && (
                                <span className={styles.detailMuted}>{`<${authorEmail}>`}</span>
                            )}
                        </span>
                    </Box>
                    {committer && (committer.name || committer.email) &&
                        (committer.name !== author.name || committer.email !== authorEmail) && (
                        <Box className={styles.detailRow}>
                            <span className={styles.detailLabel}>
                                <FormattedMessage
                                    defaultMessage="Committer"
                                    description="Commit committer label"
                                    id="mw.git.history.detail.committer"
                                />
                            </span>
                            <span className={styles.detailValue}>
                                {committerName}{' '}
                                {committerEmail && (
                                    <span className={styles.detailMuted}>{`<${committerEmail}>`}</span>
                                )}
                            </span>
                        </Box>
                    )}
                    <Box className={styles.detailRow}>
                        <span className={styles.detailLabel}>
                            <FormattedMessage
                                defaultMessage="Date"
                                description="Commit date label"
                                id="mw.git.history.detail.committedAt"
                            />
                        </span>
                        <span className={styles.detailValue}>{formatYmdHms(author.timestamp || 0)}</span>
                    </Box>
                    <Box className={styles.detailRow}>
                        <span className={styles.detailLabel}>
                            {parentOids.length > 1 ? (
                                <FormattedMessage
                                    defaultMessage="Parents"
                                    description="Commit parents label (merge)"
                                    id="mw.git.history.detail.parents"
                                />
                            ) : (
                                <FormattedMessage
                                    defaultMessage="Parent"
                                    description="Commit parent label"
                                    id="mw.git.history.detail.parent"
                                />
                            )}
                        </span>
                        <span className={styles.detailValue}>
                            {parentOids.length === 0 ? (
                                <span className={styles.detailMuted}>
                                    <FormattedMessage
                                        defaultMessage="(root commit)"
                                        description="Shown for root commit"
                                        id="mw.git.history.detail.rootCommit"
                                    />
                                </span>
                            ) : (
                                parentOids.map(poid => (
                                    <code
                                        key={poid}
                                        className={classNames(styles.detailParent, styles.detailParentLink)}
                                        onClick={() => this.props.onSelectCommit(poid)}
                                    >{(poid || '').slice(0, 7)}</code>
                                ))
                            )}
                        </span>
                    </Box>
                    {rowBranches.length > 0 && (
                        <Box className={styles.detailRow}>
                            <span className={styles.detailLabel}>
                                <FormattedMessage
                                    defaultMessage="Branches"
                                    description="Branches label in commit detail"
                                    id="mw.git.history.detail.branches"
                                />
                            </span>
                            <span className={styles.detailValue}>
                                {rowBranches.map(b => (
                                    <BranchChip
                                        key={b}
                                        name={b}
                                        isRemote={remoteBranchSet.has(b)}
                                    />
                                ))}
                            </span>
                        </Box>
                    )}
                </Box>
                <Box className={styles.subSection}>
                    <h3 className={styles.subTitle}>
                        <FormattedMessage
                            defaultMessage="Files changed in this commit"
                            description="Commit files heading"
                            id="mw.git.history.files"
                        />
                    </h3>
                    {files.length ? (
                        <ul className={styles.fileList}>
                            {files.map(file => (
                                <li
                                    key={file.path}
                                    className={classNames(styles.fileRow, {
                                        [styles.fileRowClickable]: /\.(fractch|svg|json|txt|md)$/i.test(file.path)
                                    })}
                                    onClick={() => this.props.onDiffCommitFile(file.path)}
                                >
                                    <FileBadge
                                        filepath={file.path}
                                        description={file.type}
                                    />
                                    <span className={styles.filePath}>{file.path}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.muted}>
                            <FormattedMessage
                                defaultMessage="No file-level changes to show."
                                description="No commit file changes"
                                id="mw.git.history.noFiles"
                            />
                        </p>
                    )}
                    {this.props.diffFilepath && this.props.diffContext === 'commit' && (
                        <DiffViewer
                            diff={this.props.diffData}
                            loading={this.props.diffLoading}
                            filepath={this.props.diffFilepath}
                        />
                    )}
                </Box>
            </Box>
        );
    }

    renderBranches () {
        const {
            branches,
            currentBranch,
            graphRemoteBranches,
            mergeConflicts,
            mergeResolutions
        } = this.props;
        return (
            <Box className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <FormattedMessage
                        defaultMessage="Branches"
                        description="Branches section heading"
                        id="mw.git.branches.heading"
                    />
                </h2>
                <Box className={styles.field}>
                    <label className={styles.fieldLabel}>
                        <FormattedMessage
                            defaultMessage="Current branch"
                            description="Current branch label"
                            id="mw.git.branches.current"
                        />
                    </label>
                    <select
                        className={styles.select}
                        value={currentBranch || ''}
                        disabled={this.props.busy}
                        onChange={this.props.onCheckoutBranch}
                    >
                        {(branches || []).map(b => (
                            <option
                                key={b}
                                value={b}
                            >{b}</option>
                        ))}
                    </select>
                </Box>
                <Box className={styles.field}>
                    <label className={styles.fieldLabel}>
                        <FormattedMessage
                            defaultMessage="Create new branch"
                            description="New branch label"
                            id="mw.git.branches.new"
                        />
                    </label>
                    <Box className={styles.inlineForm}>
                        <input
                            className={styles.input}
                            type="text"
                            value={this.props.newBranchName}
                            onChange={this.props.onChangeNewBranchName}
                            disabled={this.props.busy}
                            placeholder="feature/my-branch"
                        />
                        <button
                            className={styles.button}
                            disabled={this.props.busy || !this.props.newBranchName.trim()}
                            onClick={this.props.onCreateBranch}
                        >
                            <Plus className={styles.buttonIcon} />
                            <FormattedMessage
                                defaultMessage="Create"
                                description="Create branch button"
                                id="mw.git.branches.create"
                            />
                        </button>
                    </Box>
                </Box>
                <ul className={styles.branchList}>
                    {(branches || []).map(b => {
                        const upstream = remoteUpstreamOf(graphRemoteBranches, b);
                        return (
                            <li
                                key={b}
                                className={styles.branchRow}
                            >
                                <span className={styles.filePath}>
                                    {b}
                                    {b === currentBranch && (
                                        <span className={styles.currentTag}>
                                            <FormattedMessage
                                                defaultMessage="current"
                                                description="Current branch tag"
                                                id="mw.git.branches.currentTag"
                                            />
                                        </span>
                                    )}
                                    {upstream && (
                                        <BranchChip
                                            name={upstream}
                                            isRemote
                                        />
                                    )}
                                </span>
                                {b !== currentBranch && (
                                    <button
                                        className={styles.iconButton}
                                        data-ref={b}
                                        disabled={this.props.busy}
                                        onClick={this.props.onDeleteBranch}
                                        title={this.props.intl.formatMessage({
                                            defaultMessage: 'Delete branch',
                                            description: 'Delete branch tooltip',
                                            id: 'mw.git.branches.delete'
                                        })}
                                    >
                                        <Trash className={styles.buttonIcon} />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
                {Array.isArray(graphRemoteBranches) && graphRemoteBranches.length > 0 && (
                    <Box className={styles.subSection}>
                        <h3 className={styles.subTitle}>
                            <Cloud className={styles.buttonIcon} />
                            <FormattedMessage
                                defaultMessage="Remote branches"
                                description="Remote branches heading"
                                id="mw.git.branches.remoteHeading"
                            />
                        </h3>
                        <p className={styles.muted}>
                            <FormattedMessage
                                defaultMessage="Fetched from your remotes (read-only). Pull or push keeps them in sync."
                                description="Explains the remote branches list"
                                id="mw.git.branches.remoteHint"
                            />
                        </p>
                        <ul className={styles.branchList}>
                            {graphRemoteBranches.map(rb => (
                                <li
                                    key={rb}
                                    className={styles.branchRow}
                                >
                                    <BranchChip
                                        name={rb}
                                        isRemote
                                    />
                                    <span className={styles.readOnlyTag}>
                                        <FormattedMessage
                                            defaultMessage="read-only"
                                            description="Read-only tag for remote branches"
                                            id="mw.git.branches.readOnly"
                                        />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Box>
                )}
                <Box className={styles.subSection}>
                    <h3 className={styles.subTitle}>
                        <GitMerge className={styles.buttonIcon} />
                        <FormattedMessage
                            defaultMessage="Merge"
                            description="Merge heading"
                            id="mw.git.branches.merge"
                        />
                    </h3>
                    <Box className={styles.inlineForm}>
                        <select
                            className={styles.select}
                            value={this.props.mergeSourceBranch}
                            disabled={this.props.busy}
                            onChange={this.props.onChangeMergeSourceBranch}
                        >
                            <option value="">
                                {this.props.intl.formatMessage({
                                    defaultMessage: 'Merge from…',
                                    description: 'Merge source placeholder',
                                    id: 'mw.git.branches.mergeFrom'
                                })}
                            </option>
                            {(branches || []).filter(b => b !== currentBranch).map(b => (
                                <option
                                    key={b}
                                    value={b}
                                >{b}</option>
                            ))}
                        </select>
                        <button
                            className={styles.button}
                            disabled={this.props.busy || !this.props.mergeSourceBranch}
                            onClick={this.props.onPreviewMerge}
                        >
                            <FormattedMessage
                                defaultMessage="Preview"
                                description="Preview merge button"
                                id="mw.git.branches.preview"
                            />
                        </button>
                    </Box>
                    {Array.isArray(mergeConflicts) && mergeConflicts.length > 0 && (
                        <Box className={styles.conflicts}>
                            <p className={styles.muted}>
                                <FormattedMessage
                                    defaultMessage="Resolve conflicts by choosing a side for each file:"
                                    description="Conflict resolution instructions"
                                    id="mw.git.branches.conflictHelp"
                                />
                            </p>
                            {mergeConflicts.map(path => (
                                <Box
                                    key={path}
                                    className={styles.conflictRow}
                                >
                                    <span className={styles.filePath}>{path}</span>
                                    <Box className={styles.rowButtons}>
                                        <button
                                            className={classNames(styles.chip, {
                                                [styles.chipActive]: mergeResolutions[path] === 'ours'
                                            })}
                                            onClick={() => this.props.onSetMergeResolution(path, 'ours')}
                                        >
                                            <FormattedMessage
                                                defaultMessage="Ours"
                                                description="Keep our version"
                                                id="mw.git.branches.ours"
                                            />
                                        </button>
                                        <button
                                            className={classNames(styles.chip, {
                                                [styles.chipActive]: mergeResolutions[path] === 'theirs'
                                            })}
                                            onClick={() => this.props.onSetMergeResolution(path, 'theirs')}
                                        >
                                            <FormattedMessage
                                                defaultMessage="Theirs"
                                                description="Keep their version"
                                                id="mw.git.branches.theirs"
                                            />
                                        </button>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                    {this.props.mergeSourceBranch && (
                        <Box className={styles.rowButtons}>
                            <button
                                className={styles.primaryButton}
                                disabled={this.props.busy}
                                onClick={this.props.onApplyMerge}
                            >
                                <FormattedMessage
                                    defaultMessage="Apply merge"
                                    description="Apply merge button"
                                    id="mw.git.branches.apply"
                                />
                            </button>
                            <button
                                className={styles.button}
                                disabled={this.props.busy}
                                onClick={this.props.onResolveInEditor}
                            >
                                <FormattedMessage
                                    defaultMessage="Resolve in editor"
                                    description="Button that opens conflicts in the Fractch code editor"
                                    id="mw.git.branches.resolveInEditor"
                                />
                            </button>
                        </Box>
                    )}
                </Box>
            </Box>
        );
    }

    renderDiff () {
        const {changes} = this.props;
        const diffableChanges = (Array.isArray(changes) ? changes : [])
            .filter(change => /\.(fractch|svg|json|txt|md)$/i.test(change.filepath));
        const hasDiffable = diffableChanges.length > 0;
        return (
            <Box className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <FormattedMessage
                        defaultMessage="Diff"
                        description="Diff section heading"
                        id="mw.git.diff.heading"
                    />
                </h2>
                <p className={styles.muted}>
                    <FormattedMessage
                        defaultMessage="Working tree vs. last commit. Select a file to view its readable fractch diff."
                        description="Diff section explanation"
                        id="mw.git.diff.explain"
                    />
                </p>
                {hasDiffable ? (
                    <ul className={styles.fileList}>
                        {diffableChanges.map(change => (
                            <li
                                key={change.filepath}
                                className={classNames(styles.fileRow, styles.fileRowClickable, {
                                    [styles.commitRowSelected]: this.props.diffFilepath === change.filepath &&
                                        this.props.diffContext === 'working'
                                })}
                                onClick={() => this.props.onDiffChangedFile(change.filepath)}
                            >
                                <FileBadge
                                    filepath={change.filepath}
                                    description={change.description}
                                />
                                <span className={styles.filePath}>{change.filepath}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={styles.muted}>
                        <FormattedMessage
                            defaultMessage="No uncommitted changes to diff."
                            description="Diff empty state"
                            id="mw.git.diff.none"
                        />
                    </p>
                )}
                {this.props.diffContext === 'working' && this.props.diffFilepath && (
                    <DiffViewer
                        diff={this.props.diffData}
                        loading={this.props.diffLoading}
                        filepath={this.props.diffFilepath}
                    />
                )}
            </Box>
        );
    }

    renderRemote () {
        const {remotes} = this.props;
        return (
            <Box className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <FormattedMessage
                        defaultMessage="Remotes"
                        description="Remote section heading"
                        id="mw.git.remote.heading"
                    />
                </h2>
                {remotes && remotes.length > 0 ? (
                    <ul className={styles.remoteList}>
                        {remotes.map(remote => (
                            <li
                                key={remote.name}
                                className={styles.remoteRow}
                            >
                                <Cloud className={styles.remoteIcon} />
                                <div className={styles.remoteInfo}>
                                    <span className={styles.remoteName}>{remote.name}</span>
                                    <span className={styles.remoteUrl}>{remote.url}</span>
                                </div>
                                <button
                                    className={styles.iconButton}
                                    data-name={remote.name}
                                    disabled={this.props.busy}
                                    onClick={this.props.onRemoveRemote}
                                    title={this.props.intl.formatMessage({
                                        defaultMessage: 'Remove remote',
                                        description: 'Remove remote tooltip',
                                        id: 'mw.git.remote.remove'
                                    })}
                                >
                                    <Trash className={styles.buttonIcon} />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className={styles.remoteEmpty}>
                        <Cloud className={styles.remoteEmptyIcon} />
                        <FormattedMessage
                            defaultMessage="No remotes yet. Add one below to push your project."
                            description="No remotes message"
                            id="mw.git.remote.none"
                        />
                    </div>
                )}
                <Box className={styles.field}>
                    <label className={styles.fieldLabel}>
                        <FormattedMessage {...messages.remoteService} />
                    </label>
                    <select
                        className={styles.select}
                        value={this.props.remoteService}
                        onChange={this.props.onChangeRemoteService}
                    >
                        <option value="">
                            {this.props.intl.formatMessage(messages.remoteServicePlaceholder)}
                        </option>
                        <option value="github">GitHub</option>
                        <option value="gitlab">GitLab</option>
                        <option value="gitee">Gitee</option>
                        <option value="other">
                            {this.props.intl.formatMessage(messages.serviceOther)}
                        </option>
                    </select>
                </Box>
                <Box className={styles.field}>
                    <label className={styles.fieldLabel}>
                        <FormattedMessage
                            defaultMessage="Add remote"
                            description="Add remote label"
                            id="mw.git.remote.add"
                        />
                    </label>
                    <Box className={styles.inlineForm}>
                        <input
                            className={styles.inputSmall}
                            type="text"
                            value={this.props.newRemoteName}
                            onChange={this.props.onChangeNewRemoteName}
                            disabled={this.props.busy}
                            placeholder="origin"
                        />
                        <input
                            className={styles.input}
                            type="text"
                            value={this.props.newRemoteUrl}
                            onChange={this.props.onChangeNewRemoteUrl}
                            disabled={this.props.busy}
                            placeholder="https://github.com/user/repo.git"
                        />
                        <button
                            className={styles.button}
                            disabled={this.props.busy}
                            onClick={this.props.onAddRemote}
                        >
                            <Plus className={styles.buttonIcon} />
                        </button>
                    </Box>
                </Box>
                <Box className={styles.field}>
                    <label className={styles.fieldLabel}>
                        <FormattedMessage
                            defaultMessage="Personal access token (PAT)"
                            description="Token label for Personal Access Token"
                            id="mw.git.remote.token"
                        />
                    </label>
                    <input
                        className={styles.input}
                        type="password"
                        value={this.props.remoteToken}
                        onChange={this.props.onChangeRemoteToken}
                        placeholder={this.props.intl.formatMessage(messages.tokenPlaceholder)}
                    />
                    <p className={styles.muted}>
                        <FormattedMessage
                            defaultMessage="Personal access token for authentication when pushing or cloning."
                            description="Explains how to use a PAT"
                            id="mw.git.remote.tokenHelp"
                        />
                    </p>
                    <a
                        className={styles.remoteLink}
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FormattedMessage {...messages.githubTokenLink} />
                        {' →'}
                    </a>
                </Box>
                <Box className={styles.field}>
                    <label className={styles.fieldLabel}>
                        <FormattedMessage
                            defaultMessage="Push a branch"
                            description="Push branch label"
                            id="mw.git.remote.pushBranch"
                        />
                    </label>
                    <Box className={styles.inlineForm}>
                        <select
                            className={styles.select}
                            value={this.props.pushRemote}
                            disabled={this.props.busy || !remotes || remotes.length === 0}
                            onChange={this.props.onChangePushRemote}
                        >
                            {(!remotes || remotes.length === 0) && (
                                <option value="">
                                    {this.props.intl.formatMessage({
                                        defaultMessage: 'No remotes',
                                        description: 'Placeholder when no remotes exist',
                                        id: 'mw.git.remote.noneOption'
                                    })}
                                </option>
                            )}
                            {(remotes || []).map(remote => (
                                <option
                                    key={remote.name}
                                    value={remote.name}
                                >{remote.name}</option>
                            ))}
                        </select>
                        <select
                            className={styles.select}
                            value={this.props.pushBranch || ''}
                            disabled={this.props.busy}
                            onChange={this.props.onChangePushBranch}
                        >
                            {(this.props.branches || []).map(b => (
                                <option
                                    key={b}
                                    value={b}
                                >{b}</option>
                            ))}
                        </select>
                        <button
                            className={styles.primaryButton}
                            disabled={this.props.busy || !remotes || remotes.length === 0 || !this.props.pushBranch}
                            onClick={this.props.onPush}
                        >
                            <Upload className={styles.buttonIcon} />
                            <FormattedMessage
                                defaultMessage="Push"
                                description="Push button"
                                id="mw.git.remote.push"
                            />
                        </button>
                    </Box>
                    <p className={styles.muted}>
                        <FormattedMessage
                            // eslint-disable-next-line max-len
                            defaultMessage="Creates the branch on the remote and sets it as upstream (like git push -u)."
                            description="Push help text"
                            id="mw.git.remote.pushHelp"
                        />
                    </p>
                </Box>
                <Box className={styles.field}>
                    <label className={styles.fieldLabel}>
                        <FormattedMessage
                            defaultMessage="Pull into current branch"
                            description="Pull field label"
                            id="mw.git.remote.pullBranch"
                        />
                    </label>
                    <Box className={styles.inlineForm}>
                        <select
                            className={styles.select}
                            value={this.props.pushRemote}
                            disabled={this.props.busy || !remotes || remotes.length === 0}
                            onChange={this.props.onChangePushRemote}
                        >
                            {(!remotes || remotes.length === 0) && (
                                <option value="">
                                    {this.props.intl.formatMessage({
                                        defaultMessage: 'No remotes',
                                        description: 'Placeholder when no remotes exist',
                                        id: 'mw.git.remote.noneOption'
                                    })}
                                </option>
                            )}
                            {(remotes || []).map(remote => (
                                <option
                                    key={remote.name}
                                    value={remote.name}
                                >{remote.name}</option>
                            ))}
                        </select>
                        {this.props.currentBranch ? (
                            <BranchChip
                                name={this.props.currentBranch}
                                current
                            />
                        ) : (
                            <span className={styles.muted}>
                                <FormattedMessage
                                    defaultMessage="no branch (detached HEAD)"
                                    description="Shown when HEAD is detached so pull is impossible"
                                    id="mw.git.remote.noBranch"
                                />
                            </span>
                        )}
                        <button
                            className={styles.primaryButton}
                            disabled={this.props.busy || !remotes || remotes.length === 0 ||
                                !this.props.currentBranch}
                            onClick={this.props.onPull}
                        >
                            <Download className={styles.buttonIcon} />
                            <FormattedMessage
                                defaultMessage="Pull"
                                description="Pull button"
                                id="mw.git.remote.pull"
                            />
                        </button>
                    </Box>
                    <p className={styles.muted}>
                        <FormattedMessage
                            // eslint-disable-next-line max-len
                            defaultMessage="Fetches from the remote and fast-forwards your current branch (git pull). Needs a checked-out local branch."
                            description="Pull help text"
                            id="mw.git.remote.pullHelp"
                        />
                    </p>
                </Box>
                <Box className={styles.field}>
                    <label className={styles.fieldLabel}>
                        <FormattedMessage
                            defaultMessage="Fetch from remote"
                            description="Fetch field label"
                            id="mw.git.remote.fetchLabel"
                        />
                    </label>
                    <Box className={styles.inlineForm}>
                        <select
                            className={styles.select}
                            value={this.props.pushRemote}
                            disabled={this.props.busy || !remotes || remotes.length === 0}
                            onChange={this.props.onChangePushRemote}
                        >
                            {(!remotes || remotes.length === 0) && (
                                <option value="">
                                    {this.props.intl.formatMessage({
                                        defaultMessage: 'No remotes',
                                        description: 'Placeholder when no remotes exist',
                                        id: 'mw.git.remote.noneOption'
                                    })}
                                </option>
                            )}
                            {(remotes || []).map(remote => (
                                <option
                                    key={remote.name}
                                    value={remote.name}
                                >{remote.name}</option>
                            ))}
                        </select>
                        <button
                            className={styles.primaryButton}
                            disabled={this.props.busy || !remotes || remotes.length === 0}
                            onClick={this.props.onFetch}
                        >
                            <RefreshCcw className={styles.buttonIcon} />
                            <FormattedMessage
                                defaultMessage="Fetch"
                                description="Fetch button"
                                id="mw.git.remote.fetch"
                            />
                        </button>
                    </Box>
                    <p className={styles.muted}>
                        <FormattedMessage
                            // eslint-disable-next-line max-len
                            defaultMessage={'Downloads remote branches and tags without touching your project (like git fetch). New origin/… refs then show up in History and Branches.'}
                            description="Fetch help text"
                            id="mw.git.remote.fetchHelp"
                        />
                    </p>
                </Box>
                <Box className={styles.subSection}>
                    <h3 className={styles.subTitle}>
                        <FormattedMessage
                            defaultMessage="Clone another repository"
                            description="Remote clone heading"
                            id="mw.git.remote.cloneHeading"
                        />
                    </h3>
                    <p className={styles.muted}>
                        <FormattedMessage
                            // eslint-disable-next-line max-len
                            defaultMessage="Open a different project from a remote URL, like switching repositories in an IDE. The current project's own history stays inside its .sb3 file."
                            description="Remote clone explanation"
                            id="mw.git.remote.cloneHelp"
                        />
                    </p>
                    <ClonePanel
                        cloneUrl={this.props.cloneUrl}
                        onChangeCloneUrl={this.props.onChangeCloneUrl}
                        busy={this.props.busy}
                        cloneConfirm={this.props.cloneConfirm}
                        onClone={this.props.onClone}
                        onCancelClone={this.props.onCancelClone}
                    />
                </Box>
                <Box className={styles.subSection}>
                    <h3 className={styles.subTitle}>
                        <FormattedMessage
                            defaultMessage="Repository config"
                            description="Repo config heading"
                            id="mw.git.remote.configHeading"
                        />
                    </h3>
                    <p className={styles.muted}>
                        <FormattedMessage
                            // eslint-disable-next-line max-len
                            defaultMessage="Export this repository's remotes, author and default branch as a .json file, then import it in any other repository (or another machine) to reuse the same setup without re-typing URLs."
                            description="Repo config explanation"
                            id="mw.git.remote.configHelp"
                        />
                    </p>
                    <Box className={styles.inlineForm}>
                        <button
                            className={styles.button}
                            disabled={this.props.busy}
                            onClick={this.props.onExportRepoConfig}
                        >
                            <Download className={styles.buttonIcon} />
                            <FormattedMessage
                                defaultMessage="Export config"
                                description="Export config button"
                                id="mw.git.remote.configExport"
                            />
                        </button>
                        <button
                            className={styles.button}
                            disabled={this.props.busy}
                            onClick={this.handleImportConfigClick}
                        >
                            <Upload className={styles.buttonIcon} />
                            <FormattedMessage
                                defaultMessage="Import config…"
                                description="Import config button"
                                id="mw.git.remote.configImport"
                            />
                        </button>
                        <input
                            ref={el => {
                                this._configInput = el;
                            }}
                            className={styles.hiddenInput}
                            type="file"
                            accept=".json,application/json"
                            onChange={this.props.onImportRepoConfig}
                        />
                    </Box>
                </Box>
            </Box>
        );
    }

    renderReadme () {
        return (
            <Box className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <FileText className={styles.buttonIcon} />
                    <FormattedMessage
                        defaultMessage="Project README"
                        description="Readme section heading"
                        id="mw.git.readme.heading"
                    />
                </h2>
                <p className={styles.muted}>
                    <FormattedMessage
                        // eslint-disable-next-line max-len
                        defaultMessage="Saved as README.md in the repo. It commits, clones, and travels inside the .sb3 with your project."
                        description="Readme explanation"
                        id="mw.git.readme.explain"
                    />
                </p>
                <textarea
                    className={styles.readmeBox}
                    value={this.props.readmeContent}
                    onChange={this.props.onChangeReadme}
                    disabled={this.props.busy}
                    placeholder={this.props.intl.formatMessage(messages.readmePlaceholder)}
                />
                <Box className={styles.rowButtons}>
                    <button
                        className={styles.primaryButton}
                        disabled={this.props.busy || !this.props.readmeDirty}
                        onClick={this.props.onSaveReadme}
                    >
                        <Check className={styles.buttonIcon} />
                        <FormattedMessage
                            defaultMessage="Save README"
                            description="Save readme button"
                            id="mw.git.readme.save"
                        />
                    </button>
                </Box>
            </Box>
        );
    }

    renderContent () {
        if (!this.props.initialized) {
            return this.renderNotInitialized();
        }
        switch (this.state.currentView) {
        case 'readme':
            return this.renderReadme();
        case 'history':
            return this.renderHistory();
        case 'branches':
            return this.renderBranches();
        case 'diff':
            return this.renderDiff();
        case 'remote':
            return this.renderRemote();
        case 'changes':
        default:
            return this.renderChanges();
        }
    }

    render () {
        const {intl} = this.props;
        const categories = [
            {id: 'changes', label: intl.formatMessage(messages.changes), icon: GitCommit},
            {id: 'history', label: intl.formatMessage(messages.history), icon: History},
            {id: 'branches', label: intl.formatMessage(messages.branches), icon: GitBranch},
            {id: 'diff', label: intl.formatMessage(messages.diff), icon: FileDiff},
            ...(!isScratchDesktop() ? [
                {id: 'remote', label: intl.formatMessage(messages.remote), icon: Cloud}
            ] : []),
            {id: 'readme', label: intl.formatMessage(messages.readme), icon: FileText}
        ];

        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onClose}
                contentLabel={intl.formatMessage(messages.title)}
                id="gitModal"
                width={880}
                height={560}
            >
                <ModalSidebarLayout>
                    <ModalSidebar
                        ariaLabel={intl.formatMessage(messages.sidebarAriaLabel)}
                        width="narrow"
                        footer={
                            <ModalSidebarFooter>
                                <button
                                    className={classNames(styles.button, styles.sidebarRefresh)}
                                    disabled={this.props.busy}
                                    onClick={this.props.onRefresh}
                                    type="button"
                                >
                                    <RefreshCcw className={styles.buttonIcon} />
                                    <FormattedMessage
                                        defaultMessage="Refresh"
                                        description="Refresh button"
                                        id="mw.git.refresh"
                                    />
                                </button>
                            </ModalSidebarFooter>
                        }
                    >
                        {categories.map(cat => (
                            <ModalSidebarItem
                                key={cat.id}
                                icon={cat.icon}
                                label={cat.label}
                                selected={this.state.currentView === cat.id}
                                onClick={() => this.handleNavigate(cat.id)}
                            />
                        ))}
                    </ModalSidebar>
                    <ModalSidebarContent className={styles.contentArea}>
                        {this.props.busy && (
                            <Box className={styles.busyBar}>
                                <span>{this.props.busyMessage || intl.formatMessage(messages.working)}</span>
                                {typeof this.props.busyProgress === 'number' && (
                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.progressBarFill}
                                            style={{width: `${Math.round(this.props.busyProgress * 100)}%`}}
                                        />
                                    </div>
                                )}
                            </Box>
                        )}
                        {/* A3: failures are toasted in the bottom-right corner
                            from the container, not drawn here — the File menu
                            reports through the same channel now. */}
                        {this.props.detached && !this.props.busy && (
                            <Box className={styles.detachedBar}>
                                <span className={styles.detachedText}>
                                    <FormattedMessage
                                        defaultMessage={
                                            'Detached HEAD: you are not on any branch, so commits here ' +
                                            'cannot be pushed. Switch back to a branch to continue.'
                                        }
                                        description="Warning shown while HEAD is detached"
                                        id="mw.git.detached.banner"
                                    />
                                </span>
                                <select
                                    className={styles.detachedSelect}
                                    value=""
                                    disabled={this.props.busy || (this.props.branches || []).length === 0}
                                    onChange={this.props.onCheckoutBranch}
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        {intl.formatMessage({
                                            defaultMessage: 'Switch to branch…',
                                            description: 'Detached banner branch picker placeholder',
                                            id: 'mw.git.detached.pick'
                                        })}
                                    </option>
                                    {(this.props.branches || []).map(b => (
                                        <option
                                            key={b}
                                            value={b}
                                        >{b}</option>
                                    ))}
                                </select>
                            </Box>
                        )}
                        {this.props.success && !this.props.busy && (
                            <Box
                                className={styles.successBar}
                                role="status"
                            >{this.props.success}</Box>
                        )}
                        {this.renderContent()}
                    </ModalSidebarContent>
                </ModalSidebarLayout>
            </Modal>
        );
    }
}

GitModalComponent.propTypes = {
    intl: intlShape,
    busy: PropTypes.bool,
    busyMessage: PropTypes.string,
    busyProgress: PropTypes.number,
    success: PropTypes.string,
    initialized: PropTypes.bool,
    currentBranch: PropTypes.string,
    detached: PropTypes.bool,
    branches: PropTypes.arrayOf(PropTypes.string),
    commits: PropTypes.arrayOf(PropTypes.object),
    graphNodes: PropTypes.arrayOf(PropTypes.object),
    graphBranchLogs: PropTypes.arrayOf(PropTypes.object),
    graphRemoteBranches: PropTypes.arrayOf(PropTypes.string),
    commitGraphLayout: PropTypes.shape({
        rows: PropTypes.arrayOf(PropTypes.object),
        lanesCount: PropTypes.number,
        laneWidth: PropTypes.number,
        dotRadius: PropTypes.number,
        rowHeight: PropTypes.number
    }),
    commitMessage: PropTypes.string,
    commitType: PropTypes.string,
    onChangeCommitType: PropTypes.func,
    newBranchName: PropTypes.string,
    mergeSourceBranch: PropTypes.string,
    onResolveInEditor: PropTypes.func,
    mergeConflicts: PropTypes.arrayOf(PropTypes.string),
    mergeResolutions: PropTypes.object,
    canUndoCommit: PropTypes.bool,
    changes: PropTypes.arrayOf(PropTypes.object),
    upstream: PropTypes.shape({
        remote: PropTypes.string,
        branch: PropTypes.string,
        tracking: PropTypes.bool,
        ahead: PropTypes.number,
        behind: PropTypes.number
    }),
    remotes: PropTypes.arrayOf(PropTypes.object),
    newRemoteName: PropTypes.string,
    newRemoteUrl: PropTypes.string,
    pushRemote: PropTypes.string,
    pushBranch: PropTypes.string,
    remoteToken: PropTypes.string,
    remoteService: PropTypes.string,
    onChangeRemoteService: PropTypes.func,
    diffLoading: PropTypes.bool,
    diffFilepath: PropTypes.string,
    diffData: PropTypes.object,
    diffContext: PropTypes.string,
    selectedCommitOid: PropTypes.string,
    commitFiles: PropTypes.arrayOf(PropTypes.object),
    readmeContent: PropTypes.string,
    readmeDirty: PropTypes.bool,
    onChangeReadme: PropTypes.func,
    onSaveReadme: PropTypes.func,
    cloneUrl: PropTypes.string,
    cloneConfirm: PropTypes.bool,
    onChangeCloneUrl: PropTypes.func,
    onClone: PropTypes.func,
    onCancelClone: PropTypes.func,
    onChangeCommitMessage: PropTypes.func,
    onChangeNewBranchName: PropTypes.func,
    onCheckoutBranch: PropTypes.func,
    onCreateBranch: PropTypes.func,
    onCommit: PropTypes.func,
    onUndoCommit: PropTypes.func,
    onStageFile: PropTypes.func,
    onUnstageFile: PropTypes.func,
    onStageAll: PropTypes.func,
    onUnstageAll: PropTypes.func,
    onInit: PropTypes.func,
    onRefresh: PropTypes.func,
    onRestoreCommit: PropTypes.func,
    onDownloadCommit: PropTypes.func,
    onDeleteRepo: PropTypes.func,
    onDeleteBranch: PropTypes.func,
    onChangeMergeSourceBranch: PropTypes.func,
    onPreviewMerge: PropTypes.func,
    onSetMergeResolution: PropTypes.func,
    onApplyMerge: PropTypes.func,
    onDiffChangedFile: PropTypes.func,
    onSelectCommit: PropTypes.func,
    onDiffCommitFile: PropTypes.func,
    onClearDiff: PropTypes.func,
    onChangeNewRemoteName: PropTypes.func,
    onChangeNewRemoteUrl: PropTypes.func,
    onChangePushRemote: PropTypes.func,
    onChangePushBranch: PropTypes.func,
    onChangeRemoteToken: PropTypes.func,
    onAddRemote: PropTypes.func,
    onRemoveRemote: PropTypes.func,
    onPush: PropTypes.func,
    onPull: PropTypes.func,
    onFetch: PropTypes.func,
    onExportRepoConfig: PropTypes.func,
    onImportRepoConfig: PropTypes.func,
    onClose: PropTypes.func
};

export default injectIntl(GitModalComponent);

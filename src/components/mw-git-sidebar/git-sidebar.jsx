import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';
import {
    ChevronDown,
    ChevronRight,
    Cloud,
    ExternalLink,
    GitBranch,
    History,
    ListChecks,
    Network,
    RefreshCw
} from 'lucide-react';

import ops from '../../lib/git/ops/index.js';
import gitStore from '../../lib/git/state/store.js';
import {hasChanges as hasChangesSelector} from '../../lib/git/state/selectors.js';
import {DETACHED_BRANCH} from '../../lib/git/graph-layout.js';

import styles from './git-sidebar.css';

// ---------------------------------------------------------------------------
// Time / repo date helpers — mirror git-modal.jsx so both surfaces show the
// same formatted time for the same commit.
// ---------------------------------------------------------------------------
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
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - ts);
    const oneMin = 60;
    const oneHour = 60 * oneMin;
    const oneDay = 24 * oneHour;
    const oneMonth = 30 * oneDay;
    const oneYear = 365 * oneDay;
    let key;
    let value = 0;
    if (diff < oneMin) {
        key = 'second';
        value = diff;
        if (value < 1) value = 1;
    } else if (diff < oneHour) {
        key = 'minute';
        value = Math.floor(diff / oneMin);
    } else if (diff < oneDay) {
        key = 'hour';
        value = Math.floor(diff / oneHour);
    } else if (diff < oneMonth) {
        key = 'day';
        value = Math.floor(diff / oneDay);
    } else if (diff < oneYear) {
        key = 'month';
        value = Math.floor(diff / oneMonth);
    } else {
        key = 'year';
        value = Math.floor(diff / oneYear);
    }
    return intl.formatRelativeTime(-value, key, {numeric: 'auto'});
};

// Branch-label chip. Mirrors the modal's BranchChip — local blue,
// remote-tracking purple, detached-HEAD branches hidden.
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

// ---------------------------------------------------------------------------
// Collapsible section — VS-Code style label + ChevronDown/Right.
// ---------------------------------------------------------------------------
const Section = ({title, collapsed, onToggle, icon, children, titleClass}) => (
    <div className={styles.section}>
        <button
            type="button"
            onClick={onToggle}
            className={classNames(styles.sectionHeader, titleClass)}
        >
            {collapsed
                ? <ChevronRight size={12} className={styles.triangle} />
                : <ChevronDown size={12} className={styles.triangle} />}
            {icon}
            <span className={styles.sectionTitle}>{title}</span>
        </button>
        {!collapsed && <div className={styles.sectionBody}>{children}</div>}
    </div>
);
Section.propTypes = {
    title: PropTypes.node.isRequired,
    collapsed: PropTypes.bool,
    onToggle: PropTypes.func.isRequired,
    icon: PropTypes.node,
    children: PropTypes.node,
    titleClass: PropTypes.string
};

// ---------------------------------------------------------------------------
// Row colouring (M/A/D/R letter in a coloured square badge). Mirrors modal
// so the sidebar and modal read the same "M/A/D/U/R" letters.
// ---------------------------------------------------------------------------
const changeTypeClass = description => {
    switch (description) {
    case 'untracked':
    case 'added':
        return styles.badgeAdd;
    case 'deleted':
        return styles.badgeDelete;
    case 'renamed':
        return styles.badgeRename;
    default:
        return styles.badgeModify;
    }
};
const FileBadge = ({description}) => {
    const letter = description && description[0] ? description[0].toUpperCase() : '?';
    return <span className={classNames(styles.badge, changeTypeClass(description))}>{letter}</span>;
};
FileBadge.propTypes = {description: PropTypes.string};

// ---------------------------------------------------------------------------
// Commits list — same layout as modal History view: SVG graph on the left,
// subject + branch chips on row, author · time · hash under.
// ---------------------------------------------------------------------------
const CommitGraph = ({rows, currentBranch, remoteBranchSet}) => {
    if (!rows || rows.length === 0) return null;
    const rowHeight = 36;
    const laneWidth = 14;
    const dotRadius = 4.5;
    const lanesCount = Math.max(rows.reduce((m, r) => Math.max(m, (r.lane || 0) + 1), 1), 1);
    const graphLeft = 6;
    const graphWidth = graphLeft + (lanesCount * laneWidth) + 6;
    const svgHeight = rows.length * rowHeight;
    const xOf = lane => graphLeft + (lane * laneWidth) + (laneWidth / 2);
    const yOf = index => (index * rowHeight) + (rowHeight / 2);
    const laneColors = [];
    for (let l = 0; l < lanesCount; l++) {
        const first = rows.find(r => r.lane === l);
        laneColors[l] = (first && first.color) || '#888';
    }

    return (
        <div className={styles.historyWrap} style={{minHeight: svgHeight + 2}}>
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
                        strokeOpacity={0.28}
                        strokeWidth={2}
                    />
                ))}
                {rows.map(row => {
                    const ySelf = yOf(row.index);
                    const xSelf = xOf(row.lane || 0);
                    const isHead = Boolean(currentBranch) &&
                        Array.isArray(row.branches) &&
                        row.branches.indexOf(currentBranch) !== -1;
                    const isMerge = Array.isArray(row.parents) && row.parents.length > 1;
                    const dotR = isHead ? dotRadius + 2 : (isMerge ? dotRadius + 0.5 : dotRadius - 0.3);
                    const dotColor = laneColors[row.lane || 0] || '#888';
                    return (
                        <g key={`g-${row.oid}`}>
                            {(row.parents || []).map(p => {
                                const yParent = p.index >= 0 ? yOf(p.index) : 0;
                                const xParent = xOf(p.lane || 0);
                                const color = laneColors[p.lane || 0] || dotColor;
                                if (xParent === xSelf) {
                                    return (
                                        <line
                                            key={`e-${row.oid}-${p.oid}`}
                                            x1={xSelf}
                                            y1={yParent + dotRadius}
                                            x2={xSelf}
                                            y2={ySelf - dotRadius}
                                            stroke={color}
                                            strokeWidth={1.4}
                                        />
                                    );
                                }
                                return (
                                    <path
                                        key={`e-${row.oid}-${p.oid}`}
                                        d={`M ${xParent} ${yParent + dotRadius} V ${ySelf - dotRadius} H ${xSelf}`}
                                        stroke={color}
                                        strokeWidth={1.4}
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
                                strokeWidth={isHead ? 1.5 : 0}
                            />
                        </g>
                    );
                })}
            </svg>
            <ul className={styles.commitList} style={{paddingLeft: graphWidth}}>
                {rows.map(row => {
                    const commit = (row.commit && row.commit) || {};
                    const author = commit.author || {};
                    const authorName = author.name || '';
                    const subject = commit.message ?
                        String(commit.message).split('\n')[0] : '';
                    const timestamp = author.timestamp || 0;
                    const branchChips = (row.branches || [])
                        .filter(b => b !== DETACHED_BRANCH);
                    const isHeadHere = Boolean(currentBranch) &&
                        Array.isArray(row.branches) &&
                        row.branches.indexOf(currentBranch) !== -1;
                    return (
                        <li key={row.oid} className={styles.commitRow}>
                            <div className={styles.commitMain}>
                                <div className={styles.commitMessageRow}>
                                    <span className={styles.commitMessage}>{subject || '(no message)'}</span>
                                    {branchChips.length > 0 && (
                                        <span className={styles.commitChips}>
                                            {branchChips.map(b => (
                                                <BranchChip
                                                    key={b}
                                                    name={b}
                                                    isRemote={remoteBranchSet && remoteBranchSet.has(b)}
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
                                    <span className={styles.commitDate}>{formatYmd(timestamp)}</span>
                                    <span className={styles.commitMetaSep}>{'·'}</span>
                                    <span className={styles.commitTime}>{formatYmdHms(timestamp).slice(-5)}</span>
                                    <span className={styles.commitHash}>{row.oid.slice(0, 7)}</span>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
CommitGraph.propTypes = {
    rows: PropTypes.arrayOf(PropTypes.object),
    currentBranch: PropTypes.string,
    remoteBranchSet: PropTypes.instanceOf(Set)
};

// ---------------------------------------------------------------------------
// Main sidebar.
// ---------------------------------------------------------------------------
class GitSidebar extends React.Component {
    static propTypes = {
        intl: intlShape.isRequired,
        vm: PropTypes.object,
        onOpenFull: PropTypes.func,
        isDark: PropTypes.bool
    };

    constructor (props) {
        super(props);
        this.state = {
            collapsed: {
                workingChanges: false,
                remotes: false,
                branches: false
            }
        };
        this._unsubscribe = null;
        this._refreshPending = false;
    }

    componentDidMount () {
        this._refresh();
        this._unsubscribe = gitStore.subscribe(() => {
            // Sidebar does not merge gitStore state directly into this.state
            // because setState would overwrite collapsed flags. Instead each
            // render reads gitStore.getState() directly. We still notify a
            // re-render by toggling a tiny counter.
            this.setState(s => ({...s, _tick: (s._tick || 0) + 1}));
        });
    }

    componentDidUpdate (prev) {
        if (prev.vm !== this.props.vm) {
            this._refresh();
        }
    }

    componentWillUnmount () {
        if (typeof this._unsubscribe === 'function') {
            this._unsubscribe();
        }
    }

    _refresh = () => {
        if (!this.props.vm || this._refreshPending) return;
        this._refreshPending = true;
        ops.refreshRepository({vm: this.props.vm})
            .catch(() => { /* ignore — the sidebar keeps whatever state it had */ })
            .finally(() => { this._refreshPending = false; });
    };

    _toggle = (section) => {
        this.setState(s => ({collapsed: {...s.collapsed, [section]: !s.collapsed[section]}}));
    };

    render () {
        const {intl} = this.props;
        const st = gitStore.getState();
        const repo = st.repo || {initialized: false, head: null, branch: null, detached: false};
        const upstream = st.upstream || {remote: null, branch: null, tracking: false, ahead: null, behind: null};
        const changes = Array.isArray(st.changes) ? st.changes : [];
        const remotes = Array.isArray(st.remotes) ? st.remotes : [];
        const branches = Array.isArray(st.branches) ? st.branches : [];
        const history = st.history || {layout: null, remoteBranches: []};
        const commits = Array.isArray(st.commits) ? st.commits : [];
        const layout = history.layout || {rows: [], lanesCount: 1};
        const rows = Array.isArray(layout.rows) ? layout.rows : [];
        const remoteBranchSet = new Set(history.remoteBranches || []);
        const isBusy = Boolean(st.op && st.op.name);

        const collapsed = this.state.collapsed;
        const currentBranch = repo.detached ? null : (repo.branch || null);
        const hasWorkingChanges = repo.initialized && changes.some(c => c && c.description !== 'unmodified');
        const stagedCount = changes.filter(c => c && c.description === 'staged').length;
        const unstagedCount = changes.filter(c => c && c.description === 'unstaged').length;

        // Files that are both staged AND have real work-tree changes appear twice.
        // For the sidebar we de-dup by filepath to keep the list compact.
        const seen = new Set();
        const changeRows = changes.filter(c => {
            if (!c || c.description === 'unmodified') return false;
            if (seen.has(c.filepath)) return false;
            seen.add(c.filepath);
            return true;
        });

        const workingChangesTitle = (
            <span>
                <FormattedMessage id="mw.git.sidebar.workingChanges" defaultMessage="Working changes" />
                {hasWorkingChanges && (
                    <span className={styles.titleCount}> {changeRows.length}</span>
                )}
            </span>
        );
        const remotesTitle = (
            <span>
                <FormattedMessage id="mw.git.sidebar.remotes" defaultMessage="Remotes" />
                {remotes.length > 0 && (
                    <span className={styles.titleCount}> {remotes.length}</span>
                )}
            </span>
        );
        const branchesTitle = (
            <span>
                <FormattedMessage id="mw.git.sidebar.branches" defaultMessage="Branches" />
                {branches.length > 0 && (
                    <span className={styles.titleCount}> {branches.length}</span>
                )}
            </span>
        );

        return (
            <div className={styles.root} data-panel-theme={this.props.isDark ? 'dark' : 'light'}>
                {/* ── Scrollable upper area ── */}
                <div className={styles.scrollArea}>
                    {/* Working changes (Git 窗口 Changes 视图的快捷概览) */}
                    <Section
                        title={workingChangesTitle}
                        icon={<ListChecks size={13} />}
                        collapsed={collapsed.workingChanges}
                        onToggle={() => this._toggle('workingChanges')}
                    >
                        {!repo.initialized && (
                            <div className={styles.emptyHint}>
                                <div>
                                    <FormattedMessage
                                        id="mw.git.sidebar.noRepoInitFirst"
                                        defaultMessage="No repository initialized."
                                    />
                                </div>
                                <div>
                                    <FormattedMessage
                                        id="mw.git.sidebar.noRepoInitSecond"
                                        defaultMessage="Open the full Git window to clone or create one."
                                    />
                                </div>
                            </div>
                        )}
                        {repo.initialized && !hasWorkingChanges && (
                            <div className={styles.emptyHint}>
                                <FormattedMessage
                                    id="mw.git.sidebar.cleanTree"
                                    defaultMessage="Working tree is clean."
                                />
                            </div>
                        )}
                        {repo.initialized && hasWorkingChanges && (
                            <div className={styles.changeList}>
                                {stagedCount > 0 && (
                                    <div className={styles.changeSubGroup}>
                                        <div className={styles.changeSubTitle}>
                                            <FormattedMessage
                                                id="mw.git.sidebar.staged"
                                                defaultMessage="Staged ({count})"
                                                values={{count: stagedCount}}
                                            />
                                        </div>
                                        {changeRows.filter(c => c.staged).map((c, i) => (
                                            <div key={`s-${c.filepath}-${i}`} className={styles.changeRow}>
                                                <FileBadge description={c.description} />
                                                <span className={styles.changePath} title={c.filepath}>{c.filepath}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {unstagedCount > 0 && (
                                    <div className={styles.changeSubGroup}>
                                        <div className={styles.changeSubTitle}>
                                            <FormattedMessage
                                                id="mw.git.sidebar.unstaged"
                                                defaultMessage="Changes ({count})"
                                                values={{count: unstagedCount}}
                                            />
                                        </div>
                                        {changeRows.filter(c => !c.staged).map((c, i) => (
                                            <div key={`u-${c.filepath}-${i}`} className={styles.changeRow}>
                                                <FileBadge description={c.description} />
                                                <span className={styles.changePath} title={c.filepath}>{c.filepath}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {hasChangesSelector(st) && (
                                    <p className={classNames(styles.muted, styles.emptyDescriptionHint)}>
                                        <FormattedMessage
                                            id="mw.git.changes.emptyDescription"
                                            defaultMessage="Add a description above before committing — or the commit message will be left blank."
                                        />
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Sync summary — 与 Git 窗口 renderSyncStatus 一样的 "与 upstream 同步状态"  */}
                        {repo.initialized && upstream.remote && (
                            <div className={styles.syncStatus}>
                                {upstream.ahead === 0 && upstream.behind === 0 ? (
                                    <span className={styles.syncInSync}>
                                        <FormattedMessage
                                            id="mw.git.sidebar.upToDate"
                                            defaultMessage="In sync with {ref}."
                                            values={{ref: `${upstream.remote}/${upstream.branch}`}}
                                        />
                                    </span>
                                ) : (
                                    <span>
                                        <FormattedMessage
                                            id="mw.git.sidebar.syncDrift"
                                            defaultMessage="Compared with {ref}: "
                                            values={{ref: `${upstream.remote}/${upstream.branch}`}}
                                        />
                                        {upstream.ahead > 0 && (
                                            <span className={styles.syncAhead}>
                                                {' '}↑{upstream.ahead}
                                            </span>
                                        )}
                                        {upstream.behind > 0 && (
                                            <span className={styles.syncBehind}>
                                                {' '}↓{upstream.behind}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        )}
                        {repo.initialized && !upstream.remote && (
                            <div className={classNames(styles.muted, styles.syncStatus)}>
                                <FormattedMessage
                                    id="mw.git.sidebar.syncUntracked"
                                    defaultMessage="{ref} has no upstream yet — push once to start tracking it."
                                    values={{ref: currentBranch || repo.head || 'HEAD'}}
                                />
                            </div>
                        )}
                    </Section>

                    {/* Remotes (Git 窗口 Remote 视图的列表) */}
                    <Section
                        title={remotesTitle}
                        icon={<Cloud size={13} />}
                        collapsed={collapsed.remotes}
                        onToggle={() => this._toggle('remotes')}
                    >
                        {!repo.initialized ? (
                            <div className={styles.emptyHint}>
                                <FormattedMessage
                                    id="mw.git.sidebar.notInitializing"
                                    defaultMessage="Not initialized."
                                />
                            </div>
                        ) : remotes.length === 0 ? (
                            <div className={styles.emptyHint}>
                                <FormattedMessage
                                    id="mw.git.remote.none"
                                    defaultMessage="No remotes yet. Add one below to push your project."
                                />
                            </div>
                        ) : (
                            <ul className={styles.remoteList}>
                                {remotes.map(r => (
                                    <li key={r.name} className={styles.remoteRow}>
                                        <span className={styles.remoteName}>{r.name}</span>
                                        <span className={styles.remoteUrl}>{r.url}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    {/* Branches */}
                    <Section
                        title={branchesTitle}
                        icon={<Network size={13} />}
                        collapsed={collapsed.branches}
                        onToggle={() => this._toggle('branches')}
                    >
                        {!repo.initialized ? (
                            <div className={styles.emptyHint}>
                                <FormattedMessage
                                    id="mw.git.sidebar.notInitializing"
                                    defaultMessage="Not initialized."
                                />
                            </div>
                        ) : branches.length === 0 ? (
                            <div className={styles.emptyHint}>
                                <FormattedMessage
                                    id="mw.git.sidebar.noBranches"
                                    defaultMessage="No branches yet."
                                />
                            </div>
                        ) : (
                            <ul className={styles.branchList}>
                                {branches.map(b => (
                                    <li
                                        key={b}
                                        className={classNames(
                                            styles.branchRow,
                                            b === currentBranch && styles.branchRowCurrent
                                        )}
                                    >
                                        <GitBranch size={12} className={styles.branchIcon} />
                                        <span>{b}</span>
                                        {b === currentBranch && (
                                            <span className={styles.currentTag}>
                                                <FormattedMessage
                                                    id="mw.git.branches.currentTag"
                                                    defaultMessage="current"
                                                />
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <div style={{height: 24}} />
                </div>

                {/* ── Fixed bottom History section ── */}
                <div className={styles.fixedBottom}>
                    <Section
                        title={<FormattedMessage id="mw.git.history.heading" defaultMessage="Commit history" />}
                        icon={<History size={13} />}
                        collapsed={false}
                        onToggle={() => {/* 固定底部 History 不允许折叠，保持展开 */}}
                        titleClass={styles.sectionTitleNoCollapse}
                    >
                        {isBusy && (
                            <div className={styles.emptyHint}>
                                {st.op && st.op.message
                                    ? st.op.message
                                    : intl.formatMessage({defaultMessage: 'Working…', id: 'mw.git.working'})}
                            </div>
                        )}
                        {repo.initialized && !isBusy && rows.length > 0 && (
                            <CommitGraph
                                rows={rows.slice(0, 60)}
                                currentBranch={currentBranch}
                                remoteBranchSet={remoteBranchSet}
                            />
                        )}
                        {repo.initialized && !isBusy && rows.length === 0 && (
                            <div className={styles.emptyHint}>
                                <FormattedMessage
                                    id="mw.git.history.none"
                                    defaultMessage="No commits yet."
                                />
                            </div>
                        )}
                        {!repo.initialized && (
                            <div className={styles.emptyHint}>
                                <FormattedMessage
                                    id="mw.git.sidebar.notInitializing"
                                    defaultMessage="Not initialized."
                                />
                            </div>
                        )}
                    </Section>
                </div>

                {/* Floating "open full git modal" button, bottom-right of the sidebar */}
                <button
                    type="button"
                    title={intl.formatMessage({
                        defaultMessage: 'Open Git repository window',
                        description: 'Open full Git window button tooltip',
                        id: 'mw.git.sidebar.openFullGit'
                    })}
                    onClick={() => { if (typeof this.props.onOpenFull === 'function') this.props.onOpenFull(); }}
                    className={styles.openFullButton}
                >
                    <ExternalLink size={14} />
                </button>
            </div>
        );
    }
}

GitSidebar.propTypes = {
    intl: intlShape.isRequired,
    vm: PropTypes.object,
    onOpenFull: PropTypes.func
};

export default injectIntl(GitSidebar);

import React from 'react';
import PropTypes from 'prop-types';
import {ExternalLink, ChevronDown, ChevronRight, GitBranch, History, Network} from 'lucide-react';
import ops from '../../lib/git/ops/index.js';
import gitStore from '../../lib/git/state/store.js';
import {hasChanges as hasChangesSelector} from '../../lib/git/state/selectors.js';

// A VS Code–style activity bar side panel for Git.
// Three collapsible sections: Repositories / History / Branches.
// Bottom-right floating ExternalLink button opens the full git modal (the same
// one the Tools menu item opens); when closed, clicking the button again or
// the Git activity bar icon re-opens it.
class GitSidebar extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            repo: null,
            changes: [],
            history: {nodes: [], branches: [], remoteBranches: [], branchLogs: [], layout: null},
            branches: [],
            upstream: {remote: null, branch: null, tracking: false, ahead: null, behind: null},
            errors: [],
            collapsed: {
                repository: false,
                history: false,
                branches: false
            }
        };
        this._unsubscribe = null;
        this._refreshPending = false;
    }

    componentDidMount () {
        // Sync once with the latest repository state, then subscribe to future
        // refreshes so the sidebar tracks what the modal window is doing.
        this._refresh();
        this._unsubscribe = gitStore.subscribe(() => this.setState(gitStore.getState()));
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
            .then(() => {
                this.setState(gitStore.getState());
            })
            .catch(() => {
                // A refresh error (network, half-written repo, etc.) must not
                // take down the sidebar — just let the store keep whatever it
                // had; the modal will show the user-facing error when they open it.
            })
            .finally(() => {
                this._refreshPending = false;
            });
    };

    _toggle = (section) => {
        this.setState(state => ({collapsed: {
            ...state.collapsed,
            [section]: !state.collapsed[section]
        }}));
    };

    _onOpenFull = () => {
        if (typeof this.props.onOpenFull === 'function') {
            this.props.onOpenFull();
        }
    };

    render () {
        const state = this.state;
        const collapsed = state.collapsed || {};
        const repo = state.repo || {initialized: false, head: null, branch: null, detached: false};
        const changes = Array.isArray(state.changes) ? state.changes : [];
        const branches = Array.isArray(state.branches) ? state.branches : [];
        const history = state.history || {branchLogs: []};
        const logs = Array.isArray(history.branchLogs) ? history.branchLogs : [];
        const currentBranch = repo.branch || 'main';
        const changesCount = changes.filter(c => c && c.description !== 'unmodified').length;
        const canCommit = repo.initialized && hasChangesSelector(state);
        const isBusy = Boolean(state.op && state.op.name);

        return (
            <div
                style={{
                    position: 'relative',
                    minHeight: '100%',
                    paddingBottom: 56,
                    color: '#cccccc',
                    fontSize: 13,
                    fontFamily: 'var(--scratchgui-stack-monospace, Menlo, Consolas, monospace)'
                }}
            >
                <Section
                    title={repo.initialized ? 'REPOSITORY' : 'NOT INITIALIZED'}
                    collapsed={collapsed.repository}
                    onToggle={() => this._toggle('repository')}
                    icon={<GitBranch size={14} style={{marginRight: 6}} />}
                >
                    {repo.initialized ? (
                        <div style={{padding: '4px 0 8px'}}>
                            <div style={{padding: '2px 8px', opacity: 0.9}}>
                                Branch: <span style={{color: '#4ec9b0'}}>{currentBranch}</span>
                                {repo.detached && <span style={{color: '#ff8080', marginLeft: 6}}>(detached)</span>}
                            </div>
                            <div style={{padding: '2px 8px', opacity: 0.85}}>
                                <span style={{color: '#888'}}>{changesCount > 0 ? `Changes: ${changesCount}` : 'No changes'}</span>
                            </div>
                            {state.upstream && state.upstream.remote ? (
                                <div style={{padding: '2px 8px', opacity: 0.85}}>
                                    <span style={{color: '#888'}}>Upstream: </span>
                                    <span style={{color: '#dcdcaa'}}>{state.upstream.remote}/{state.upstream.branch}</span>
                                    {typeof state.upstream.ahead === 'number' && state.upstream.ahead > 0 && (
                                        <span style={{color: '#ffb454', marginLeft: 6}}>↑{state.upstream.ahead}</span>
                                    )}
                                    {typeof state.upstream.behind === 'number' && state.upstream.behind > 0 && (
                                        <span style={{color: '#ff6080', marginLeft: 6}}>↓{state.upstream.behind}</span>
                                    )}
                                </div>
                            ) : null}
                            {isBusy && (
                                <div style={{padding: '4px 8px', color: '#569cd6', fontSize: 12}}>
                                    {state.op && state.op.message ? state.op.message : 'Working…'}
                                </div>
                            )}
                            {!canCommit && !isBusy && changesCount === 0 && (
                                <div style={{padding: '2px 8px', opacity: 0.55, fontSize: 12}}>
                                    Working tree is clean.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{padding: '4px 8px 12px', opacity: 0.7, fontSize: 12, lineHeight: 1.5}}>
                            No repository initialized.
                            <br />
                            Open the full Git window to clone or create one.
                        </div>
                    )}
                </Section>

                <Section
                    title="HISTORY"
                    collapsed={collapsed.history}
                    onToggle={() => this._toggle('history')}
                    icon={<History size={14} style={{marginRight: 6}} />}
                >
                    {repo.initialized && logs.length > 0 ? (
                        <div style={{padding: '2px 0 8px'}}>
                            {logs.slice(0, 12).map((entry, idx) => (
                                <CommitLine key={idx} entry={entry} currentBranch={currentBranch} />
                            ))}
                        </div>
                    ) : (
                        <div style={{padding: '2px 8px', opacity: 0.55, fontSize: 12}}>
                            {repo.initialized ? 'No commits yet.' : 'Not initialized.'}
                        </div>
                    )}
                </Section>

                <Section
                    title="BRANCHES"
                    collapsed={collapsed.branches}
                    onToggle={() => this._toggle('branches')}
                    icon={<Network size={14} style={{marginRight: 6}} />}
                >
                    {repo.initialized && branches.length > 0 ? (
                        <div style={{padding: '2px 0 8px'}}>
                            {branches.slice(0, 20).map((name, idx) => (
                                <div
                                    key={`${name}-${idx}`}
                                    style={{
                                        padding: '2px 8px',
                                        color: name === currentBranch ? '#4ec9b0' : '#cccccc',
                                        opacity: name === currentBranch ? 1 : 0.85,
                                        fontSize: 12
                                    }}
                                >
                                    {name === currentBranch ? '★ ' : '  '}{name}
                                </div>
                            ))}
                            {branches.length > 20 && (
                                <div style={{padding: '2px 8px', opacity: 0.5, fontSize: 11}}>
                                    +{branches.length - 20} more
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{padding: '2px 8px', opacity: 0.55, fontSize: 12}}>
                            {repo.initialized ? 'No branches yet.' : 'Not initialized.'}
                        </div>
                    )}
                </Section>

                {/* Floating "open full git modal" button, bottom-right */}
                <button
                    type="button"
                    title="Open Git repository window"
                    onClick={this._onOpenFull}
                    style={{
                        position: 'absolute',
                        right: 8,
                        bottom: 8,
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        background: '#2d2d2d',
                        border: '1px solid #3a3a3a',
                        color: '#d0d0d0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#3a3a3a'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#2d2d2d'; }}
                >
                    <ExternalLink size={14} />
                </button>
            </div>
        );
    }
}

const Section = ({title, collapsed, onToggle, icon, children}) => (
    <div style={{borderBottom: '1px solid #2a2a2a'}}>
        <button
            type="button"
            onClick={onToggle}
            style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 8px',
                background: 'transparent',
                border: 'none',
                color: '#cccccc',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.5,
                display: 'flex',
                alignItems: 'center',
                opacity: 0.9
            }}
        >
            {collapsed
                ? <ChevronRight size={12} style={{marginRight: 2}} />
                : <ChevronDown size={12} style={{marginRight: 2}} />}
            {icon}
            {title}
        </button>
        {!collapsed && (
            <div>
                {children}
            </div>
        )}
    </div>
);

const CommitLine = ({entry}) => {
    if (!entry) return null;
    // branchLogs entry shape: { branch: 'main', oids: [oid, ...] }
    const oids = Array.isArray(entry) ? entry : entry.oids || [];
    const branchName = entry && entry.branch ? entry.branch : '';
    if (oids.length === 0) return null;
    const short = String(oids[0]).slice(0, 7);
    return (
        <div
            style={{
                padding: '2px 8px',
                color: '#cccccc',
                fontSize: 12,
                opacity: 0.85,
                fontFamily: 'Menlo, Consolas, monospace'
            }}
        >
            <span style={{color: '#9cdcfe'}}>{short}</span>
            {branchName && (
                <span style={{color: '#888', marginLeft: 6, fontSize: 11}}>
                    · {branchName}
                </span>
            )}
        </div>
    );
};

GitSidebar.propTypes = {
    vm: PropTypes.object,
    onOpenFull: PropTypes.func
};

export default GitSidebar;

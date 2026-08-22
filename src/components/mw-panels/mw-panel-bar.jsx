import React from 'react';
import PropTypes from 'prop-types';
import {X, Trash2, ChevronUp} from 'lucide-react';
import classNames from 'classnames';
import {defineMessages, injectIntl} from 'react-intl';
import styles from './mw-panel-bar.css';
import {PANEL_DEFS, PANEL_TERMINAL} from '../../lib/mw-panels-store.js';
import ProblemItem from './problem-item.jsx';
import TerminalPanel from './terminal-panel.jsx';

const messages = defineMessages({
    panelProblems: {
        id: 'mw.panel.problems',
        defaultMessage: 'Problems',
        description: 'Tab label for the problems panel'
    },
    panelConsole: {
        id: 'mw.panel.console',
        defaultMessage: 'Console',
        description: 'Tab label for the console panel'
    },
    panelTerminal: {
        id: 'mw.panel.terminal',
        defaultMessage: 'Terminal',
        description: 'Tab label for the terminal panel'
    },
    clearConsole: {
        id: 'mw.panel.clearConsole',
        defaultMessage: 'Clear console',
        description: 'Tooltip for the clear console button'
    },
    closePanel: {
        id: 'mw.panel.closePanel',
        defaultMessage: 'Close panel',
        description: 'Tooltip for the close panel button'
    },
    noProblems: {
        id: 'mw.panel.noProblems',
        defaultMessage: 'No problems detected',
        description: 'Empty state for the problems panel'
    },
    consoleEmpty: {
        id: 'mw.panel.consoleEmpty',
        defaultMessage: 'Console is empty',
        description: 'Empty state for the console panel'
    }
});

const formatTime = ts => {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const stringifyArgs = args => args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
        try {
            return JSON.stringify(arg, null, 2);
        } catch (e) {
            return String(arg);
        }
    }
    return String(arg);
}).join(' ');

class MWPanelBar extends React.Component {
    constructor (props) {
        super(props);
        this.handleResizeStart = this.handleResizeStart.bind(this);
        this.handleResizeMove = this.handleResizeMove.bind(this);
        this.handleResizeEnd = this.handleResizeEnd.bind(this);
        this.handleClearConsole = this.handleClearConsole.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleTabClick = this.handleTabClick.bind(this);
        this.listRef = React.createRef();
        this.resizeStart = null;
    }
    componentDidUpdate (prevProps) {
        if (this.props.visible &&
            (this.props.consoleEntries.length !== prevProps.consoleEntries.length ||
             this.props.active !== prevProps.active)) {
            const list = this.listRef.current;
            if (list) {
                list.scrollTop = list.scrollHeight;
            }
        }
    }
    handleResizeStart (e) {
        e.preventDefault();
        this.resizeStart = {
            y: e.clientY,
            height: this.props.height
        };
        document.addEventListener('pointermove', this.handleResizeMove);
        document.addEventListener('pointerup', this.handleResizeEnd);
    }
    handleResizeMove (e) {
        if (!this.resizeStart) {
            return;
        }
        const delta = this.resizeStart.y - e.clientY;
        this.props.onResize(this.resizeStart.height + delta);
    }
    handleResizeEnd () {
        this.resizeStart = null;
        document.removeEventListener('pointermove', this.handleResizeMove);
        document.removeEventListener('pointerup', this.handleResizeEnd);
    }
    handleClearConsole () {
        this.props.onClearConsole();
    }
    handleClose () {
        this.props.onClose();
    }
    handleTabClick (e) {
        this.props.onSelect(e.currentTarget.dataset.panelId);
    }
    render () {
        const {
            visible,
            active,
            height,
            intl,
            vscodeLayout,
            problems,
            consoleEntries,
            onJumpToProblem
        } = this.props;
        if (!visible) {
            return null;
        }
        const defs = PANEL_DEFS;
        return (
            <div
                className={classNames(styles.panelBar, {
                    [styles.panelBarActivity]: vscodeLayout
                })}
                style={{height}}
            >
                <div
                    className={styles.resizeHandle}
                    onPointerDown={this.handleResizeStart}
                />
                <div className={styles.panelTabs}>
                    {Object.keys(defs).map(id => {
                        const def = defs[id];
                        const isActive = id === active;
                        const title = id === 'problems' ?
                            intl.formatMessage(messages.panelProblems) :
                            (id === 'terminal' ?
                                intl.formatMessage(messages.panelTerminal) :
                                intl.formatMessage(messages.panelConsole));
                        return (
                            <button
                                key={id}
                                data-panel-id={id}
                                className={isActive ? styles.panelTabActive : styles.panelTab}
                                onClick={this.handleTabClick}
                            >
                                {def.icon}
                                <span className={styles.panelTabLabel}>
                                    {title}
                                </span>
                                {id === 'problems' && problems.length > 0 ? (
                                    <span className={styles.panelTabBadge}>{problems.length}</span>
                                ) : null}
                            </button>
                        );
                    })}
                    <div className={styles.panelActions}>
                        {active === 'console' ? (
                            <button
                                className={styles.panelAction}
                                title={intl.formatMessage(messages.clearConsole)}
                                onClick={this.handleClearConsole}
                            >
                                <Trash2 size={14} />
                            </button>
                        ) : null}
                        <button
                            className={styles.panelAction}
                            title={intl.formatMessage(messages.closePanel)}
                            onClick={this.handleClose}
                        >
                            <ChevronUp size={14} />
                        </button>
                        <button
                            className={styles.panelAction}
                            title={intl.formatMessage(messages.closePanel)}
                            onClick={this.handleClose}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
                <div className={styles.panelBody}>
                    {active === 'problems' ? (
                        problems.length === 0 ? (
                            <div className={styles.panelEmpty}>
                                {intl.formatMessage(messages.noProblems)}
                            </div>
                        ) : (
                            <div className={styles.problemList}>
                                {problems.map(p => (
                                    <ProblemItem
                                        key={p.id}
                                        problem={p}
                                        onJump={onJumpToProblem}
                                    />
                                ))}
                            </div>
                        )
                    ) : active === PANEL_TERMINAL ? (
                        <TerminalPanel />
                    ) : (
                        <div
                            ref={this.listRef}
                            className={styles.consoleList}
                        >
                            {consoleEntries.length === 0 ? (
                                <div className={styles.panelEmpty}>
                                    {intl.formatMessage(messages.consoleEmpty)}
                                </div>
                            ) : (
                                consoleEntries.map(entry => (
                                    <div
                                        key={entry.id}
                                        className={styles.consoleRow}
                                    >
                                        <span className={styles.consoleTime}>{formatTime(entry.time)}</span>
                                        <span
                                            className={styles.consoleLevel}
                                            data-level={entry.method}
                                        >
                                            {entry.method.toUpperCase()}
                                        </span>
                                        <span
                                            className={styles.consoleText}
                                            data-level={entry.method}
                                        >
                                            {stringifyArgs(entry.args)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

MWPanelBar.propTypes = {
    visible: PropTypes.bool.isRequired,
    active: PropTypes.string.isRequired,
    height: PropTypes.number.isRequired,
    intl: PropTypes.object,
    vscodeLayout: PropTypes.bool,
    problems: PropTypes.arrayOf(PropTypes.object),
    consoleEntries: PropTypes.arrayOf(PropTypes.object),
    onSelect: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onResize: PropTypes.func.isRequired,
    onClearConsole: PropTypes.func.isRequired,
    onJumpToProblem: PropTypes.func.isRequired
};

MWPanelBar.defaultProps = {
    intl: null,
    vscodeLayout: false,
    problems: [],
    consoleEntries: []
};

export default injectIntl(MWPanelBar);

import React from 'react';
import PropTypes from 'prop-types';
import {Trash2} from 'lucide-react';
import styles from './mw-panel-bar.css';
import {
    CONSOLE_ENTRIES_EVENT,
    getConsoleEntries,
    clearConsoleEntries
} from '../../lib/mw-panels-store.js';

const formatTime = ts => {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const stringifyArg = arg => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
        try {
            return JSON.stringify(arg);
        } catch (e) {
            return String(arg);
        }
    }
    return String(arg);
};

const stringifyArgs = args => (Array.isArray(args) ? args : [args]).map(stringifyArg).join(' ');

// 工具菜单「终端」打开的窗口内容与多工作区底部面板「控制台」保持一致：
// 显示作品运行时的控制台日志（说/想、广播、提问、运行开始/停止、错误）。
class ConsoleWindow extends React.Component {
    constructor (props) {
        super(props);
        this.state = {entries: getConsoleEntries()};
        this.listRef = React.createRef();
        this.handleChange = this.handleChange.bind(this);
        this.handleClear = this.handleClear.bind(this);
    }
    componentDidMount () {
        window.addEventListener(CONSOLE_ENTRIES_EVENT, this.handleChange);
        this.scrollToBottom();
    }
    componentDidUpdate (prevProps, prevState) {
        if (prevState.entries !== this.state.entries) {
            this.scrollToBottom();
        }
    }
    componentWillUnmount () {
        window.removeEventListener(CONSOLE_ENTRIES_EVENT, this.handleChange);
    }
    handleChange () {
        this.setState({entries: getConsoleEntries()});
    }
    handleClear () {
        clearConsoleEntries();
        this.setState({entries: getConsoleEntries()});
    }
    scrollToBottom () {
        const list = this.listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }
    render () {
        const {entries} = this.state;
        const isZh = this.props.locale === 'zh-cn';
        return (
            <div
                className={styles.panelBar}
                style={{
                    position: 'relative',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '100%',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '2px 6px',
                    borderBottom: '1px solid var(--ui-black-transparent, rgba(0,0,0,0.35))',
                    flex: '0 0 auto'
                }}>
                    <button
                        className={styles.panelAction}
                        title={isZh ? '清空控制台' : 'Clear console'}
                        onClick={this.handleClear}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                <div
                    className={styles.panelBody}
                    ref={this.listRef}
                    style={{flex: '1 1 auto', minHeight: 0, overflow: 'auto'}}
                >
                    {entries.length === 0 ? (
                        <div className={styles.panelEmpty}>
                            {isZh ? '控制台是空的' : 'Console is empty'}
                        </div>
                    ) : entries.map(entry => (
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
                    ))}
                </div>
            </div>
        );
    }
}

ConsoleWindow.propTypes = {
    locale: PropTypes.string
};

ConsoleWindow.defaultProps = {
    locale: 'en'
};

export default ConsoleWindow;

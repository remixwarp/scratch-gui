import bindAll from 'lodash.bindall';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Event Tracer',
        description: 'Title for the event tracer tool',
        id: 'gui.devTools.eventTracer.title'
    },
    subtitle: {
        defaultMessage: '订阅并查看虚拟机运行时事件。勾选事件以启用监听。',
        description: 'Subtitle for the event tracer tool',
        id: 'gui.devTools.eventTracer.subtitle'
    },
    start: {
        defaultMessage: 'Start',
        description: 'Start tracing button',
        id: 'gui.devTools.eventTracer.start'
    },
    stop: {
        defaultMessage: 'Stop',
        description: 'Stop tracing button',
        id: 'gui.devTools.eventTracer.stop'
    },
    clear: {
        defaultMessage: 'Clear',
        description: 'Clear log button',
        id: 'gui.devTools.eventTracer.clear'
    },
    events: {
        defaultMessage: '事件',
        description: 'Events column header',
        id: 'gui.devTools.eventTracer.events'
    },
    count: {
        defaultMessage: '次数',
        description: 'Count column header',
        id: 'gui.devTools.eventTracer.count'
    },
    log: {
        defaultMessage: '实时日志',
        description: 'Live log section title',
        id: 'gui.devTools.eventTracer.log'
    },
    noLog: {
        defaultMessage: '暂无事件。勾选上方事件并运行项目即可看到。',
        description: 'Empty log placeholder',
        id: 'gui.devTools.eventTracer.noLog'
    },
    subscribed: {
        defaultMessage: '已订阅 {n} 个事件',
        description: 'Subscribed count',
        id: 'gui.devTools.eventTracer.subscribed'
    },
    customEvent: {
        defaultMessage: '自定义事件名',
        description: 'Custom event name placeholder',
        id: 'gui.devTools.eventTracer.customEvent'
    },
    add: {
        defaultMessage: '添加',
        description: 'Add custom event button',
        id: 'gui.devTools.eventTracer.add'
    }
});

// Real events emitted by scratch-vm / runtime, verified against the source.
const KNOWN_EVENTS = [
    'PROJECT_RUN_START',
    'PROJECT_RUN_STOP',
    'RUNTIME_STARTED',
    'TARGETS_UPDATE',
    'MONITORS_UPDATE',
    'SCRIPT_GLOW_ON',
    'SCRIPT_GLOW_OFF',
    'SAY',
    'QUESTION',
    'targetWasCreated',
    'targetWasRemoved',
    'HAS_CLOUD_DATA_UPDATE',
    'LOCALE_CHANGED',
    'BLOCK_DRAG_END',
    'BLOCK_DRAG_START'
];

class EventTracerModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleToggleTrace',
            'handleClear',
            'handleToggleEvent',
            'handleAddCustomEvent',
            'onVmEvent'
        ]);
        this.state = {
            tracing: false,
            selected: new Set(KNOWN_EVENTS.slice(0, 6)),
            customEvents: [],
            counts: {},
            log: []
        };
        this._handlers = {};
    }

    componentDidUpdate (prevProps, prevState) {
        // When tracing toggles or selection changes, rebind listeners.
        if (this.state.tracing !== prevState.tracing ||
            this.state.selected !== prevState.selected ||
            this.state.customEvents !== prevState.customEvents) {
            this.rebind();
        }
    }

    componentWillUnmount () {
        this.unbindAll();
    }

    get activeEvents () {
        return [...this.state.selected, ...this.state.customEvents];
    }

    rebind () {
        this.unbindAll();
        if (!this.state.tracing) return;
        const vm = this.props.vm;
        if (!vm || typeof vm.on !== 'function') return;
        for (const event of this.activeEvents) {
            const handler = (...args) => this.onVmEvent(event, args);
            this._handlers[event] = handler;
            vm.on(event, handler);
        }
    }

    unbindAll () {
        const vm = this.props.vm;
        if (!vm || typeof vm.off !== 'function') return;
        for (const event of Object.keys(this._handlers)) {
            try {
                vm.off(event, this._handlers[event]);
            } catch (e) {
                // ignore
            }
        }
        this._handlers = {};
    }

    onVmEvent (event, args) {
        this.setState(prev => {
            const counts = {...prev.counts};
            counts[event] = (counts[event] || 0) + 1;

            let summary = '';
            try {
                if (args.length === 1) {
                    const a = args[0];
                    if (a && typeof a === 'object') {
                        summary = Object.keys(a).slice(0, 3)
                            .map(k => `${k}=${JSON.stringify(a[k]).slice(0, 40)}`)
                            .join(', ');
                    } else {
                        summary = String(a).slice(0, 60);
                    }
                } else if (args.length > 1) {
                    summary = args.map(a => String(a).slice(0, 30)).join(' | ');
                }
            } catch (e) {
                summary = '';
            }

            const entry = {
                id: prev.log.length,
                event,
                summary,
                time: new Date().toLocaleTimeString()
            };
            const log = prev.log.concat(entry);
            if (log.length > 200) log.shift();
            return {counts, log};
        });
    }

    handleToggleTrace () {
        this.setState(prev => {
            const tracing = !prev.tracing;
            if (!tracing) {
                // Clear counts/log when stopping? Keep log, just stop listening.
            }
            return {tracing};
        }, () => this.rebind());
    }

    handleClear () {
        this.setState({counts: {}, log: []});
    }

    handleToggleEvent (event) {
        this.setState(prev => {
            const selected = new Set(prev.selected);
            if (selected.has(event)) selected.delete(event);
            else selected.add(event);
            return {selected};
        });
    }

    handleAddCustomEvent () {
        const value = ((this._customInput && this._customInput.value) || '').trim();
        if (!value) return;
        this.setState(prev => ({
            customEvents: prev.customEvents.includes(value) ?
                prev.customEvents : [...prev.customEvents, value]
        }));
        if (this._customInput) this._customInput.value = '';
    }

    render () {
        const {intl} = this.props;
        const {tracing, selected, customEvents, counts, log} = this.state;
        const allEvents = [...KNOWN_EVENTS, ...customEvents];

        return (
            <Box className={styles.devToolsContainer}>
                <h2 className={styles.devToolsTitle}>{intl.formatMessage(messages.title)}</h2>
                <p className={styles.devToolsSubtitle}>{intl.formatMessage(messages.subtitle)}</p>

                <div className={styles.devToolsButtonRow}>
                    {!tracing ? (
                        <button
                            className={styles.devToolsPrimaryButton}
                            onClick={this.handleToggleTrace}
                        >
                            {intl.formatMessage(messages.start)}
                        </button>
                    ) : (
                        <button
                            className={styles.devToolsDangerButton}
                            onClick={this.handleToggleTrace}
                        >
                            {intl.formatMessage(messages.stop)}
                        </button>
                    )}
                    <button
                        className={styles.devToolsSecondaryButton}
                        onClick={this.handleClear}
                    >
                        {intl.formatMessage(messages.clear)}
                    </button>
                    <span className={tracing ? styles.devToolsStatusRunning : styles.devToolsStatusIdle}>
                        {intl.formatMessage(messages.subscribed, {n: this.activeEvents.length})}
                    </span>
                </div>

                <div className={styles.eventTracerEvents}>
                    {allEvents.map(event => (
                        <label
                            key={event}
                            className={`${styles.eventTracerChip} ${selected.has(event) ? styles.eventTracerChipOn : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={selected.has(event)}
                                onChange={() => this.handleToggleEvent(event)}
                            />
                            <span className={styles.devToolsMono}>{event}</span>
                        </label>
                    ))}
                </div>

                <div className={styles.eventTracerCustomRow}>
                    <input
                        ref={c => { this._customInput = c; }}
                        className={styles.eventTracerInput}
                        placeholder={intl.formatMessage(messages.customEvent)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') this.handleAddCustomEvent();
                        }}
                    />
                    <button
                        className={styles.devToolsSecondaryButton}
                        onClick={this.handleAddCustomEvent}
                    >
                        {intl.formatMessage(messages.add)}
                    </button>
                </div>

                <h4 className={styles.devToolsSectionTitle}>{intl.formatMessage(messages.log)}</h4>
                <div className={styles.eventTracerCounts}>
                    {allEvents.filter(e => counts[e]).map(event => (
                        <span key={event} className={styles.eventTracerCountBadge}>
                            <span className={styles.devToolsMono}>{event}</span>: {counts[event]}
                        </span>
                    ))}
                </div>
                <div className={styles.devToolsLogWrap}>
                    {log.length === 0 ? (
                        <p className={styles.devToolsEmpty}>{intl.formatMessage(messages.noLog)}</p>
                    ) : (
                        log.slice().reverse().map(entry => (
                            <div key={entry.id} className={styles.devToolsLogLine}>
                                <span className={styles.devToolsLogTime}>[{entry.time}]</span>
                                <span className={styles.devToolsMono}>{entry.event}</span>
                                {entry.summary && <span className={styles.devToolsLogSummary}> — {entry.summary}</span>}
                            </div>
                        ))
                    )}
                </div>
            </Box>
        );
    }
}

EventTracerModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func,
    vm: PropTypes.shape({
        on: PropTypes.func,
        off: PropTypes.func
    })
};

export default injectIntl(EventTracerModal);

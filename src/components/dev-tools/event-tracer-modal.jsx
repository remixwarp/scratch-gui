import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import ModalComponent from '../modal/modal.jsx';
import Runtime from 'scratch-vm/src/engine/runtime.js';

import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Event Tracer',
        description: 'Title of the event tracer modal',
        id: 'rw.devtools.tracer.title'
    },
    started: {
        defaultMessage: 'Started',
        description: 'Started events filter',
        id: 'rw.devtools.tracer.started'
    },
    stopped: {
        defaultMessage: 'Stopped',
        description: 'Stopped events filter',
        id: 'rw.devtools.tracer.stopped'
    },
    errored: {
        defaultMessage: 'Errored',
        description: 'Errored events filter',
        id: 'rw.devtools.tracer.errored'
    },
    clear: {
        defaultMessage: 'Clear',
        description: 'Clear log button',
        id: 'rw.devtools.tracer.clear'
    },
    custom: {
        defaultMessage: 'Custom event',
        description: 'Custom event input label',
        id: 'rw.devtools.tracer.custom'
    },
    send: {
        defaultMessage: 'Send',
        description: 'Send custom event button',
        id: 'rw.devtools.tracer.send'
    },
    filter: {
        defaultMessage: 'Filter',
        description: 'Filter label',
        id: 'rw.devtools.tracer.filter'
    },
    all: {
        defaultMessage: 'All',
        description: 'All events filter',
        id: 'rw.devtools.tracer.all'
    },
    empty: {
        defaultMessage: 'No events captured yet. Start the project or send a custom event.',
        description: 'Empty tracer placeholder',
        id: 'rw.devtools.tracer.empty'
    },
    count: {
        defaultMessage: '{count}', // shown as badge
        description: 'Event count badge',
        id: 'rw.devtools.tracer.count'
    },
    at: {
        defaultMessage: 'at ',
        description: 'Time prefix',
        id: 'rw.devtools.tracer.at'
    }
});

const FILTERS = ['all', 'started', 'stopped', 'errored'];

class EventTracerModal extends React.Component {
    constructor (props) {
        super(props);
        this.handleRequestClose = this.handleRequestClose.bind(this);
        this.handleRuntimeEvent = this.handleRuntimeEvent.bind(this);
        this.handleClearLog = this.handleClearLog.bind(this);
        this.handleSetFilter = this.handleSetFilter.bind(this);
        this.handleCustomChange = this.handleCustomChange.bind(this);
        this.handleCustomKey = this.handleCustomKey.bind(this);
        this.handleSendCustom = this.handleSendCustom.bind(this);
        this.state = {
            events: [],
            filter: 'all',
            customValue: '',
            _mountError: false
        };
        this._customInput = null;
        this.perTypeCounts = {};
    }

    componentDidMount () {
        try {
            const vm = this.props.vm;
            if (vm && vm.runtime && typeof vm.runtime.on === 'function') {
                // 记录所有注册过的事件，卸载时统一移除，避免内存泄漏
                this._listeners = [
                    [Runtime.PROJECT_RUN_START, 'started'],
                    [Runtime.PROJECT_RUN_STOP, 'stopped'],
                    ['RUNTIME_ERROR', 'errored'],
                    ['PROJECT_START', 'started'],
                    ['PROJECT_STOP_ALL', 'stopped']
                ];
                this._listeners.forEach(([eventName, type]) => {
                    vm.runtime.on(eventName, payload =>
                        this.handleRuntimeEvent(eventName, type, payload));
                });
            }
        } catch (e) {
            console.error('[EventTracer] mount failed:', e);
            this.setState({_mountError: true});
        }
    }

    componentWillUnmount () {
        try {
            const vm = this.props.vm;
            if (vm && vm.runtime && typeof vm.runtime.off === 'function' && this._listeners) {
                this._listeners.forEach(([eventName]) => {
                    vm.runtime.off(eventName);
                });
                this._listeners = null;
            }
        } catch (e) {
            console.error('[EventTracer] unmount failed:', e);
        }
    }

    handleRequestClose () {
        try {
            if (this.props.onRequestClose) {
                this.props.onRequestClose();
            }
        } catch (e) {
            console.error('[EventTracer] close failed:', e);
        }
    }

    handleRuntimeEvent (name, type) {
        try {
            const time = new Date().toLocaleTimeString();
            this.perTypeCounts[type] = (this.perTypeCounts[type] || 0) + 1;
            this.setState(prev => ({
                events: [
                    ...prev.events,
                    {name, type, time, id: `${name}-${prev.events.length}`}
                ].slice(-200)
            }));
        } catch (e) {
            console.error('[EventTracer] handle event failed:', e);
        }
    }

    handleClearLog () {
        try {
            this.perTypeCounts = {};
            this.setState({events: []});
        } catch (e) {
            console.error('[EventTracer] clear log failed:', e);
        }
    }

    handleSetFilter (event) {
        try {
            const filter = event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.filter;
            if (filter != null) {
                this.setState({filter});
            }
        } catch (e) {
            console.error('[EventTracer] set filter failed:', e);
        }
    }

    handleCustomChange (e) {
        try {
            const value = e && e.target ? e.target.value : '';
            this.setState({customValue: value});
        } catch (e) {
            console.error('[EventTracer] custom change failed:', e);
        }
    }

    handleCustomKey (e) {
        try {
            if (e && e.key === 'Enter') {
                this.handleSendCustom();
            }
        } catch (err) {
            console.error('[EventTracer] custom key failed:', err);
        }
    }

    handleSendCustom () {
        try {
            const value = (this.state.customValue || '').trim();
            if (!value) return;
            this.handleRuntimeEvent(value, 'custom');
            this.setState({customValue: ''});
        } catch (e) {
            console.error('[EventTracer] send custom failed:', e);
        }
    }

    render () {
        const {intl} = this.props;
        try {
            if (this.state._mountError) {
                return this._renderErrorFallback();
            }
            const {events, filter, customValue} = this.state;
            const eventList = events || [];
            const visible = filter === 'all' ?
                eventList : eventList.filter(e => e && e.type === filter);

            return (
            <ModalComponent
                className={styles.devToolsModal}
                contentLabel={intl.formatMessage(messages.title)}
                onRequestClose={this.handleRequestClose}
            >
                <Box className={styles.devToolsBody}>
                    <Box className={styles.devToolsToolbar}>
                        <Box className={styles.devToolsFilters}>
                            {FILTERS.map(f => (
                                <button
                                    className={`${styles.devToolsFilterButton} ${
                                        filter === f ? styles.devToolsFilterActive : ''}`}
                                    data-filter={f}
                                    key={f}
                                    onClick={this.handleSetFilter}
                                    type="button"
                                >
                                    {intl.formatMessage(messages[f])}
                                    {f !== 'all' && this.perTypeCounts[f] ?
                                        <span className={styles.devToolsBadge}>
                                            {this.perTypeCounts[f]}
                                        </span> : null}
                                </button>
                            ))}
                        </Box>
                        <button
                            className={styles.devToolsButton}
                            onClick={this.handleClearLog}
                            type="button"
                        >
                            {intl.formatMessage(messages.clear)}
                        </button>
                    </Box>

                    <Box className={styles.devToolsCustomRow}>
                        <input
                            className={styles.devToolsInput}
                            onChange={this.handleCustomChange}
                            onKeyDown={this.handleCustomKey}
                            placeholder={intl.formatMessage(messages.custom)}
                            type="text"
                            value={customValue}
                        />
                        <button
                            className={styles.devToolsButton}
                            onClick={this.handleSendCustom}
                            type="button"
                        >
                            {intl.formatMessage(messages.send)}
                        </button>
                    </Box>

                    <Box className={styles.devToolsEventList}>
                        {visible.length === 0 ? (
                            <p className={styles.devToolsPlaceholder}>
                                {intl.formatMessage(messages.empty)}
                            </p>
                        ) : (
                            visible.map(event => (
                                <Box
                                    className={`${styles.devToolsEventItem} ${
                                        styles[`devToolsEvent_${event.type}`] || ''}`}
                                    key={event.id}
                                >
                                    <span className={styles.devToolsEventTime}>
                                        {intl.formatMessage(messages.at)}{event.time}
                                    </span>
                                    <span className={styles.devToolsEventName}>
                                        {event.name}
                                    </span>
                                </Box>
                            ))
                        )}
                    </Box>
                </Box>
            </ModalComponent>
            );
        } catch (e) {
            console.error('[EventTracer] render failed:', e);
            return this._renderErrorFallback();
        }
    }

    _renderErrorFallback () {
        const {intl, onRequestClose} = this.props;
        const close = () => {
            try { onRequestClose && onRequestClose(); } catch (_e) { /* ignore */ }
        };
        return (
            <ModalComponent
                className={styles.devToolsModal}
                contentLabel={intl && intl.formatMessage ? intl.formatMessage(messages.title) : 'Event Tracer'}
                onRequestClose={close}
            >
                <Box className={styles.devToolsBody}>
                    <p style={{color: '#f66', margin: '12px 0'}}>
                        事件追踪器加载失败，请关闭后重试。
                    </p>
                    <button
                        onClick={close}
                        style={{padding: '8px 16px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer'}}
                    >
                        关闭
                    </button>
                </Box>
            </ModalComponent>
        );
    }
}

EventTracerModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func,
    vm: PropTypes.shape({
        runtime: PropTypes.shape({
            on: PropTypes.func,
            off: PropTypes.func
        })
    })
};

export default injectIntl(EventTracerModal);

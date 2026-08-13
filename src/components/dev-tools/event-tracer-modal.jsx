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
            customValue: ''
        };
        this._customInput = null;
        this.perTypeCounts = {};
    }

    componentDidMount () {
        const vm = this.props.vm;
        if (vm && vm.runtime) {
            this._listeners = [
                [Runtime.PROJECT_RUN_START, 'started'],
                [Runtime.PROJECT_RUN_STOP, 'stopped']
            ];
            this._listeners.forEach(([eventName, type]) => {
                vm.runtime.on(eventName, () => this.handleRuntimeEvent(eventName, type));
            });
            if (vm.runtime.on && typeof vm.runtime.on === 'function') {
                vm.runtime.on('RUNTIME_ERROR', error =>
                    this.handleRuntimeEvent('RUNTIME_ERROR', 'errored', error));
            }
            vm.runtime.on('PROJECT_START', () =>
                this.handleRuntimeEvent('PROJECT_START', 'started'));
            vm.runtime.on('PROJECT_STOP_ALL', () =>
                this.handleRuntimeEvent('PROJECT_STOP_ALL', 'stopped'));
        }
    }

    componentWillUnmount () {
        const vm = this.props.vm;
        if (vm && vm.runtime && this._listeners) {
            this._listeners.forEach(([eventName]) => {
                vm.runtime.off(eventName);
            });
        }
    }

    handleRequestClose () {
        if (this.props.onRequestClose) {
            this.props.onRequestClose();
        }
    }

    handleRuntimeEvent (name, type) {
        const time = new Date().toLocaleTimeString();
        this.perTypeCounts[type] = (this.perTypeCounts[type] || 0) + 1;
        this.setState(prev => ({
            events: [
                ...prev.events,
                {name, type, time, id: `${name}-${prev.events.length}`}
            ].slice(-200)
        }));
    }

    handleClearLog () {
        this.perTypeCounts = {};
        this.setState({events: []});
    }

    handleSetFilter (event) {
        this.setState({filter: event.currentTarget.dataset.filter});
    }

    handleCustomChange (e) {
        this.setState({customValue: e.target.value});
    }

    handleCustomKey (e) {
        if (e.key === 'Enter') {
            this.handleSendCustom();
        }
    }

    handleSendCustom () {
        const value = this.state.customValue.trim();
        if (!value) return;
        this.handleRuntimeEvent(value, 'custom');
        this.setState({customValue: ''});
    }

    render () {
        const {intl} = this.props;
        const {events, filter, customValue} = this.state;
        const visible = filter === 'all' ?
            events : events.filter(e => e.type === filter);

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

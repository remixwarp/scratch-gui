import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';

import Modal from '../../containers/windowed-modal.jsx';
import {
    closeEventTracerModal
} from '../../reducers/modals';

import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Event Tracer',
        description: 'Title of the event tracer window',
        id: 'mw.devtools.tracer.title'
    },
    start: {
        defaultMessage: 'Start',
        description: 'Start tracing button',
        id: 'mw.devtools.tracer.start'
    },
    stop: {
        defaultMessage: 'Stop',
        description: 'Stop tracing button',
        id: 'mw.devtools.tracer.stop'
    },
    clear: {
        defaultMessage: 'Clear',
        description: 'Clear log button',
        id: 'mw.devtools.tracer.clear'
    },
    empty: {
        defaultMessage: 'Click "Start" to record VM events.',
        description: 'Message when no events',
        id: 'mw.devtools.tracer.empty'
    }
});

// VM events worth tracing (not low-level per-frame ticks)
const TRACED_EVENTS = [
    'PROJECT_RUN_START',
    'PROJECT_RUN_STOP',
    'PROJECT_CHANGED',
    'BLOCK_DRAG_START',
    'BLOCK_DRAG_END',
    'BLOCK_DRAG_UPDATE',
    'COMPILE_START',
    'COMPILE_SUCCESS',
    'COMPILE_FAILURE',
    'SCRIPT_GLOW_ON',
    'SCRIPT_GLOW_OFF',
    'BLOCK_GLOW_ON',
    'BLOCK_GLOW_OFF',
    'TURBO_MODE_ON',
    'TURBO_MODE_OFF',
    'RUNTIME_STARTED',
    'RUNTIME_STOPPED',
    'TARGETS_UPDATE',
    'MONITORS_UPDATE',
    'EXTENSION_ADDED',
    'PERMISSION_GRANTED',
    'HAS_CLOUD_DATA_UPDATE'
];

class EventTracerModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleStart', 'handleStop', 'handleClear', 'handleEvent']);
        this.state = {
            running: false,
            log: []
        };
    }
    handleEvent (eventName) {
        return (...args) => {
            if (!this._mounted) return;
            const entry = {
                time: new Date().toLocaleTimeString(),
                event: eventName,
                detail: args.length > 0 ? JSON.stringify(args.slice(0, 2)) : ''
            };
            this.setState(prev => ({
                log: [entry, ...prev.log].slice(0, 500)
            }));
        };
    }
    handleStart () {
        const vm = this.props.vm;
        if (!vm) return;
        this._handlers = {};
        for (const eventName of TRACED_EVENTS) {
            const handler = this.handleEvent(eventName);
            this._handlers[eventName] = handler;
            vm.on(eventName, handler);
        }
        this.setState({running: true});
    }
    handleStop () {
        const vm = this.props.vm;
        if (vm && this._handlers) {
            for (const eventName of Object.keys(this._handlers)) {
                vm.removeListener(eventName, this._handlers[eventName]);
            }
        }
        this._handlers = null;
        this.setState({running: false});
    }
    handleClear () {
        this.setState({log: []});
    }
    componentDidMount () {
        this._mounted = true;
    }
    componentWillUnmount () {
        this._mounted = false;
        this.handleStop();
    }
    render () {
        const intl = this.props.intl;
        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onClose}
                id="eventTracerModal"
                showClose={false}
            >
                <div className={styles.header}>
                    <h2 className={styles.title}>{intl.formatMessage(messages.title)}</h2>
                    <div className={styles.buttons}>
                        {this.state.running ? (
                            <button
                                className={styles.buttonDanger}
                                onClick={this.handleStop}
                            >
                                {intl.formatMessage(messages.stop)}
                            </button>
                        ) : (
                            <button
                                className={styles.button}
                                onClick={this.handleStart}
                            >
                                {intl.formatMessage(messages.start)}
                            </button>
                        )}
                        <button
                            className={styles.button}
                            onClick={this.handleClear}
                        >
                            {intl.formatMessage(messages.clear)}
                        </button>
                    </div>
                </div>
                <div className={styles.body}>
                    {this.state.log.length === 0 ? (
                        <p className={styles.empty}>{intl.formatMessage(messages.empty)}</p>
                    ) : (
                        <div className={styles.log}>
                            {this.state.log.map((entry, i) => (
                                <div
                                    className={styles.logEntry}
                                    key={`${entry.time}-${i}`}
                                >
                                    <span className={styles.value}>{entry.time}</span>{' '}
                                    <strong>{entry.event}</strong>
                                    {entry.detail ? ` ${entry.detail}` : ''}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        );
    }
}

EventTracerModal.propTypes = {
    intl: intlShape,
    vm: PropTypes.shape({
        on: PropTypes.func,
        removeListener: PropTypes.func
    }),
    onClose: PropTypes.func
};

const mapStateToProps = () => ({});
const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeEventTracerModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(EventTracerModal));

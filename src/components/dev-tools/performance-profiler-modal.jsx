import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';

import Modal from '../../containers/windowed-modal.jsx';
import {
    closePerformanceProfilerModal
} from '../../reducers/modals';

import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Performance Profiler',
        description: 'Title of the performance profiler window',
        id: 'mw.devtools.profiler.title'
    },
    start: {
        defaultMessage: 'Start',
        description: 'Start profiling button',
        id: 'mw.devtools.profiler.start'
    },
    stop: {
        defaultMessage: 'Stop',
        description: 'Stop profiling button',
        id: 'mw.devtools.profiler.stop'
    },
    clear: {
        defaultMessage: 'Clear',
        description: 'Clear profiling data button',
        id: 'mw.devtools.profiler.clear'
    },
    empty: {
        defaultMessage: 'Click "Start" to record frame timings while the project runs.',
        description: 'Message when no profiling data',
        id: 'mw.devtools.profiler.empty'
    },
    opcode: {
        defaultMessage: 'Block',
        description: 'Column header: block opcode',
        id: 'mw.devtools.profiler.opcode'
    },
    count: {
        defaultMessage: 'Count',
        description: 'Column header: execution count',
        id: 'mw.devtools.profiler.count'
    },
    total: {
        defaultMessage: 'Total time',
        description: 'Column header: total time',
        id: 'mw.devtools.profiler.total'
    },
    average: {
        defaultMessage: 'Average',
        description: 'Column header: average time',
        id: 'mw.devtools.profiler.average'
    }
});

class PerformanceProfilerModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleStart', 'handleStop', 'handleClear', 'handleFrame']);
        this.state = {
            running: false,
            data: {}, // opcode -> {count, total}
            frames: 0
        };
    }
    handleFrame (frame) {
        if (!this._mounted) return;
        const next = {...this.state.data};
        for (const record of frame.records) {
            const opcode = record.blockOpcode;
            if (!opcode) continue;
            const existing = next[opcode] || {count: 0, total: 0};
            existing.count += 1;
            existing.total += record.time;
            next[opcode] = existing;
        }
        this.setState({
            data: next,
            frames: this.state.frames + 1
        });
    }
    handleStart () {
        const vm = this.props.vm;
        if (vm && vm.runtime && typeof vm.runtime.enableProfiling === 'function') {
            vm.runtime.enableProfiling(this.handleFrame);
            this.setState({running: true});
        }
    }
    handleStop () {
        const vm = this.props.vm;
        if (vm && vm.runtime && typeof vm.runtime.disableProfiling === 'function') {
            vm.runtime.disableProfiling();
        }
        this.setState({running: false});
    }
    handleClear () {
        this.setState({data: {}, frames: 0});
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
        const rows = Object.keys(this.state.data)
            .map(opcode => ({
                opcode,
                count: this.state.data[opcode].count,
                total: this.state.data[opcode].total
            }))
            .sort((a, b) => b.total - a.total);
        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onClose}
                id="performanceProfilerModal"
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
                    {rows.length === 0 ? (
                        <p className={styles.empty}>{intl.formatMessage(messages.empty)}</p>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>{intl.formatMessage(messages.opcode)}</th>
                                    <th>{intl.formatMessage(messages.count)}</th>
                                    <th>{intl.formatMessage(messages.total)}</th>
                                    <th>{intl.formatMessage(messages.average)}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.opcode}>
                                        <td className={styles.mono}>{row.opcode}</td>
                                        <td>{row.count}</td>
                                        <td>{`${row.total.toFixed(2)} ms`}</td>
                                        <td>{`${(row.total / row.count).toFixed(3)} ms`}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Modal>
        );
    }
}

PerformanceProfilerModal.propTypes = {
    intl: intlShape,
    vm: PropTypes.shape({
        runtime: PropTypes.shape({
            enableProfiling: PropTypes.func,
            disableProfiling: PropTypes.func
        })
    }),
    onClose: PropTypes.func
};

const mapStateToProps = () => ({});
const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closePerformanceProfilerModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(PerformanceProfilerModal));

import bindAll from 'lodash.bindall';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Performance Profiler',
        description: 'Title for the performance profiler tool',
        id: 'gui.devTools.performanceProfiler.title'
    },
    subtitle: {
        defaultMessage: '实时统计每个积木类型的执行频率与每帧耗时。',
        description: 'Subtitle for the performance profiler tool',
        id: 'gui.devTools.performanceProfiler.subtitle'
    },
    start: {
        defaultMessage: 'Start',
        description: 'Start profiling button',
        id: 'gui.devTools.performanceProfiler.start'
    },
    stop: {
        defaultMessage: 'Stop',
        description: 'Stop profiling button',
        id: 'gui.devTools.performanceProfiler.stop'
    },
    reset: {
        defaultMessage: 'Reset',
        description: 'Reset profiling data button',
        id: 'gui.devTools.performanceProfiler.reset'
    },
    statusIdle: {
        defaultMessage: '空闲（未开始）',
        description: 'Profiler idle status',
        id: 'gui.devTools.performanceProfiler.statusIdle'
    },
    statusRunning: {
        defaultMessage: '采集中…',
        description: 'Profiler running status',
        id: 'gui.devTools.performanceProfiler.statusRunning'
    },
    frameTime: {
        defaultMessage: '平均帧耗时',
        description: 'Average frame time label',
        id: 'gui.devTools.performanceProfiler.frameTime'
    },
    fps: {
        defaultMessage: '估算帧率',
        description: 'Estimated FPS label',
        id: 'gui.devTools.performanceProfiler.fps'
    },
    totalSteps: {
        defaultMessage: '累计执行积木',
        description: 'Total executed blocks label',
        id: 'gui.devTools.performanceProfiler.totalSteps'
    },
    opcodesHeader: {
        defaultMessage: '积木类型执行排行（按执行次数）',
        description: 'Opcodes table header',
        id: 'gui.devTools.performanceProfiler.opcodesHeader'
    },
    opcodeColumn: {
        defaultMessage: '积木类型',
        description: 'Opcode column header',
        id: 'gui.devTools.performanceProfiler.opcodeColumn'
    },
    countColumn: {
        defaultMessage: '执行次数',
        description: 'Count column header',
        id: 'gui.devTools.performanceProfiler.countColumn'
    },
    noData: {
        defaultMessage: '尚无数据，点击 Start 后运行绿旗即可看到统计。',
        description: 'No data placeholder',
        id: 'gui.devTools.performanceProfiler.noData'
    },
    runningTargets: {
        defaultMessage: '活跃执行线程',
        description: 'Running threads label',
        id: 'gui.devTools.performanceProfiler.runningThreads'
    }
});

class PerformanceProfilerModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleStart',
            'handleStop',
            'handleReset',
            'tick',
            'patchRuntime',
            'unpatchRuntime'
        ]);
        this.state = {
            running: false,
            frameTimes: [],
            totalSteps: 0,
            opcodeCounts: {},
            activeThreads: 0,
            lastUpdate: 0
        };
        this._raf = null;
        this._originalStepThread = null;
        this._instrumented = false;
    }

    componentWillUnmount () {
        this.unpatchRuntime();
        if (this._raf) {
            window.cancelAnimationFrame(this._raf);
            this._raf = null;
        }
    }

    patchRuntime () {
        const vm = this.props.vm;
        if (!vm || !vm.runtime || typeof vm.runtime._stepThread !== 'function') return;
        if (this._instrumented) return;
        this._instrumented = true;
        this._originalStepThread = vm.runtime._stepThread;

        // Count how many blocks each opcode executed by inspecting the
        // active thread's current block before stepping.
        const self = this;
        vm.runtime._stepThread = function (thread, ...args) {
            try {
                if (thread && thread.peekStack) {
                    const opcode = thread.target && thread.target.blocks ?
                        self.getOpcodeForThread(thread) : null;
                    if (opcode) {
                        self.state.opcodeCounts[opcode] = (self.state.opcodeCounts[opcode] || 0) + 1;
                    }
                }
            } catch (e) {
                // Never let instrumentation break the VM.
            }
            return self._originalStepThread.call(this, thread, ...args);
        };
    }

    getOpcodeForThread (thread) {
        try {
            const blockId = thread.peekStack();
            if (!blockId) return null;
            const blocks = thread.target.blocks;
            const block = blocks.getBlock && blocks.getBlock(blockId);
            return block ? block.opcode : null;
        } catch (e) {
            return null;
        }
    }

    unpatchRuntime () {
        const vm = this.props.vm;
        if (this._instrumented && this._originalStepThread && vm && vm.runtime) {
            try {
                vm.runtime._stepThread = this._originalStepThread;
            } catch (e) {
                // ignore
            }
        }
        this._instrumented = false;
        this._originalStepThread = null;
    }

    handleStart () {
        const vm = this.props.vm;
        if (vm && vm.runtime) {
            // Reset counters but keep window open.
            this.setState({
                running: true,
                frameTimes: [],
                totalSteps: 0,
                opcodeCounts: {},
                activeThreads: 0
            });
            this.patchRuntime();
            this.lastFrameTs = performance.now();
            this.tick();
        }
    }

    handleStop () {
        this.setState({running: false});
        this.unpatchRuntime();
        if (this._raf) {
            window.cancelAnimationFrame(this._raf);
            this._raf = null;
        }
    }

    handleReset () {
        this.setState({
            running: false,
            frameTimes: [],
            totalSteps: 0,
            opcodeCounts: {},
            activeThreads: 0
        });
        this.unpatchRuntime();
    }

    tick () {
        if (!this.state.running) return;
        const now = performance.now();
        const vm = this.props.vm;
        const delta = now - (this.lastFrameTs || now);
        this.lastFrameTs = now;

        const frameTimes = this.state.frameTimes.concat(delta);
        if (frameTimes.length > 120) frameTimes.shift();

        let activeThreads = 0;
        let totalSteps = this.state.totalSteps;
        try {
            const threads = vm.runtime.threads || [];
            activeThreads = threads.filter(t => !t.stack.length || t.status === 0).length ||
                threads.length;
            totalSteps = Object.values(this.state.opcodeCounts).reduce((a, b) => a + b, 0);
        } catch (e) {
            // ignore
        }

        // Throttle React updates to ~4fps to avoid overhead.
        if (now - this.state.lastUpdate > 250) {
            this.setState({
                frameTimes,
                activeThreads,
                totalSteps,
                lastUpdate: now
            });
        } else {
            this.setState({frameTimes, activeThreads, totalSteps});
        }
        this._raf = window.requestAnimationFrame(this.tick);
    }

    render () {
        const {intl} = this.props;
        const {running, frameTimes, totalSteps, opcodeCounts, activeThreads} = this.state;

        const avgFrame = frameTimes.length ?
            frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
        const estFps = avgFrame > 0 ? Math.round(1000 / avgFrame) : 0;

        const sortedOpcodes = Object.entries(opcodeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25);

        return (
            <Box className={styles.devToolsContainer}>
                <h2 className={styles.devToolsTitle}>{intl.formatMessage(messages.title)}</h2>
                <p className={styles.devToolsSubtitle}>{intl.formatMessage(messages.subtitle)}</p>

                <div className={styles.devToolsButtonRow}>
                    {!running ? (
                        <button
                            className={styles.devToolsPrimaryButton}
                            onClick={this.handleStart}
                        >
                            {intl.formatMessage(messages.start)}
                        </button>
                    ) : (
                        <button
                            className={styles.devToolsDangerButton}
                            onClick={this.handleStop}
                        >
                            {intl.formatMessage(messages.stop)}
                        </button>
                    )}
                    <button
                        className={styles.devToolsSecondaryButton}
                        onClick={this.handleReset}
                    >
                        {intl.formatMessage(messages.reset)}
                    </button>
                    <span className={running ? styles.devToolsStatusRunning : styles.devToolsStatusIdle}>
                        {running ?
                            intl.formatMessage(messages.statusRunning) :
                            intl.formatMessage(messages.statusIdle)}
                    </span>
                </div>

                <div className={styles.devToolsStatGrid}>
                    <div className={styles.devToolsStatCard}>
                        <div className={styles.devToolsStatValue}>
                            {avgFrame.toFixed(2)} ms
                        </div>
                        <div className={styles.devToolsStatLabel}>
                            {intl.formatMessage(messages.frameTime)}
                        </div>
                    </div>
                    <div className={styles.devToolsStatCard}>
                        <div className={styles.devToolsStatValue}>
                            {estFps}
                        </div>
                        <div className={styles.devToolsStatLabel}>
                            {intl.formatMessage(messages.fps)}
                        </div>
                    </div>
                    <div className={styles.devToolsStatCard}>
                        <div className={styles.devToolsStatValue}>
                            {totalSteps}
                        </div>
                        <div className={styles.devToolsStatLabel}>
                            {intl.formatMessage(messages.totalSteps)}
                        </div>
                    </div>
                    <div className={styles.devToolsStatCard}>
                        <div className={styles.devToolsStatValue}>
                            {activeThreads}
                        </div>
                        <div className={styles.devToolsStatLabel}>
                            {intl.formatMessage(messages.runningTargets)}
                        </div>
                    </div>
                </div>

                <h4 className={styles.devToolsSectionTitle}>
                    {intl.formatMessage(messages.opcodesHeader)}
                </h4>
                {sortedOpcodes.length === 0 ? (
                    <p className={styles.devToolsEmpty}>
                        {intl.formatMessage(messages.noData)}
                    </p>
                ) : (
                    <div className={styles.devToolsTableWrap}>
                        <table className={styles.devToolsTable}>
                            <thead>
                                <tr>
                                    <th>{intl.formatMessage(messages.opcodeColumn)}</th>
                                    <th className={styles.devToolsTableNum}>
                                        {intl.formatMessage(messages.countColumn)}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedOpcodes.map(([opcode, count]) => (
                                    <tr key={opcode}>
                                        <td className={styles.devToolsMono}>{opcode}</td>
                                        <td className={styles.devToolsTableNum}>{count.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Box>
        );
    }
}

PerformanceProfilerModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func,
    vm: PropTypes.shape({
        runtime: PropTypes.shape({
            threads: PropTypes.array,
            _stepThread: PropTypes.func
        })
    })
};

export default injectIntl(PerformanceProfilerModal);

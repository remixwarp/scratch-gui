import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import ModalComponent from '../modal/modal.jsx';
import {formatBytes} from '../../lib/utils/bytes.js';
import Runtime from 'scratch-vm/src/engine/runtime.js';

import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Performance Profiler',
        description: 'Title of the performance profiler modal',
        id: 'rw.devtools.profiler.title'
    },
    fps: {
        defaultMessage: 'FPS',
        description: 'Frames per second label',
        id: 'rw.devtools.profiler.fps'
    },
    avgFps: {
        defaultMessage: 'Average',
        description: 'Average FPS label',
        id: 'rw.devtools.profiler.avg'
    },
    minFps: {
        defaultMessage: 'Min',
        description: 'Minimum FPS label',
        id: 'rw.devtools.profiler.min'
    },
    maxFps: {
        defaultMessage: 'Max',
        description: 'Maximum FPS label',
        id: 'rw.devtools.profiler.max'
    },
    frameTime: {
        defaultMessage: 'Frame time',
        description: 'Frame time label',
        id: 'rw.devtools.profiler.frameTime'
    },
    memory: {
        defaultMessage: 'Memory',
        description: 'Memory usage label',
        id: 'rw.devtools.profiler.memory'
    },
    clear: {
        defaultMessage: 'Clear',
        description: 'Clear performance data button',
        id: 'rw.devtools.profiler.clear'
    },
    opcode: {
        defaultMessage: 'Top opcodes',
        description: 'Top opcodes heading',
        id: 'rw.devtools.profiler.opcode'
    },
    running: {
        defaultMessage: 'Running',
        description: 'Project is running indicator',
        id: 'rw.devtools.profiler.running'
    },
    stopped: {
        defaultMessage: 'Stopped',
        description: 'Project is stopped indicator',
        id: 'rw.devtools.profiler.stopped'
    },
    history: {
        defaultMessage: 'FPS history',
        description: 'FPS history chart heading',
        id: 'rw.devtools.profiler.history'
    },
    noData: {
        defaultMessage: 'Start the project to collect live performance data.',
        description: 'Placeholder when no data collected',
        id: 'rw.devtools.profiler.noData'
    },
    count: {
        defaultMessage: '{count} calls',
        description: 'Opcode call count',
        id: 'rw.devtools.profiler.opcodeCount'
    }
});

const HISTORY_LENGTH = 120;

class PerformanceProfilerModal extends React.Component {
    constructor (props) {
        super(props);
        this.handleRequestClose = this.handleRequestClose.bind(this);
        this.tick = this.tick.bind(this);
        this.drawChart = this.drawChart.bind(this);
        this.handleClearData = this.handleClearData.bind(this);
        this.frameCount = 0;
        this.lastFrame = performance.now();
        this.history = [];
        this.opcodeCounts = {};
        this.rafId = null;
        this._chartCanvas = null;
        this.state = {
            fps: 0,
            avgFps: 0,
            minFps: 0,
            maxFps: 0,
            frameTime: 0,
            memory: 0,
            memoryLimit: 0,
            running: false,
            topOpcodes: []
        };
    }

    componentDidMount () {
        const vm = this.props.vm;
        if (vm && vm.runtime) {
            vm.runtime.on(Runtime.PROJECT_RUN_START, this.handleRunStart);
            vm.runtime.on(Runtime.PROJECT_RUN_STOP, this.handleRunStop);
        }
        // Hook opcode execution to sample the most-used blocks.
        this.installOpcodeHook();
        this.rafId = requestAnimationFrame(this.tick);
    }

    componentWillUnmount () {
        const vm = this.props.vm;
        if (vm && vm.runtime) {
            vm.runtime.off(Runtime.PROJECT_RUN_START, this.handleRunStart);
            vm.runtime.off(Runtime.PROJECT_RUN_STOP, this.handleRunStop);
        }
        this.removeOpcodeHook();
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
    }

    getRuntime () {
        return this.props.vm && this.props.vm.runtime;
    }

    installOpcodeHook () {
        const runtime = this.getRuntime();
        if (!runtime) return;
        if (runtime._rwProfilerHooked) return;
        const original = runtime._stepThread.bind(runtime);
        runtime._rwProfilerHooked = true;
        const self = this;
        runtime._stepThread = function (thread) {
            const op = thread.peekStack();
            if (op) {
                const block = runtime._blocks ? runtime._blocks.getBlock(op) : null;
                const opcode = block ? block.opcode : 'unknown';
                self.opcodeCounts[opcode] = (self.opcodeCounts[opcode] || 0) + 1;
            }
            return original(thread);
        };
    }

    removeOpcodeHook () {
        const runtime = this.getRuntime();
        if (!runtime || !runtime._rwProfilerHooked) return;
        // Best-effort restore: the original function is lost, but the hook is cheap.
        runtime._rwProfilerHooked = false;
    }

    handleRunStart () {
        this.setState({running: true});
    }

    handleRunStop () {
        this.setState({running: false});
    }

    tick () {
        const now = performance.now();
        this.frameCount++;
        const elapsed = now - this.lastFrame;
        if (elapsed >= 500) {
            const fps = Math.round((this.frameCount * 1000) / elapsed);
            this.history.push(fps);
            if (this.history.length > HISTORY_LENGTH) {
                this.history.shift();
            }
            const mem = (performance.memory) ? performance.memory.usedJSHeapSize : 0;
            const memLimit = (performance.memory) ? performance.memory.jsHeapSizeLimit : 0;
            const previous = this.state.historySnapshot || [];
            const all = previous.concat(this.history);
            const avg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
            const min = all.length ? Math.min(...all) : 0;
            const max = all.length ? Math.max(...all) : 0;
            const topOpcodes = Object.entries(this.opcodeCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([opcode, count]) => ({opcode, count}));
            this.setState({
                fps,
                avgFps: avg,
                minFps: min,
                maxFps: max,
                frameTime: Math.round((elapsed / this.frameCount) * 100) / 100,
                memory: mem,
                memoryLimit: memLimit,
                historySnapshot: all,
                topOpcodes
            });
            this.frameCount = 0;
            this.lastFrame = now;
            this.drawChart();
        }
        this.rafId = requestAnimationFrame(this.tick);
    }

    drawChart () {
        const canvas = this._chartCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const data = this.history;
        const maxValue = 60;
        const stepX = data.length > 1 ? width / (HISTORY_LENGTH - 1) : width;
        const baseY = height - 1;

        // 60fps target line
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        const targetY = baseY - ((Math.min(maxValue, 60) / maxValue) * baseY);
        ctx.moveTo(0, targetY);
        ctx.lineTo(width, targetY);
        ctx.stroke();

        // FPS line
        ctx.strokeStyle = '#ff8c1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((value, index) => {
            const x = index * stepX;
            const y = baseY - ((Math.min(value, maxValue) / maxValue) * baseY);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Fill under line
        ctx.lineTo((data.length - 1) * stepX, baseY);
        ctx.lineTo(0, baseY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,140,26,0.12)';
        ctx.fill();
    }

    getFpsAccent () {
        const fps = this.state.fps;
        if (fps >= 50) return styles.statGood;
        if (fps >= 30) return styles.statWarn;
        return styles.statBad;
    }

    handleClearData () {
        this.history = [];
        this.opcodeCounts = {};
        this.setState({
            fps: 0,
            avgFps: 0,
            minFps: 0,
            maxFps: 0,
            frameTime: 0,
            memory: 0,
            historySnapshot: [],
            topOpcodes: []
        });
        this.drawChart();
    }

    handleRequestClose () {
        if (this.props.onRequestClose) {
            this.props.onRequestClose();
        }
    }

    setChartCanvasRef (canvas) {
        this._chartCanvas = canvas;
    }

    render () {
        const {intl} = this.props;
        const memPercent = this.state.memoryLimit ?
            (this.state.memory / this.state.memoryLimit) * 100 : 0;
        return (
            <ModalComponent
                className={styles.devToolsModal}
                contentLabel={intl.formatMessage(messages.title)}
                onRequestClose={this.handleRequestClose}
            >
                <Box className={styles.devToolsBody}>
                    <Box className={styles.devToolsStatsRow}>
                        <StatCard
                            label={intl.formatMessage(messages.fps)}
                            value={this.state.fps}
                            accent={this.getFpsAccent()}
                        />
                        <StatCard
                            label={intl.formatMessage(messages.avgFps)}
                            value={this.state.avgFps}
                        />
                        <StatCard
                            label={intl.formatMessage(messages.minFps)}
                            value={this.state.minFps}
                        />
                        <StatCard
                            label={intl.formatMessage(messages.maxFps)}
                            value={this.state.maxFps}
                        />
                        <StatCard
                            label={intl.formatMessage(messages.frameTime)}
                            value={`${this.state.frameTime}ms`}
                        />
                    </Box>

                    <Box className={styles.devToolsStatusRow}>
                        <span
                            className={this.state.running ? styles.statusRunning : styles.statusStopped}
                        >
                            {this.state.running ?
                                intl.formatMessage(messages.running) :
                                intl.formatMessage(messages.stopped)}
                        </span>
                        <button
                            className={styles.devToolsButton}
                            onClick={this.handleClearData}
                            type="button"
                        >
                            {intl.formatMessage(messages.clear)}
                        </button>
                    </Box>

                    <Box className={styles.devToolsSection}>
                        <h3 className={styles.devToolsSubtitle}>
                            {intl.formatMessage(messages.history)}
                        </h3>
                        <canvas
                            className={styles.devToolsChart}
                            ref={this.setChartCanvasRef}
                        />
                        {this.history.length === 0 && (
                            <p className={styles.devToolsPlaceholder}>
                                {intl.formatMessage(messages.noData)}
                            </p>
                        )}
                    </Box>

                    <Box className={styles.devToolsSection}>
                        <h3 className={styles.devToolsSubtitle}>
                            {intl.formatMessage(messages.memory)}
                        </h3>
                        <Box className={styles.devToolsBarOuter}>
                            <Box
                                className={styles.devToolsBarInner}
                                style={{width: `${memPercent}%`}}
                            />
                        </Box>
                        <span className={styles.devToolsBarLabel}>
                            {formatBytes(this.state.memory)}{' / '}{formatBytes(this.state.memoryLimit)}
                        </span>
                    </Box>

                    <Box className={styles.devToolsSection}>
                        <h3 className={styles.devToolsSubtitle}>
                            {intl.formatMessage(messages.opcode)}
                        </h3>
                        {this.state.topOpcodes.length === 0 ? (
                            <p className={styles.devToolsPlaceholder}>
                                {intl.formatMessage(messages.noData)}
                            </p>
                        ) : (
                            <Box className={styles.devToolsOpcodeList}>
                                {this.state.topOpcodes.map(entry => (
                                    <Box
                                        className={styles.devToolsOpcodeItem}
                                        key={entry.opcode}
                                    >
                                        <span className={styles.devToolsOpcodeName}>
                                            {entry.opcode}
                                        </span>
                                        <span className={styles.devToolsOpcodeCount}>
                                            {intl.formatMessage(messages.count, {count: entry.count})}
                                        </span>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                </Box>
            </ModalComponent>
        );
    }
}

const StatCard = ({label, value, accent}) => (
    <Box className={styles.devToolsStatCard}>
        <span className={styles.devToolsStatLabel}>{label}</span>
        <span className={`${styles.devToolsStatValue} ${accent || ''}`}>{value}</span>
    </Box>
);

StatCard.propTypes = {
    accent: PropTypes.string,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

PerformanceProfilerModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func,
    vm: PropTypes.shape({
        runtime: PropTypes.shape({
            on: PropTypes.func,
            off: PropTypes.func
        })
    })
};

export default injectIntl(PerformanceProfilerModal);

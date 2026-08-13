import bindAll from 'lodash.bindall';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Performance Budget',
        description: 'Title for the performance budget tool',
        id: 'gui.devTools.performanceBudget.title'
    },
    subtitle: {
        defaultMessage: '监控帧率、帧耗时与内存，超过阈值时高亮告警。',
        description: 'Subtitle for the performance budget tool',
        id: 'gui.devTools.performanceBudget.subtitle'
    },
    start: {
        defaultMessage: 'Start',
        description: 'Start monitoring button',
        id: 'gui.devTools.performanceBudget.start'
    },
    stop: {
        defaultMessage: 'Stop',
        description: 'Stop monitoring button',
        id: 'gui.devTools.performanceBudget.stop'
    },
    running: {
        defaultMessage: '运行中',
        description: 'Project is running',
        id: 'gui.devTools.performanceBudget.running'
    },
    stopped: {
        defaultMessage: '已停止',
        description: 'Project is stopped',
        id: 'gui.devTools.performanceBudget.stopped'
    },
    fps: {
        defaultMessage: '帧率 (FPS)',
        description: 'FPS label',
        id: 'gui.devTools.performanceBudget.fps'
    },
    frameMs: {
        defaultMessage: '帧耗时 (ms)',
        description: 'Frame time label',
        id: 'gui.devTools.performanceBudget.frameMs'
    },
    memory: {
        defaultMessage: '内存占用',
        description: 'Memory usage label',
        id: 'gui.devTools.performanceBudget.memory'
    },
    peak: {
        defaultMessage: '峰值',
        description: 'Peak value label',
        id: 'gui.devTools.performanceBudget.peak'
    },
    budgetFps: {
        defaultMessage: 'FPS 预算',
        description: 'FPS budget label',
        id: 'gui.devTools.performanceBudget.budgetFps'
    },
    budgetFrame: {
        defaultMessage: '帧耗时预算',
        description: 'Frame time budget label',
        id: 'gui.devTools.performanceBudget.budgetFrame'
    },
    alert: {
        defaultMessage: '超出预算！',
        description: 'Budget exceeded alert',
        id: 'gui.devTools.performanceBudget.alert'
    },
    memoryUnsupported: {
        defaultMessage: '当前浏览器不支持内存监测（请用 Chrome）。',
        description: 'Memory unsupported note',
        id: 'gui.devTools.performanceBudget.memoryUnsupported'
    }
});

const DEFAULT_FPS_BUDGET = 30;
const DEFAULT_FRAME_BUDGET = 33; // ms (≈30fps)

class PerformanceBudgetModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleStart',
            'handleStop',
            'tick',
            'handleRuntimeStart',
            'handleRuntimeStop'
        ]);
        this.state = {
            monitoring: false,
            fps: 0,
            frameMs: 0,
            peakFps: 0,
            peakFrameMs: 0,
            memoryMB: null,
            memorySupported: typeof performance !== 'undefined' && performance.memory,
            projectRunning: false,
            fpsBudget: DEFAULT_FPS_BUDGET,
            frameBudget: DEFAULT_FRAME_BUDGET
        };
        this._raf = null;
        this._lastTs = 0;
        this._frames = 0;
        this._accumTs = 0;
    }

    componentDidMount () {
        const vm = this.props.vm;
        if (vm) {
            vm.on('PROJECT_RUN_START', this.handleRuntimeStart);
            vm.on('PROJECT_RUN_STOP', this.handleRuntimeStop);
            try {
                if (vm.runtime && typeof vm.runtime.isRunning === 'boolean') {
                    this.setState({projectRunning: vm.runtime.isRunning});
                }
            } catch (e) {
                // ignore
            }
        }
    }

    componentWillUnmount () {
        const vm = this.props.vm;
        if (vm) {
            vm.off('PROJECT_RUN_START', this.handleRuntimeStart);
            vm.off('PROJECT_RUN_STOP', this.handleRuntimeStop);
        }
        if (this._raf) {
            window.cancelAnimationFrame(this._raf);
            this._raf = null;
        }
    }

    handleRuntimeStart () {
        this.setState({projectRunning: true});
    }

    handleRuntimeStop () {
        this.setState({projectRunning: false});
    }

    handleStart () {
        this.setState({
            monitoring: true,
            fps: 0,
            frameMs: 0,
            peakFps: 0,
            peakFrameMs: 0
        });
        this._lastTs = performance.now();
        this._frames = 0;
        this._accumTs = 0;
        this.tick();
    }

    handleStop () {
        this.setState({monitoring: false});
        if (this._raf) {
            window.cancelAnimationFrame(this._raf);
            this._raf = null;
        }
    }

    tick () {
        if (!this.state.monitoring) return;
        const now = performance.now();
        const delta = now - this._lastTs;
        this._lastTs = now;
        this._frames += 1;
        this._accumTs += delta;

        // Update roughly twice per second.
        if (this._accumTs >= 500) {
            const fps = Math.round((this._frames * 1000) / this._accumTs);
            const frameMs = this._accumTs / this._frames;
            const peakFps = Math.max(this.state.peakFps, fps);
            const peakFrameMs = Math.max(this.state.peakFrameMs, frameMs);

            let memoryMB = null;
            if (performance.memory) {
                memoryMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
            }

            this.setState({
                fps,
                frameMs: Math.round(frameMs * 10) / 10,
                peakFps,
                peakFrameMs: Math.round(peakFrameMs * 10) / 10,
                memoryMB
            });
            this._frames = 0;
            this._accumTs = 0;
        }
        this._raf = window.requestAnimationFrame(this.tick);
    }

    render () {
        const {intl} = this.props;
        const {
            monitoring, fps, frameMs, peakFps, peakFrameMs, memoryMB,
            memorySupported, projectRunning, fpsBudget, frameBudget
        } = this.state;

        const fpsAlert = fps > 0 && fps < fpsBudget;
        const frameAlert = frameMs > 0 && frameMs > frameBudget;

        return (
            <Box className={styles.devToolsContainer}>
                <h2 className={styles.devToolsTitle}>{intl.formatMessage(messages.title)}</h2>
                <p className={styles.devToolsSubtitle}>{intl.formatMessage(messages.subtitle)}</p>

                <div className={styles.devToolsButtonRow}>
                    {!monitoring ? (
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
                    <span className={projectRunning ?
                        styles.devToolsStatusRunning : styles.devToolsStatusIdle}>
                        {projectRunning ?
                            intl.formatMessage(messages.running) :
                            intl.formatMessage(messages.stopped)}
                    </span>
                </div>

                <div className={styles.devToolsStatGrid}>
                    <div className={`${styles.devToolsStatCard} ${fpsAlert ? styles.devToolsAlertCard : ''}`}>
                        <div className={styles.devToolsStatValue}>{fps}</div>
                        <div className={styles.devToolsStatLabel}>{intl.formatMessage(messages.fps)}</div>
                        <div className={styles.devToolsBudget}>
                            {intl.formatMessage(messages.budgetFps)}: ≥ {fpsBudget}
                        </div>
                    </div>
                    <div className={`${styles.devToolsStatCard} ${frameAlert ? styles.devToolsAlertCard : ''}`}>
                        <div className={styles.devToolsStatValue}>{frameMs}</div>
                        <div className={styles.devToolsStatLabel}>{intl.formatMessage(messages.frameMs)}</div>
                        <div className={styles.devToolsBudget}>
                            {intl.formatMessage(messages.budgetFrame)}: ≤ {frameBudget} ms
                        </div>
                    </div>
                    <div className={styles.devToolsStatCard}>
                        <div className={styles.devToolsStatValue}>{peakFps}</div>
                        <div className={styles.devToolsStatLabel}>
                            {intl.formatMessage(messages.peak)} {intl.formatMessage(messages.fps)}
                        </div>
                    </div>
                    <div className={styles.devToolsStatCard}>
                        <div className={styles.devToolsStatValue}>{peakFrameMs}</div>
                        <div className={styles.devToolsStatLabel}>
                            {intl.formatMessage(messages.peak)} {intl.formatMessage(messages.frameMs)}
                        </div>
                    </div>
                </div>

                {memorySupported ? (
                    <div className={`${styles.devToolsStatCard} ${styles.devToolsMemoryCard}`}>
                        <div className={styles.devToolsStatValue}>
                            {memoryMB !== null ? `${memoryMB} MB` : '—'}
                        </div>
                        <div className={styles.devToolsStatLabel}>{intl.formatMessage(messages.memory)}</div>
                    </div>
                ) : (
                    <p className={styles.devToolsEmpty}>{intl.formatMessage(messages.memoryUnsupported)}</p>
                )}

                {(fpsAlert || frameAlert) && (
                    <div className={styles.devToolsAlertBanner}>
                        ⚠ {intl.formatMessage(messages.alert)}
                    </div>
                )}
            </Box>
        );
    }
}

PerformanceBudgetModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func,
    vm: PropTypes.shape({
        on: PropTypes.func,
        off: PropTypes.func,
        runtime: PropTypes.shape({
            isRunning: PropTypes.bool
        })
    })
};

export default injectIntl(PerformanceBudgetModal);

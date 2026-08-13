import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';

import Modal from '../../containers/windowed-modal.jsx';
import {
    closePerformanceBudgetModal
} from '../../reducers/modals';

import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Performance Budget',
        description: 'Title of the performance budget window',
        id: 'mw.devtools.budget.title'
    },
    fps: {
        defaultMessage: 'FPS',
        description: 'Frames per second label',
        id: 'mw.devtools.budget.fps'
    },
    memory: {
        defaultMessage: 'Memory usage',
        description: 'Memory usage label',
        id: 'mw.devtools.budget.memory'
    },
    thresholdFps: {
        defaultMessage: 'FPS warning threshold',
        description: 'Label for FPS threshold input',
        id: 'mw.devtools.budget.thresholdFps'
    },
    thresholdMemory: {
        defaultMessage: 'Memory warning threshold (MB)',
        description: 'Label for memory threshold input',
        id: 'mw.devtools.budget.thresholdMemory'
    },
    ok: {
        defaultMessage: 'Within budget',
        description: 'Status when within budget',
        id: 'mw.devtools.budget.ok'
    },
    over: {
        defaultMessage: 'Over budget!',
        description: 'Status when over budget',
        id: 'mw.devtools.budget.over'
    },
    start: {
        defaultMessage: 'Start',
        description: 'Start monitoring button',
        id: 'mw.devtools.budget.start'
    },
    stop: {
        defaultMessage: 'Stop',
        description: 'Stop monitoring button',
        id: 'mw.devtools.budget.stop'
    }
});

class PerformanceBudgetModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleTick', 'handleStart', 'handleStop', 'handleFpsChange', 'handleMemoryChange']);
        this.state = {
            running: false,
            fps: 0,
            memory: 0,
            thresholdFps: 30,
            thresholdMemory: 200,
            over: false
        };
        this._last = 0;
        this._frames = 0;
    }
    handleTick () {
        const now = performance.now();
        this._frames += 1;
        if (this._last === 0) {
            this._last = now;
        }
        const elapsed = now - this._last;
        if (elapsed >= 500) {
            const fps = Math.round((this._frames * 1000) / elapsed);
            const memory = (performance.memory && performance.memory.usedJSHeapSize) ?
                performance.memory.usedJSHeapSize / (1024 * 1024) : 0;
            const over = fps < this.state.thresholdFps ||
                (this.state.thresholdMemory > 0 && memory > this.state.thresholdMemory);
            this.setState({
                fps,
                memory: Math.round(memory * 10) / 10,
                over
            });
            this._frames = 0;
            this._last = now;
        }
        if (this._mounted && this.state.running) {
            this._raf = requestAnimationFrame(this.handleTick);
        }
    }
    handleStart () {
        this._mounted = true;
        this._last = 0;
        this._frames = 0;
        this.setState({running: true});
        this._raf = requestAnimationFrame(this.handleTick);
    }
    handleStop () {
        this.setState({running: false});
        if (this._raf) {
            cancelAnimationFrame(this._raf);
        }
    }
    handleFpsChange (e) {
        const v = parseInt(e.target.value, 10);
        this.setState({thresholdFps: isNaN(v) ? 0 : v});
    }
    handleMemoryChange (e) {
        const v = parseInt(e.target.value, 10);
        this.setState({thresholdMemory: isNaN(v) ? 0 : v});
    }
    componentDidMount () {
        this._mounted = true;
    }
    componentWillUnmount () {
        this._mounted = false;
        if (this._raf) {
            cancelAnimationFrame(this._raf);
        }
    }
    render () {
        const intl = this.props.intl;
        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onClose}
                id="performanceBudgetModal"
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
                    </div>
                </div>
                <div className={styles.body}>
                    <div className={styles.field}>
                        <label>{intl.formatMessage(messages.thresholdFps)}</label>
                        <input
                            type="number"
                            value={this.state.thresholdFps}
                            onChange={this.handleFpsChange}
                            className={styles.button}
                            style={{width: 70}}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>{intl.formatMessage(messages.thresholdMemory)}</label>
                        <input
                            type="number"
                            value={this.state.thresholdMemory}
                            onChange={this.handleMemoryChange}
                            className={styles.button}
                            style={{width: 70}}
                        />
                    </div>
                    <div className={styles.statGrid}>
                        <div className={styles.statBox}>
                            <div className={styles.statLabel}>{intl.formatMessage(messages.fps)}</div>
                            <div className={styles.statValue}>{this.state.fps}</div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statLabel}>{intl.formatMessage(messages.memory)}</div>
                            <div className={styles.statValue}>{`${this.state.memory} MB`}</div>
                        </div>
                    </div>
                    {this.state.running && (
                        <p className={this.state.over ? styles.warning : styles.value}>
                            {this.state.over ?
                                intl.formatMessage(messages.over) :
                                intl.formatMessage(messages.ok)}
                        </p>
                    )}
                </div>
            </Modal>
        );
    }
}

PerformanceBudgetModal.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func
};

const mapStateToProps = () => ({});
const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closePerformanceBudgetModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(PerformanceBudgetModal));

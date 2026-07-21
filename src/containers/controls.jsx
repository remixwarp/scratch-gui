import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {connect} from 'react-redux';

import ControlsComponent from '../components/controls/controls.jsx';
import {recordActualFramerate, unlockAchievement} from '../lib/achievements.js';

class Controls extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleGreenFlagClick',
            'handleStopAllClick'
        ]);
        this.renderTimes = [];
        this.lastFpsTime = performance.now();
        this.currentFps = 60;
        this.maxFps = 60;
        this.stopClickCount = 0;
    }

    componentDidMount () {
        if (this.props.vm) {
            this.originalStep = this.props.vm.runtime._step;
            this.props.vm.runtime._step = this.stepWithFps.bind(this);
        }
    }

    componentWillUnmount () {
        if (this.props.vm && this.originalStep) {
            this.props.vm.runtime._step = this.originalStep;
        }
    }

    stepWithFps (...args) {
        const ret = this.originalStep.apply(this.props.vm.runtime, args);
        const now = performance.now();
        while (this.renderTimes.length > 0 && this.renderTimes[0] <= now - 1000) {
            this.renderTimes.shift();
        }
        this.renderTimes.push(now);
        if (now - this.lastFpsTime >= 1000) {
            this.lastFpsTime = now;
            const targetFps = this.props.vm.runtime.frameLoop.framerate;
            this.maxFps = targetFps === 0 ? 60 : targetFps;
            this.currentFps = Math.min(this.renderTimes.length, this.maxFps);
            recordActualFramerate(this.currentFps, this.maxFps);
        }
        return ret;
    }

    handleGreenFlagClick (e) {
        e.preventDefault();
        if (e.shiftKey || e.altKey || e.type === 'contextmenu') {
            if (e.shiftKey) {
                this.props.vm.setTurboMode(!this.props.turbo);
            }
            if (e.altKey || e.type === 'contextmenu') {
                if (this.props.framerate === 30) {
                    this.props.vm.setFramerate(60);
                } else {
                    this.props.vm.setFramerate(30);
                }
            }
        } else {
            this.stopClickCount = 0;
            if (!this.props.isStarted) {
                this.props.vm.start();
            }
            this.props.vm.greenFlag();
        }
    }

    handleStopAllClick (e) {
        e.preventDefault();
        if (this.props.projectRunning) {
            this.stopClickCount++;
            if (this.stopClickCount >= 10) {
                unlockAchievement('stop-spammer');
            }
        } else {
            this.stopClickCount = 0;
        }
        this.props.vm.stopAll();
    }

    render () {
        const {
            vm, // eslint-disable-line no-unused-vars
            isStarted,
            projectRunning,
            turbo,
            framerate,
            isEditor,
            ...props
        } = this.props;
        return (
            <ControlsComponent
                {...props}
                active={projectRunning && isStarted}
                turbo={turbo}
                framerate={framerate}
                actualFps={projectRunning ? this.currentFps : null}
                isEditor={isEditor}
                onGreenFlagClick={this.handleGreenFlagClick}
                onStopAllClick={this.handleStopAllClick}
            />
        );
    }
}

Controls.propTypes = {
    isStarted: PropTypes.bool.isRequired,
    projectRunning: PropTypes.bool.isRequired,
    turbo: PropTypes.bool.isRequired,
    framerate: PropTypes.number.isRequired,
    interpolation: PropTypes.bool.isRequired,
    isSmall: PropTypes.bool,
    vm: PropTypes.instanceOf(VM),
    isEditor: PropTypes.bool
};

const mapStateToProps = state => ({
    isStarted: state.scratchGui.vmStatus.started,
    projectRunning: state.scratchGui.vmStatus.running,
    framerate: state.scratchGui.tw.framerate,
    interpolation: state.scratchGui.tw.interpolation,
    turbo: state.scratchGui.vmStatus.turbo,
    isEditor: !state.scratchGui.mode.isPlayerOnly
});
// no-op function to prevent dispatch prop being passed to component
const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Controls);

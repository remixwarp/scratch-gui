import React, {Component} from 'react';
import PropTypes from 'prop-types';

import styles from './slider-captcha.css';
import {unlockAchievement} from '../../lib/achievements.js';

class SliderCaptcha extends Component {
    constructor (props) {
        super(props);
        this.trackRef = React.createRef();
        this.state = {
            dragging: false,
            progress: 0,
            verified: false,
            failed: false
        };
        this.startX = 0;
        this.startProgress = 0;
        this.failCount = 0;
    }

    componentWillUnmount () {
        this.removePointerListeners();
    }

    addPointerListeners () {
        document.addEventListener('mousemove', this.handlePointerMove);
        document.addEventListener('mouseup', this.handlePointerUp);
        document.addEventListener('touchmove', this.handlePointerMove, { passive: false });
        document.addEventListener('touchend', this.handlePointerUp);
    }

    removePointerListeners () {
        document.removeEventListener('mousemove', this.handlePointerMove);
        document.removeEventListener('mouseup', this.handlePointerUp);
        document.removeEventListener('touchmove', this.handlePointerMove);
        document.removeEventListener('touchend', this.handlePointerUp);
    }

    handlePointerStart = (event) => {
        if (this.state.verified) return;
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        this.startX = clientX;
        this.startProgress = this.state.progress;
        this.setState({ dragging: true, failed: false });
        this.addPointerListeners();
        event.preventDefault();
    };

    handlePointerMove = (event) => {
        if (!this.state.dragging) return;
        if (event.cancelable) event.preventDefault();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const track = this.trackRef.current;
        if (!track) return;
        const maxDistance = track.clientWidth - 38;
        const deltaX = clientX - this.startX;
        const nextProgress = Math.max(0, Math.min(1, this.startProgress + deltaX / maxDistance));
        this.setState({ progress: nextProgress });
    };

    handlePointerUp = () => {
        if (!this.state.dragging) return;
        this.removePointerListeners();
        this.setState({ dragging: false }, () => {
            if (this.state.progress >= 0.98) {
                this.failCount = 0;
                this.setState({ verified: true, progress: 1 }, () => {
                    if (this.props.onVerify) {
                        this.props.onVerify();
                    }
                });
            } else {
                this.failCount += 1;
                if (this.failCount >= 3) {
                    unlockAchievement('captcha-human');
                }
                if (this.props.onFail) {
                    this.props.onFail();
                }
                this.setState({ failed: true });
                setTimeout(this.resetCaptcha, 600);
            }
        });
    };

    resetCaptcha = () => {
        this.setState({ dragging: false, progress: 0, verified: false, failed: false });
    };

    render () {
        const { dragging, progress, verified } = this.state;
        const thumbStyle = {
            left: `${progress * 100}%`,
            transition: dragging ? 'none' : 'left 0.2s ease'
        };
        const progressStyle = {
            width: `${progress * 100}%`,
            transition: dragging ? 'none' : 'width 0.2s ease'
        };

        return (
            <div className={styles.captchaContainer}>
                <div className={styles.captchaTrack} ref={this.trackRef}>
                    <div
                        className={`${styles.captchaProgress} ${verified ? styles.verified : ''}`}
                        style={progressStyle}
                    />
                    <div
                        className={`${styles.captchaThumb} ${dragging ? styles.dragging : ''} ${verified ? styles.verified : ''}`}
                        style={thumbStyle}
                        onMouseDown={this.handlePointerStart}
                        onTouchStart={this.handlePointerStart}
                    >
                        ▶
                    </div>
                    <div className={styles.captchaHint}>
                        {verified ? 'Verified' : 'Slide to verify'}
                    </div>
                </div>
                <button type="button" className={styles.resetButton} onClick={this.resetCaptcha}>
                    Reset
                </button>
            </div>
        );
    }
}

SliderCaptcha.propTypes = {
    onVerify: PropTypes.func,
    onFail: PropTypes.func
};

export default SliderCaptcha;

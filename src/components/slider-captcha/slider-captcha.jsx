import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import styles from './slider-captcha.css';

class SliderCaptcha extends Component {
    constructor (props) {
        super(props);
        this.state = {
            isDragging: false,
            position: 0,
            isVerified: false,
            randomX: 0
        };
        this.sliderRef = React.createRef();
        this.thumbRef = React.createRef();
        this.startX = 0;
    }

    componentDidMount () {
        this.resetCaptcha();
    }

    resetCaptcha () {
        const randomX = 100 + Math.random() * 150;
        this.setState({
            position: 0,
            isVerified: false,
            randomX
        });
    }

    handleMouseDown = (e) => {
        if (this.state.isVerified) return;
        this.setState({isDragging: true});
        this.startX = e.clientX || e.touches[0].clientX;
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('touchmove', this.handleMouseMove);
        document.addEventListener('touchend', this.handleMouseUp);
    };

    handleMouseMove = (e) => {
        if (!this.state.isDragging) return;
        const clientX = e.clientX || e.touches[0].clientX;
        const diff = clientX - this.startX;
        const sliderWidth = this.sliderRef.current ? this.sliderRef.current.offsetWidth - 40 : 280;
        let newPosition = Math.max(0, Math.min(sliderWidth, diff));
        this.setState({position: newPosition});
    };

    handleMouseUp = () => {
        if (!this.state.isDragging) return;
        this.setState({isDragging: false});
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('touchmove', this.handleMouseMove);
        document.removeEventListener('touchend', this.handleMouseUp);
        
        const tolerance = 5;
        const targetX = this.state.randomX;
        const currentX = this.state.position;
        
        if (Math.abs(currentX - targetX) <= tolerance) {
            this.setState({isVerified: true});
            this.props.onVerify && this.props.onVerify();
        } else {
            this.resetCaptcha();
        }
    };

    render () {
        const {position, isVerified, randomX, isDragging} = this.state;
        
        return (
            <div className={styles.captchaContainer}>
                <div className={styles.captchaTrack} ref={this.sliderRef}>
                    <div 
                        className={classNames(styles.captchaTarget, {
                            [styles.verified]: isVerified
                        })}
                        style={{left: `${randomX}px`}}
                    />
                    <div 
                        className={classNames(styles.captchaProgress, {
                            [styles.verified]: isVerified
                        })}
                        style={{width: `${position}px`}}
                    />
                    <div 
                        className={classNames(styles.captchaThumb, {
                            [styles.dragging]: isDragging,
                            [styles.verified]: isVerified
                        })}
                        style={{left: `${position}px`}}
                        ref={this.thumbRef}
                        onMouseDown={this.handleMouseDown}
                        onTouchStart={this.handleMouseDown}
                    >
                        {isVerified ? '✓' : '→'}
                    </div>
                    <div className={styles.captchaHint}>
                        {isVerified ? 'Verified!' : 'Slide to verify'}
                    </div>
                </div>
                {!isVerified && (
                    <button 
                        className={styles.resetButton}
                        onClick={() => this.resetCaptcha()}
                    >
                        Reset
                    </button>
                )}
            </div>
        );
    }
}

SliderCaptcha.propTypes = {
    onVerify: PropTypes.func
};

export default SliderCaptcha;
import React, {Component, createRef} from 'react';
import PropTypes from 'prop-types';
import {ArrowRight, Check, RefreshCw} from 'lucide-react';

import styles from './slide-puzzle-captcha.css';

class SlidePuzzleCaptcha extends Component {
    constructor (props) {
        super(props);
        
        this.state = {
            isLoading: true,
            currentImg: '',
            blockY: 0,
            blockX: 0,
            maskX: 0,
            maskY: 0,
            btnLeft: 0,
            blockLeft: 0,
            isDragging: false,
            isVerified: false
        };
        
        this.imgList = [
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&h=480&fit=crop",
            "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&h=480&fit=crop",
            "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=900&h=480&fit=crop",
            "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=900&h=480&fit=crop"
        ];
        
        this.imgConRef = createRef();
        this.slideBtnRef = createRef();
        this.startX = 0;
    }
    
    componentDidMount () {
        this.switchImg();
    }
    
    randomInt (min = 0, max = 1) {
        return min + Math.floor((max - min) * Math.random());
    }
    
    switchImg = () => {
        this.setState({
            isLoading: true,
            isVerified: false,
            btnLeft: 0,
            blockLeft: 0
        });
        
        const newSrc = this.imgList[this.randomInt(0, 4)];
        const tmp = new Image();
        tmp.src = newSrc;
        tmp.onload = () => {
            this.setState({
                currentImg: newSrc,
                isLoading: false
            }, () => {
                this.initSlider();
            });
        };
    }
    
    initSlider () {
        if (!this.imgConRef.current) return;
        
        const maxTop = this.imgConRef.current.offsetHeight - 50;
        const maxRight = this.imgConRef.current.offsetWidth - 50;
        const randPosY = this.randomInt(0, maxTop);
        const randPosX = this.randomInt(80, maxRight);
        
        this.setState({
            blockY: randPosY,
            maskX: randPosX,
            maskY: randPosY,
            blockX: randPosX
        });
    }
    
    handleMouseDown = (e) => {
        if (this.state.isVerified) return;
        
        e.preventDefault();
        this.setState({isDragging: true});
        this.startX = e.clientX || e.touches[0].clientX;
        
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('touchmove', this.handleMouseMove);
        document.addEventListener('touchend', this.handleMouseUp);
    }
    
    handleMouseMove = (e) => {
        if (!this.state.isDragging || !this.imgConRef.current) return;
        
        const clientX = e.clientX || e.touches[0].clientX;
        const relativeX = clientX - this.startX;
        const maxWidth = this.imgConRef.current.offsetWidth - 50;
        
        if (relativeX < 0 || relativeX > maxWidth) return;
        
        this.setState({
            btnLeft: relativeX,
            blockLeft: relativeX
        });
    }
    
    handleMouseUp = () => {
        if (!this.state.isDragging) return;
        
        this.setState({isDragging: false});
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('touchmove', this.handleMouseMove);
        document.removeEventListener('touchend', this.handleMouseUp);
        
        const {blockLeft, maskX} = this.state;
        
        if (Math.abs(blockLeft - maskX) <= 5) {
            this.setState({isVerified: true});
            this.props.onVerify && this.props.onVerify();
        } else {
            this.props.onFail && this.props.onFail();
            this.setState({
                btnLeft: 0,
                blockLeft: 0
            }, () => {
                setTimeout(() => this.switchImg(), 500);
            });
        }
    }
    
    render () {
        const {isLoading, currentImg, blockY, maskX, maskY, btnLeft, blockLeft, isVerified, isDragging} = this.state;
        
        return (
            <div className={styles.verifySlideCon}>
                <div className={styles.imgCon} ref={this.imgConRef}>
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingSpinner} />
                        </div>
                    ) : (
                        <>
                            <img className={styles.img} src={currentImg} alt="captcha" />
                            <div 
                                className={styles.slideBlock}
                                style={{
                                    display: isDragging || isVerified ? 'block' : 'none',
                                    top: `${blockY}px`,
                                    left: `${blockLeft}px`,
                                    backgroundImage: `url(${currentImg})`,
                                    backgroundPosition: `-${this.state.blockX}px -${blockY}px`
                                }}
                            />
                            <div 
                                className={styles.slideBlockMask}
                                style={{
                                    display: isDragging || isVerified ? 'block' : 'none',
                                    top: `${maskY}px`,
                                    left: `${maskX}px`
                                }}
                            />
                        </>
                    )}
                </div>
                
                <div className={styles.slideCon}>
                    <div 
                        className={`${styles.slideBtn} ${isDragging ? styles.dragging : ''} ${isVerified ? styles.verified : ''}`}
                        style={{left: `${btnLeft}px`}}
                        ref={this.slideBtnRef}
                        onMouseDown={this.handleMouseDown}
                        onTouchStart={this.handleMouseDown}
                    >
                        {isVerified ? <Check size={20} /> : <ArrowRight size={20} />}
                    </div>
                </div>
                
                <div className={styles.operateCon}>
                    <div 
                        className={styles.refreshBtn}
                        onClick={this.switchImg}
                        title="刷新"
                    >
                        <RefreshCw size={20} />
                    </div>
                </div>
            </div>
        );
    }
}

SlidePuzzleCaptcha.propTypes = {
    onVerify: PropTypes.func,
    onFail: PropTypes.func
};

export default SlidePuzzleCaptcha;
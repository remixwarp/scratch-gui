import React, {Component} from 'react';
import PropTypes from 'prop-types';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';
import SlidePuzzleCaptcha from '../slide-puzzle-captcha/slide-puzzle-captcha.jsx';

import styles from './captcha-modal.css';

class CaptchaModal extends Component {
    constructor (props) {
        super(props);
        
        this.state = {
            captchaKey: 0
        };
    }
    
    handleVerify = () => {
        setTimeout(() => {
            this.props.onVerify && this.props.onVerify();
        }, 500);
    }
    
    handleFail = () => {
        this.setState(prev => ({captchaKey: prev.captchaKey + 1}));
    }
    
    render () {
        return (
            <Modal
                visible={this.props.visible}
                className={styles.captchaModal}
                onRequestClose={this.props.onCancel}
                contentLabel="人机验证"
                width={500}
                height={550}
            >
                <Box className={styles.content}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>
                            人机验证
                        </h2>
                    </div>
                    
                    <div className={styles.description}>
                        请完成拼图验证以继续
                    </div>
                    
                    <div className={styles.captchaContainer}>
                        <SlidePuzzleCaptcha
                            key={this.state.captchaKey}
                            onVerify={this.handleVerify}
                            onFail={this.handleFail}
                        />
                    </div>
                    
                    <div className={styles.buttonContainer}>
                        <button
                            className={styles.cancelButton}
                            onClick={this.props.onCancel}
                        >
                            取消
                        </button>
                    </div>
                </Box>
            </Modal>
        );
    }
}

CaptchaModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onVerify: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

export default CaptchaModal;
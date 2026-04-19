import React from 'react';
import PropTypes from 'prop-types';
import styles from './ai-panel.css';
import Button from '../button/button.jsx';

class BaiduAIPanel extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {
            loading: false
        };
    }

    handleClose = () => {
        if (this.props.onRequestClose) {
            this.props.onRequestClose();
        }
    };

    render () {
        return (
            <div className={styles.container}>
                <iframe
                    src="https://chat.baidu.com/"
                    className={styles.baiduAIFrame}
                    title="百度AI"
                    frameBorder="0"
                    allowFullScreen
                />
            </div>
        );
    }
}

BaiduAIPanel.propTypes = {
    onRequestClose: PropTypes.func
};

BaiduAIPanel.defaultProps = {
    showHeader: true
};

export default BaiduAIPanel;
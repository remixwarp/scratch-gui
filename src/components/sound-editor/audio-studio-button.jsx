import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import studioHtml from 'scratch-audio/src/studio';
import styles from './audio-studio-button.css';

/**
 * 声音编辑器左下角「Studio」入口（行内按钮，不遮挡文字）。
 * 点开后用一个全屏浮层加载融合版 Audio Studio（完整 Pulsegrid + Sonora 源码内联）。
 * - 大界面：两个工作台并排，可统一调整
 * - 单工具：顶部切换到 Pulsegrid / Sonora 进行详细编辑
 * - 主题：Studio 自动跟随宿主编辑器（data-gui-theme + postMessage）
 */
class AudioStudioButton extends React.Component {
    constructor (props) {
        super(props);
        this.state = {open: false};
        this.handleOpen = this.handleOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
    }

    componentDidMount () {
        window.addEventListener('message', this.handleMessage);
    }

    componentWillUnmount () {
        window.removeEventListener('message', this.handleMessage);
    }

    handleMessage (event) {
        // Studio 请求关闭（预留扩展点，当前由浮层关闭按钮处理）
        if (event.data && event.data.type === 'studio:close') {
            this.handleClose();
        }
    }

    handleOpen () {
        this.setState({open: true});
    }

    handleClose () {
        this.setState({open: false});
    }

    render () {
        if (!this.state.open) {
            return (
                <button
                    className={styles.studioButton}
                    title="Open Audio Studio — Pulsegrid + Sonora, big view & detailed editing"
                    onClick={this.handleOpen}
                >
                    <span className={styles.studioGlyph}>♫</span>
                    <span>Studio</span>
                </button>
            );
        }
        return (
            <React.Fragment>
                <button
                    className={styles.studioButton}
                    title="Audio Studio"
                    onClick={this.handleOpen}
                >
                    <span className={styles.studioGlyph}>♫</span>
                    <span>Studio</span>
                </button>
                <div className={styles.overlay}>
                    <button
                        className={styles.closeButton}
                        title="Close Audio Studio"
                        onClick={this.handleClose}
                    >
                        ✕ <span>Scratch</span>
                    </button>
                    <iframe
                        className={styles.frame}
                        title="Audio Studio"
                        srcDoc={studioHtml}
                    />
                </div>
            </React.Fragment>
        );
    }
}

AudioStudioButton.propTypes = {};

export default AudioStudioButton;

import React from 'react';
import PropTypes from 'prop-types';

import studioHtml from 'scratch-audio/src/studio';
import styles from './audio-studio-button.css';

/**
 * 声音编辑器左下角「Studio」入口（行内按钮，不遮挡文字）。
 * 点开后用一个全屏浮层加载融合版 Audio Studio。
 * - 浮层内下拉框选择 Scratch(原生) / Pulsegrid / Sonora
 * - 打开时把当前 Scratch 声音以 WAV 注入 Studio，所选编辑器据此载入
 * - 编辑器内改动后 Studio 回传 WAV，这里写回 Scratch 声音（双向同步）
 * - 主题自动跟随宿主编辑器（data-gui-theme + postMessage）
 */
class AudioStudioButton extends React.Component {
    constructor (props) {
        super(props);
        this.state = {open: false};
        this.handleOpen = this.handleOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.pushCurrentSound = this.pushCurrentSound.bind(this);
        this.frameRef = null;
    }

    componentDidMount () {
        window.addEventListener('message', this.handleMessage);
    }

    componentWillUnmount () {
        window.removeEventListener('message', this.handleMessage);
    }

    postToStudio (msg) {
        if (this.frameRef && this.frameRef.contentWindow) {
            try {
                this.frameRef.contentWindow.postMessage(msg, '*');
            } catch (e) {
                // ignore
            }
        }
    }

    handleMessage (event) {
        const d = event.data;
        if (!d || typeof d !== 'object') return;
        // Only accept messages from our own Studio iframe.
        if (!this.frameRef || event.source !== this.frameRef.contentWindow) return;
        if (d.type === 'studio:close') {
            this.handleClose();
        } else if (d.type === 'studio:ready') {
            // Studio shell is alive: push the current Scratch sound into it.
            this.pushCurrentSound();
        } else if (d.type === 'studio:wav-update') {
            // An editor exported its audio: write it back into the Scratch sound.
            if (d.wav && this.props.applyStudioWav) {
                this.props.applyStudioWav(d.wav);
            }
        }
    }

    pushCurrentSound () {
        if (!this.props.getStudioWav) return;
        const promise = this.props.getStudioWav();
        if (!promise || typeof promise.then !== 'function') return;
        promise.then(wav => {
            if (wav) {
                this.postToStudio({type: 'studio:load-wav', wav, name: 'scratch-sound.wav'});
            }
        }).catch(() => {});
    }

    handleOpen () {
        this.setState({open: true}, () => {
            // iframe onLoad also calls this; harmless to call twice (idempotent seed).
            this.pushCurrentSound();
        });
    }

    handleClose () {
        this.setState({open: false});
    }

    render () {
        if (!this.state.open) {
            return (
                <button
                    className={styles.studioButton}
                    title="Open Audio Studio — edit the current sound in Pulsegrid or Sonora"
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
                        ref={ref => {
                            this.frameRef = ref;
                        }}
                        className={styles.frame}
                        title="Audio Studio"
                        srcDoc={studioHtml}
                        onLoad={() => this.pushCurrentSound()}
                    />
                </div>
            </React.Fragment>
        );
    }
}

AudioStudioButton.propTypes = {
    getStudioWav: PropTypes.func,
    applyStudioWav: PropTypes.func
};

export default AudioStudioButton;

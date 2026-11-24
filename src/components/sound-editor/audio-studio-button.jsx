import React from 'react';
import PropTypes from 'prop-types';

import studioHtml from 'scratch-audio/src/studio';
import styles from './audio-studio-button.css';

/**
 * 声音效果控制行里的「编辑器选择」下拉框（Scratch / Pulsegrid / Sonora）。
 * - 常驻显示：无论 Scratch 原生还是外部编辑器，都能随时切换（行内控件，不遮挡文字）
 * - 选 Scratch：关闭嵌入式编辑器，回到 Scratch 原生波形编辑
 * - 选 Pulsegrid / Sonora：在左侧声音面板内嵌显示对应编辑器（不遮挡右侧舞台）
 * - 打开时把当前 Scratch 声音以 WAV 注入编辑器；编辑后回传 WAV 写回 Scratch（双向同步）
 * - Studio 内下拉框选 Scratch 会回传 studio:close，这里同步复位
 */
class AudioStudioButton extends React.Component {
    constructor (props) {
        super(props);
        this.state = {mode: 'scratch'};
        this.handleModeChange = this.handleModeChange.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.pushCurrentSound = this.pushCurrentSound.bind(this);
        this.frameRef = null;
    }

    componentDidMount () {
        window.addEventListener('message', this.handleMessage);
        // Scratch 原生声音被编辑（效果/裁剪等）时，把最新 WAV 推给已打开的 Studio，
        // 实现 Scratch -> Studio 方向实时同步。Studio 自己回写时由 _applying 抑制回环。
        window.addEventListener('rw:sound-updated', this.pushCurrentSound);
    }

    componentWillUnmount () {
        window.removeEventListener('message', this.handleMessage);
        window.removeEventListener('rw:sound-updated', this.pushCurrentSound);
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
        if (!this.frameRef || event.source !== this.frameRef.contentWindow) return;
        if (d.type === 'studio:close') {
            this.setState({mode: 'scratch'});
        } else if (d.type === 'studio:ready') {
            this.pushCurrentSound();
            this.postToStudio({type: 'studio:mode', mode: this.state.mode});
        } else if (d.type === 'studio:mode') {
            if (['scratch', 'pulsegrid', 'sonora'].indexOf(d.mode) >= 0) {
                this.setState({mode: d.mode});
            }
        } else if (d.type === 'studio:wav-update') {
            if (d.wav && this.props.applyStudioWav) {
                // 标记「正在应用 Studio 回写」，避免 submitNewSamples 发出的
                // rw:sound-updated 事件把同一份音频再推回 Studio 形成回环。
                this._applying = true;
                const result = this.props.applyStudioWav(d.wav);
                Promise.resolve(result).then(() => {
                    setTimeout(() => { this._applying = false; }, 0);
                }).catch(() => { this._applying = false; });
            }
        }
    }

    pushCurrentSound () {
        // 仅在嵌入式 Studio 打开、且不是正在应用其回写时推送
        if (this._applying || this.state.mode === 'scratch') return;
        if (!this.props.getStudioWav) return;
        const promise = this.props.getStudioWav();
        if (!promise || typeof promise.then !== 'function') return;
        promise.then(wav => {
            if (wav) {
                this.postToStudio({type: 'studio:load-wav', wav, name: 'scratch-sound.wav'});
            }
        }).catch(() => {});
    }

    handleModeChange (event) {
        const mode = event.target.value;
        this.setState({mode}, () => {
            if (mode !== 'scratch') {
                this.pushCurrentSound();
                this.postToStudio({type: 'studio:mode', mode});
            }
        });
    }

    render () {
        const mode = this.state.mode;
        const embedded = mode !== 'scratch';
        return (
            <React.Fragment>
                <select
                    className={styles.studioSelect}
                    value={mode}
                    title="Edit the current sound in Scratch, Pulsegrid or Sonora"
                    aria-label="Audio editor"
                    onChange={this.handleModeChange}
                >
                    <option value="scratch">Scratch</option>
                    <option value="pulsegrid">Pulsegrid</option>
                    <option value="sonora">Sonora</option>
                </select>
                {embedded ? (
                    <div className={styles.embed}>
                        <iframe
                            ref={ref => {
                                this.frameRef = ref;
                            }}
                            className={styles.frame}
                            title="Audio Studio"
                            srcDoc={studioHtml}
                            onLoad={() => {
                                this.pushCurrentSound();
                                this.postToStudio({type: 'studio:mode', mode});
                            }}
                        />
                    </div>
                ) : null}
            </React.Fragment>
        );
    }
}

AudioStudioButton.propTypes = {
    getStudioWav: PropTypes.func,
    applyStudioWav: PropTypes.func
};

export default AudioStudioButton;

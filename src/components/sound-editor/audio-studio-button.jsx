import React from 'react';
import PropTypes from 'prop-types';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import studioHtml from 'scratch-audio/src/studio';
import styles from './audio-studio-button.css';

const messages = defineMessages({
    selectEditor: {
        id: 'gui.soundEditor.studio.selectEditor',
        defaultMessage: 'Edit the current sound in Scratch, Pulsegrid or Sonora',
        description: 'Tooltip on the audio editor selector dropdown'
    },
    editorAriaLabel: {
        id: 'gui.soundEditor.studio.editorAriaLabel',
        defaultMessage: 'Audio editor',
        description: 'aria-label on the audio editor selector'
    },
    scratch: {
        id: 'gui.soundEditor.studio.scratch',
        defaultMessage: 'Scratch',
        description: 'Label for the built-in Scratch audio editor'
    },
    pulsegrid: {
        id: 'gui.soundEditor.studio.pulsegrid',
        defaultMessage: 'Pulsegrid',
        description: 'Label for the Pulsegrid audio editor'
    },
    sonora: {
        id: 'gui.soundEditor.studio.sonora',
        defaultMessage: 'Sonora',
        description: 'Label for the Sonora audio editor'
    },
    studioIframeTitle: {
        id: 'gui.soundEditor.studio.iframeTitle',
        defaultMessage: 'Audio Studio',
        description: 'title attribute of the embedded audio studio iframe'
    }
});

/**
 * Convert an ArrayBuffer to base64 without overflowing the call stack on big files.
 */
function arrayBufferToBase64 (ab) {
    try {
        var bytes = new Uint8Array(ab);
        var binary = '';
        var chunk = 0x8000;
        for (var i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    } catch (e) {
        return '';
    }
}

/**
 * Inject the current Scratch sound as a seed directly into the Studio srcDoc.
 * The Studio script reads window.__RW_SEED_WAV__ synchronously at startup, so
 * the sound is guaranteed to be loaded regardless of postMessage timing or
 * whether a child editor reached "ready" before the WAV arrived.
 */
function buildSeededDoc (wav) {
    if (!wav) return studioHtml;
    try {
        var b64 = wav instanceof ArrayBuffer || ArrayBuffer.isView(wav)
            ? arrayBufferToBase64(wav instanceof ArrayBuffer ? wav : wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength))
            : '';
        if (!b64) return studioHtml;
        var seed = '<script>window.__RW_SEED_WAV__=' + JSON.stringify(b64) + ';<\/script>';
        // Place the seed before the first <script> so the Studio bridge sees it.
        return studioHtml.replace('<script>', seed + '<script>');
    } catch (e) {
        return studioHtml;
    }
}

/**
 * 声音效果控制行里的「编辑器选择」下拉框（Scratch / Pulsegrid / Sonora）。
 * - 常驻显示：无论 Scratch 原生还是外部编辑器，都能随时切换（行内控件，不遮挡文字）
 * - 选 Scratch：关闭嵌入式编辑器，回到 Scratch 原生波形编辑
 * - 选 Pulsegrid / Sonora：在左侧声音面板内嵌显示对应编辑器（不遮挡右侧舞台）
 * - 打开时把当前 Scratch 声音以「内联种子」写进 Studio srcDoc，启动即加载（不依赖 postMessage 时序）
 * - 编辑后回传 WAV 写回 Scratch（双向同步）；Scratch 原生编辑后广播刷新 Studio
 * - Studio 内下拉框选 Scratch 会回传 studio:close，这里同步复位
 */
class AudioStudioButton extends React.Component {
    constructor (props) {
        super(props);
        this.state = {mode: 'scratch', seededDoc: null};
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

    componentDidUpdate (prevProps, prevState) {
        // 切换声音卡片时父组件不会重建 AudioStudioButton，iframe 还保留旧声音。
        // 如果 Studio 已经打开且声音标识变了，用新声音重新 build srcDoc 挂载 iframe。
        const currKey = this.props.soundKey || '';
        const prevKey = prevProps.soundKey || '';
        if (currKey !== prevKey && this.state.mode !== 'scratch') {
            const apply = wav => {
                this.setState({
                    mode: this.state.mode,
                    seededDoc: buildSeededDoc(wav)
                });
                // srcDoc 变了 iframe 会重新 onLoad；再 push 一次作为兜底。
                setTimeout(() => this.pushCurrentSound(), 50);
            };
            const promise = this.props.getStudioWav ? this.props.getStudioWav() : null;
            if (promise && typeof promise.then === 'function') {
                promise.then(apply).catch(() => apply(null));
            } else {
                apply(null);
            }
        }
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
            this.setState({mode: 'scratch', seededDoc: null});
        } else if (d.type === 'studio:ready') {
            // Seed is already embedded in the srcDoc; still push once to cover
            // the case where the user edited Scratch sound before Studio finished loading.
            this.pushCurrentSound();
            this.postToStudio({type: 'studio:mode', mode: this.state.mode});
        } else if (d.type === 'studio:mode') {
            if (['scratch', 'pulsegrid', 'sonora'].indexOf(d.mode) >= 0) {
                // Internal dropdown changed; keep srcDoc stable so the embedded seed stays valid.
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
        if (mode === 'scratch') {
            this.setState({mode: 'scratch', seededDoc: null});
            return;
        }
        // Build the seeded srcDoc from the CURRENT Scratch sound before mounting
        // the iframe, so the very first script run has the audio available.
        const apply = wav => {
            this.setState({mode, seededDoc: buildSeededDoc(wav)}, () => {
                this.postToStudio({type: 'studio:mode', mode});
            });
        };
        const promise = this.props.getStudioWav ? this.props.getStudioWav() : null;
        if (promise && typeof promise.then === 'function') {
            promise.then(apply).catch(() => apply(null));
        } else {
            apply(null);
        }
    }

    render () {
        const mode = this.state.mode;
        const embedded = mode !== 'scratch';
        const doc = this.state.seededDoc || studioHtml;
        const intl = this.props.intl;
        return (
            <React.Fragment>
                <select
                    className={styles.studioSelect}
                    value={mode}
                    title={intl.formatMessage(messages.selectEditor)}
                    aria-label={intl.formatMessage(messages.editorAriaLabel)}
                    onChange={this.handleModeChange}
                >
                    <option value="scratch">{intl.formatMessage(messages.scratch)}</option>
                    <option value="pulsegrid">{intl.formatMessage(messages.pulsegrid)}</option>
                    <option value="sonora">{intl.formatMessage(messages.sonora)}</option>
                </select>
                {embedded ? (
                    <div className={styles.embed}>
                        <iframe
                            ref={ref => {
                                this.frameRef = ref;
                            }}
                            className={styles.frame}
                            title={intl.formatMessage(messages.studioIframeTitle)}
                            srcDoc={doc}
                            onLoad={() => {
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
    applyStudioWav: PropTypes.func,
    soundKey: PropTypes.string,
    intl: intlShape
};

export default injectIntl(AudioStudioButton);

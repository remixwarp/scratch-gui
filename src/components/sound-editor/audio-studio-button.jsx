import React from 'react';
import PropTypes from 'prop-types';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import studioHtml from 'scratch-audio/src/studio';
import dictSeedScript from '../../lib/vendor/editor-i18n-dict';
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
 * Pick the host UI's current locale (Scratch-level). Returns 'zh' when the
 * host is showing Chinese, otherwise 'en'. Uses the same storage key as the
 * outer `selectLocale` action + <html lang> as a secondary signal — keeps the
 * Audio Studio editors in sync with what the user selected in Scratch's
 * language menu even if the iframe's own `rw_i18n_lang` localStorage differs.
 */
function hostLangKey () {
    try {
        var stored = localStorage.getItem('tw:language') || localStorage.getItem('currentLocale') || '';
        var htmlLang = (typeof document !== 'undefined' && document.documentElement &&
            document.documentElement.lang) || '';
        var raw = stored || htmlLang;
        var base = (raw || 'en').split('-')[0].toLowerCase();
        if (base === 'zh') return 'zh';
        return 'en';
    } catch (e) {
        return 'en';
    }
}

/**
 * Inject the current Scratch sound + language as seeds directly into the Studio
 * srcDoc. The Studio script reads window.__RW_SEED_WAV__ / __RW_SEED_LANG__
 * synchronously at startup so both values are available on the very first
 * script run — no dependence on postMessage timing.
 */
function buildSeededDoc (wav) {
    try {
        var scripts = [];
        // 宿主是当前语言的唯一权威：注入种子，编辑器内的 v3 i18n 脚本启动时读取，
        // 并在 onLoad / 语言变化时再用 postMessage 推送一次，双保险。
        scripts.push('window.__RW_SEED_LANG__=' + JSON.stringify(hostLangKey()) + ';');
        if (wav) {
            var b64 = wav instanceof ArrayBuffer || ArrayBuffer.isView(wav)
                ? arrayBufferToBase64(wav instanceof ArrayBuffer ? wav : wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength))
                : '';
            if (b64) scripts.push('window.__RW_SEED_WAV__=' + JSON.stringify(b64) + ';');
        }
        var seed = '<script>' + scripts.join('') + '<\/script>';
        // 注入来自 scratch-l10n 的权威 UI 词典（1844 条），让编辑器运行时脚本
        // 覆盖全部文案，而非内置的 241 条小表。
        var dictSeed = dictSeedScript();
        if (dictSeed) seed = dictSeed + seed;
        // 仅把种子插入第一个 <script> 之前——不改动编辑器任何结构。
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
        this.state = {mode: 'scratch', seededDoc: null, docVersion: 0, keySound: props.soundKey || ''};
        this._docLang = hostLangKey();
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
        // 宿主语言切换：Scratch 语言菜单会改变 tw:language 并重新渲染宿主树；
        // 检测语言变化后用当前编辑器声音重建 srcDoc（静态翻译），让已打开的编辑器跟随。
        const langNow = hostLangKey();
        if (langNow !== this._docLang) {
            this._docLang = langNow;
            if (this.state.mode !== 'scratch') {
                const applyLang = wav => {
                    this.setState(prev => ({
                        seededDoc: buildSeededDoc(wav),
                        docVersion: prev.docVersion + 1
                    }));
                    this.postToStudio({type: 'studio:set-lang', lang: langNow});
                };
                const langPromise = this.props.getStudioWav ? this.props.getStudioWav() : null;
                if (langPromise && typeof langPromise.then === 'function') {
                    langPromise.then(applyLang).catch(() => applyLang(null));
                } else {
                    applyLang(null);
                }
            }
        }
        // 切换声音卡片：Scratch 一次只编辑一条声音，切换后编辑器必须换成新卡片的声音，
        // 并且之前加载的那条要消失（不能累积）。父组件不会重建本组件，iframe 会残留旧声音。
        // 做法：用当前卡片声音重新构造 srcDoc，并递增 docVersion 作为 iframe 的 key，
        // 强制 React 卸载旧 iframe、挂载全新 Studio 实例 —— 旧音频随之彻底清除。
        const currKey = this.props.soundKey || '';
        const prevKey = prevProps.soundKey || '';
        if (currKey !== prevKey) {
            if (this.state.mode === 'scratch') {
                // 编辑器没打开，只记录新 key，下次打开时用当前声音。
                this.setState({keySound: currKey});
                return;
            }
            const apply = wav => {
                this.setState(prev => ({
                    keySound: currKey,
                    seededDoc: buildSeededDoc(wav),
                    docVersion: prev.docVersion + 1
                }));
            };
            // getStudioWav 此时已指向新选中的卡片，取它的音频作为新 seed。
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
                                this.postToStudio({type: 'studio:set-lang', lang: hostLangKey()});
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
        // Increment docVersion so every "enter" mounts a brand-new Studio instance
        // carrying only the current sound card's audio (previous one is gone).
        const apply = wav => {
            this.setState(prev => ({
                mode,
                keySound: this.props.soundKey || '',
                seededDoc: buildSeededDoc(wav),
                docVersion: prev.docVersion + 1
            }), () => {
                this.postToStudio({type: 'studio:mode', mode});
                this.postToStudio({type: 'studio:set-lang', lang: hostLangKey()});
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
                            key={this.state.docVersion}
                            ref={ref => {
                                this.frameRef = ref;
                            }}
                            className={styles.frame}
                            title={intl.formatMessage(messages.studioIframeTitle)}
                            srcDoc={doc}
                            onLoad={() => {
                                this.postToStudio({type: 'studio:mode', mode});
                this.postToStudio({type: 'studio:set-lang', lang: hostLangKey()});
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

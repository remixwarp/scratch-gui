import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {
    ChevronDown,
    ChevronRight,
    File,
    FileAudio,
    FileCode,
    FileImage,
    Folder,
    FolderOpen,
    Settings
} from 'lucide-react';
import {closeSuperRefactorModal} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import Button from '../components/button/button.jsx';
import VM from 'scratch-vm';
import {hasCurrentRJ, getCurrentRJZip, getCurrentRJRaw} from '../lib/rj/rj-store.js';
import {mapLimit} from '../lib/rj/rj-shared.js';
import './super-refactor-modal.css';

// 超过该字节数的文件不做逐 token 语法高亮与逐行行号渲染，避免打开卡顿
const LARGE_CONTENT_THRESHOLD = 150000;

// 超级重构窗口的界面偏好（文件树/旧版列表、编辑器版本、Monaco 选项）
const SUPER_REFACTOR_SETTINGS_KEY = 'mw-super-refactor-settings';

const DEFAULT_EDITOR_OPTIONS = {
    minimap: true,
    folding: true,
    foldingControls: 'always',
    breadcrumbs: true,
    stickyScroll: true,
    lineNumbers: true,
    indentationGuides: true,
    highlightActiveLine: true,
    smoothScrolling: true,
    mouseWheelZoom: true,
    fontSize: 13,
    tabSize: 4,
    renderWhitespace: 'selection'
};

const loadSuperRefactorSettings = () => {
    try {
        const raw = localStorage.getItem(SUPER_REFACTOR_SETTINGS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
};

// ---------------------------------------------------------------------------
// .rj 分片视图辅助函数：当前作品是 .rj 时，文件面板直接列出 .rj 内部
// 真实的分片文件（manifest / tables / targets / blocks / assets），
// 而不是把已加载的 VM 重新序列化成 sb3 视图。
// ---------------------------------------------------------------------------
const RJ_IMAGE_EXTS = ['png', 'bmp', 'jpeg', 'jpg', 'gif', 'webp'];
const RJ_IMAGE_MIME = {
    png: 'image/png',
    bmp: 'image/bmp',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp'
};

const rjExtOf = path => {
    const idx = path.lastIndexOf('.');
    return idx === -1 ? '' : path.substring(idx + 1).toLowerCase();
};

// 展示顺序：清单 → 名称表 → 角色数据 → 积木 → 二次加载缓存 → 资源 → 其它
const rjPathRank = path => {
    if (path === 'manifest.json') return 0;
    if (path.indexOf('tables/') === 0) return 1;
    if (path.indexOf('targets/') === 0) return 2;
    if (path.indexOf('blocks/prebuilt/') === 0) return 4;
    if (path.indexOf('blocks/') === 0) return 3;
    if (path.indexOf('assets/') === 0) return 5;
    return 6;
};

const rjNumericSuffix = path => {
    const m = path.match(/(\d+)\.json$/);
    return m ? parseInt(m[1], 10) : -1;
};

const rjPathCompare = (a, b) => {
    const rankDiff = rjPathRank(a) - rjPathRank(b);
    if (rankDiff !== 0) return rankDiff;
    const na = rjNumericSuffix(a);
    const nb = rjNumericSuffix(b);
    if (na !== -1 && nb !== -1 && na !== nb) return na - nb;
    return a < b ? -1 : (a > b ? 1 : 0);
};

const uint8ArrayToDataURL = (u8, mime) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取图片数据失败'));
    reader.readAsDataURL(new Blob([u8], {type: mime}));
});

class SuperRefactorModalContainer extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClose',
            'handleFileChange',
            'selectFile',
            'handleRefresh',
            'applyChanges',
            'downloadProject',
            'getProjectFiles',
            'toggleViewMode',
            'handleEditorScroll',
            'handleEditorKeyDown',
            'handleMonacoMessage',
            'sendToMonacoIframe',
            'handleWindowResize',
            'openSettings',
            'closeSettings',
            'setFileViewMode',
            'setEditorVersion',
            'setEditorOption',
            'resetEditorOptions',
            'toggleFolder'
        ]);

        const savedSettings = loadSuperRefactorSettings();

        this.state = {
            files: [],
            currentFile: 0,
            content: '',
            message: '',
            searchQuery: '',
            filteredFiles: [],
            viewMode: 'code', // code or preview for SVG
            wordWrap: true, // 自动换行
            // 文件面板显示方式：tree = 新版树状结构，list = 旧版平铺列表
            fileViewMode: savedSettings.fileViewMode === 'list' ? 'list' : 'tree',
            // 编辑器版本：新版 Monaco / 旧版内置编辑器（默认新版）
            useMonacoEditor: savedSettings.useMonacoEditor !== false,
            editorOptions: Object.assign({}, DEFAULT_EDITOR_OPTIONS, savedSettings.editorOptions || {}),
            monacoIframeReady: false, // iframe 中的 Monaco 是否就绪
            monacoIframeKey: 0, // 重新打开窗口时强制重建 iframe
            settingsVisible: false, // 设置自由窗口是否打开
            collapsedFolders: {}, // 树状结构中已折叠的文件夹路径
            modalWidth: Math.min(1100, window.innerWidth - 60),
            modalHeight: Math.min(700, window.innerHeight - 80)
        };
        
        this.monacoIframeRef = React.createRef();
        this._monacoReadySource = null;
    }

    componentDidMount () {
        this.loadProjectFiles();
        this.applyThemeToWindow();
        window.addEventListener('resize', this.handleWindowResize);
        window.addEventListener('message', this.handleMonacoMessage);
    }

    componentDidUpdate (prevProps) {
        // 关闭主窗口时同步收起设置窗口，重新打开时按已保存的偏好渲染
        if (prevProps.visible === true && this.props.visible === false && this.state.settingsVisible) {
            this.setState({settingsVisible: false});
        }
        if (prevProps.visible === false && this.props.visible === true) {
            // 重新打开时重建 Monaco iframe，确保内容是最新文件
            this.setState(prevState => ({
                monacoIframeReady: false,
                monacoIframeKey: prevState.monacoIframeKey + 1
            }));
        }

        if (prevProps.theme !== this.props.theme) {
            this.applyThemeToWindow();
        }
        
        // 主题变化时更新 Monaco iframe
        if (this.state.useMonacoEditor && this.state.monacoIframeReady) {
            const isDarkTheme = this.props.theme && typeof this.props.theme.isDark === 'function' ? this.props.theme.isDark() : false;
            this.sendToMonacoIframe({
                type: 'monaco-set-theme',
                theme: isDarkTheme ? 'vs-dark' : 'vs-light'
            });
        }
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.handleWindowResize);
        window.removeEventListener('message', this.handleMonacoMessage);
    }

    handleWindowResize () {
        this.setState({
            modalWidth: Math.min(1100, window.innerWidth - 60),
            modalHeight: Math.min(700, window.innerHeight - 80)
        });
    }

    applyThemeToWindow () {
        const {theme} = this.props;
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        

        
        // 延迟执行以确保窗口已创建
        setTimeout(() => {
            const windowElements = document.querySelectorAll(
                '#superRefactorModal, #superRefactorSettingsModal'
            );
            windowElements.forEach(windowElement => {
                if (isDarkTheme) {
                    windowElement.classList.add('dark-theme');
                    windowElement.style.background = '#1E1E1E';
                    windowElement.style.color = '#e0e0e0';

                    // 标题栏也变成纯黑，避免窗口顶部仍是灰色
                    const headerElement = windowElement.querySelector('.addon-window-header');
                    if (headerElement) {
                        headerElement.style.background = '#1E1E1E';
                        headerElement.style.borderBottomColor = '#3a3a3a';
                    }

                    // 同时也设置内部元素的样式
                    const contentElement = windowElement.querySelector('.addon-window-content');
                    if (contentElement) {
                        contentElement.style.background = '#1E1E1E';
                        contentElement.style.color = '#e0e0e0';
                    }
                    const modalContentElement = windowElement.querySelector('.modal-window-content');
                    if (modalContentElement) {
                        modalContentElement.style.background = '#1E1E1E';
                    }

                    // 设置输入框和文本区域的样式（文本编辑器区域保持原有深色）
                    const inputs = windowElement.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.style.background = input.tagName === 'TEXTAREA' ? '#1e1e1e' : '#1E1E1E';
                        input.style.color = '#e0e0e0';
                        input.style.borderColor = '#555555';
                    });

                } else {
                    windowElement.classList.remove('dark-theme');
                    windowElement.style.background = '';
                    windowElement.style.color = '';

                    const headerElement = windowElement.querySelector('.addon-window-header');
                    if (headerElement) {
                        headerElement.style.background = '';
                        headerElement.style.borderBottomColor = '';
                    }
                    
                    // 移除内部元素的样式
                    const contentElement = windowElement.querySelector('.addon-window-content');
                    if (contentElement) {
                        contentElement.style.background = '';
                        contentElement.style.color = '';
                    }
                    const modalContentElement = windowElement.querySelector('.modal-window-content');
                    if (modalContentElement) {
                        modalContentElement.style.background = '';
                    }
                    
                    // 移除输入框和文本区域的样式
                    const inputs = windowElement.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.style.background = '';
                        input.style.color = '';
                        input.style.borderColor = '';
                    });
                }
            });
        }, 100);
    }

    // 从项目中获取所有文件（JSON、图片、声音等）
    getProjectFiles () {
        const files = [];
        
        if (!this.props.vm) return files;
        
        const runtime = this.props.vm.runtime;
        if (!runtime) return files;

        // 1. 项目JSON
        const projectJson = this.props.vm.toJSON();
        if (projectJson) {
            files.push({
                id: 'project.json',
                name: 'project.json',
                type: 'json',
                content: projectJson,
                size: projectJson.length
            });
        }

        // 2. 获取所有角色的造型和声音
        const targets = runtime.targets || [];
        targets.forEach((target, targetIndex) => {
            const targetName = target.getName ? target.getName() : `target_${targetIndex}`;
            const isStage = target.isStage;

            // 获取造型
            const costumes = target.getCostumes ? target.getCostumes() : [];
            costumes.forEach((costume, costumeIndex) => {
                if (costume.asset) {
                    const ext = costume.asset.dataFormat || 'png';
                    const fileName = isStage 
                        ? `stage/${costume.name}.${ext}`
                        : `${targetName}/costumes/${costume.name}.${ext}`;
                    
                    // 处理不同类型的资产
                    let content = null;
                    let type = 'image';
                    
                    if (ext.toLowerCase() === 'svg') {
                        // SVG 文件应该是文本
                        type = 'svg';
                        if (typeof costume.asset.data === 'string') {
                            content = costume.asset.data;
                        } else if (costume.asset.data) {
                            // 如果是 ArrayBuffer，尝试转换为字符串
                            try {
                                content = new TextDecoder('utf-8').decode(costume.asset.data);
                            } catch (e) {
                                console.error('转换 SVG 失败:', e);
                            }
                        }
                    } else {
                        // 其他图片格式
                        type = 'image';
                        if (costume.asset.data) {
                            // 确保是 Base64 字符串
                            if (typeof costume.asset.data === 'string' && costume.asset.data.startsWith('data:')) {
                                content = costume.asset.data;
                            } else {
                                console.error('图片资产格式不支持预览:', costume.asset.data);
                            }
                        }
                    }
                    
                    files.push({
                        id: `target:${target.id}:costume:${costumeIndex}:asset:${costume.asset.id}`,
                        name: fileName,
                        type: type,
                        content: content,
                        size: content ? content.length : 0,
                        assetType: costume.asset.assetType ? costume.asset.assetType.name : 'image',
                        costume: costume,
                        targetId: target.id,
                        costumeIndex: costumeIndex,
                        isStage: isStage
                    });
                }
            });

            // 获取声音
            const sounds = target.getSounds ? target.getSounds() : [];
            sounds.forEach((sound, soundIndex) => {
                if (sound.asset) {
                    const ext = sound.asset.dataFormat || 'wav';
                    const fileName = isStage
                        ? `stage/sounds/${sound.name}.${ext}`
                        : `${targetName}/sounds/${sound.name}.${ext}`;
                    
                    files.push({
                        id: `target:${target.id}:sound:${soundIndex}:asset:${sound.asset.id}`,
                        name: fileName,
                        type: 'sound',
                        content: sound.asset.data,
                        size: sound.asset.data ? sound.asset.data.length : 0,
                        assetType: sound.asset.assetType ? sound.asset.assetType.name : 'sound',
                        targetId: target.id,
                        isStage: isStage
                    });
                }
            });
        });

        return files;
    }

    async loadProjectFiles () {
        // 当前打开的是 .rj：直接展示 .rj 内部真实的分片文件结构，
        // 而不是把已加载的 VM 重新序列化成 sb3 视图。
        if (hasCurrentRJ()) {
            try {
                await this.loadRJFiles();
                return;
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('读取 .rj 分片失败，回退到 sb3 视图：', e);
            }
        }

        const files = this.getProjectFiles();
        
        if (files.length > 0) {
            let content = files[0].content;
            // 如果是JSON文件，自动格式化显示
            if (files[0].type === 'json') {
                content = this.formatJSON(content);
            }
            
            this.setState({
                files: files,
                filteredFiles: files,
                currentFile: 0,
                content: content
            });
        }
    }

    /**
     * 列出当前 .rj 内部的真实分片文件（只读预览）：
     *   manifest.json、tables/*.json、targets/*.json、
     *   blocks/*.json、blocks/prebuilt/*.json、assets/*
     */
    async loadRJFiles () {
        const zip = await getCurrentRJZip();
        if (!zip) throw new Error('.rj 数据不可用');

        const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir);
        paths.sort(rjPathCompare);

        const buildFile = async path => {
            const entry = zip.file(path);
            if (!entry) return null;
            const ext = rjExtOf(path);
            try {
                if (ext === 'json') {
                    const text = await entry.async('string');
                    return {id: path, name: path, type: 'json', content: text, size: text.length, readOnly: true};
                }
                if (ext === 'svg') {
                    const text = await entry.async('string');
                    return {id: path, name: path, type: 'svg', content: text, size: text.length, readOnly: true};
                }
                if (RJ_IMAGE_EXTS.indexOf(ext) !== -1) {
                    const u8 = await entry.async('uint8array');
                    const dataURL = await uint8ArrayToDataURL(u8, RJ_IMAGE_MIME[ext] || 'image/png');
                    return {id: path, name: path, type: 'image', content: dataURL, size: u8.byteLength, readOnly: true};
                }
                if (ext === 'wav' || ext === 'mp3') {
                    const u8 = await entry.async('uint8array');
                    return {id: path, name: path, type: 'sound', content: u8, size: u8.byteLength, readOnly: true};
                }
                const text = await entry.async('string');
                return {id: path, name: path, type: 'text', content: text, size: text.length, readOnly: true};
            } catch (e) {
                return {id: path, name: path, type: 'text', content: `读取失败: ${e.message}`, size: 0, readOnly: true};
            }
        };

        // 分批并行读取，避免超大作品一次性解压全部资源把内存打爆
        const results = await mapLimit(paths, 8, buildFile);
        const files = results.filter(Boolean);

        if (files.length > 0) {
            let content = files[0].content;
            if (files[0].type === 'json') {
                content = this.formatJSON(content);
            }
            this.setState({
                files,
                filteredFiles: files,
                currentFile: 0,
                content
            });
        }
    }

    handleClose () {
        this.props.onClose();
    }

    handleRefresh () {
        this.loadProjectFiles();
        this.setState({ message: '已刷新！' });
        setTimeout(() => this.setState({ message: '' }), 2000);
    }

    handleFileChange (e) {
        const content = e.target.value;
        const files = [...this.state.files];
        files[this.state.currentFile].content = content;
        this.setState({files, content});
    }

    handleEditorScroll (e) {
        const lineNumbers = e.target.parentElement.previousElementSibling;
        const syntaxHighlight = e.target.previousElementSibling;
        
        if (lineNumbers) {
            lineNumbers.scrollTop = e.target.scrollTop;
        }
        
        if (syntaxHighlight) {
            syntaxHighlight.scrollTop = e.target.scrollTop;
            syntaxHighlight.scrollLeft = e.target.scrollLeft;
        }
    }

    handleEditorKeyDown (e) {
        // 支持Tab键缩进
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const value = e.target.value;
            
            const newValue = value.substring(0, start) + '    ' + value.substring(end);
            e.target.value = newValue;
            e.target.selectionStart = e.target.selectionEnd = start + 4;
            
            this.handleFileChange({target: e.target});
        }
    }

    // 切换到 Monaco 编辑器（iframe 方式）
    setEditorVersion (useMonacoEditor) {
        if (useMonacoEditor === this.state.useMonacoEditor) return;
        this.setState(prevState => ({
            useMonacoEditor,
            monacoIframeReady: false,
            monacoIframeKey: useMonacoEditor ? prevState.monacoIframeKey + 1 : prevState.monacoIframeKey
        }), () => this.saveSettings());
    }

    openSettings () {
        this.setState({settingsVisible: true});
    }

    closeSettings () {
        this.setState({settingsVisible: false});
    }

    saveSettings () {
        try {
            localStorage.setItem(SUPER_REFACTOR_SETTINGS_KEY, JSON.stringify({
                fileViewMode: this.state.fileViewMode,
                useMonacoEditor: this.state.useMonacoEditor,
                editorOptions: this.state.editorOptions
            }));
        } catch (e) {
            // 隐私模式下 localStorage 可能不可用，忽略即可
        }
    }

    setFileViewMode (fileViewMode) {
        if (fileViewMode === this.state.fileViewMode) return;
        this.setState({fileViewMode}, () => this.saveSettings());
    }

    setEditorOption (key, value) {
        this.setState(prevState => ({
            editorOptions: Object.assign({}, prevState.editorOptions, {[key]: value})
        }), () => {
            this.saveSettings();
            this.sendMonacoOptions();
        });
    }

    resetEditorOptions () {
        this.setState({editorOptions: Object.assign({}, DEFAULT_EDITOR_OPTIONS)}, () => {
            this.saveSettings();
            this.sendMonacoOptions();
        });
    }

    // 把界面选项转换成 Monaco 的 updateOptions 参数
    getMonacoOptionPayload () {
        const options = this.state.editorOptions;
        return {
            minimap: {
                enabled: !!options.minimap,
                renderCharacters: true,
                maxColumn: 120
            },
            breadcrumbs: {
                enabled: !!options.breadcrumbs,
                showFileKind: true,
                showSymbol: true
            },
            stickyScroll: {enabled: !!options.stickyScroll},
            guides: {
                indentation: !!options.indentationGuides,
                highlightActiveIndentation: !!options.indentationGuides
            },
            folding: !!options.folding,
            foldingHighlight: !!options.folding,
            showFoldingControls: options.folding ? options.foldingControls : 'never',
            lineNumbers: options.lineNumbers ? 'on' : 'off',
            renderLineHighlight: options.highlightActiveLine ? 'all' : 'none',
            smoothScrolling: !!options.smoothScrolling,
            mouseWheelZoom: !!options.mouseWheelZoom,
            fontSize: Number(options.fontSize) || DEFAULT_EDITOR_OPTIONS.fontSize,
            tabSize: Number(options.tabSize) || DEFAULT_EDITOR_OPTIONS.tabSize,
            renderWhitespace: options.renderWhitespace || 'selection',
            wordWrap: this.state.wordWrap ? 'on' : 'off'
        };
    }

    sendMonacoOptions () {
        if (!this.state.useMonacoEditor || !this.state.monacoIframeReady) return;
        this.sendToMonacoIframe({
            type: 'monaco-set-options',
            options: this.getMonacoOptionPayload()
        });
    }

    // 向 Monaco iframe 发送初始化消息
    sendMonacoInit () {
        if (!this.state.useMonacoEditor) return;
        const {content, wordWrap} = this.state;
        const currentFileObj = this.state.files[this.state.currentFile];
        let language = 'plaintext';
        if (currentFileObj) {
            if (currentFileObj.type === 'json') language = 'json';
            else if (currentFileObj.type === 'svg') language = 'xml';
            else if (currentFileObj.name.endsWith('.js') || currentFileObj.name.endsWith('.jsx')) language = 'javascript';
            else if (currentFileObj.name.endsWith('.ts') || currentFileObj.name.endsWith('.tsx')) language = 'typescript';
            else if (currentFileObj.name.endsWith('.css')) language = 'css';
            else if (currentFileObj.name.endsWith('.html')) language = 'html';
        }
        const isDarkTheme = this.props.theme && typeof this.props.theme.isDark === 'function' ? this.props.theme.isDark() : false;

        this.sendToMonacoIframe({
            type: 'monaco-init',
            content: content || '',
            language: language,
            theme: isDarkTheme ? 'vs-dark' : 'vs-light',
            wordWrap: wordWrap ? 'on' : 'off',
            options: this.getMonacoOptionPayload()
        });
    }

    // 向 Monaco iframe 发送消息
    sendToMonacoIframe (data) {
        if (this.monacoIframeRef.current && this.monacoIframeRef.current.contentWindow) {
            this.monacoIframeRef.current.contentWindow.postMessage(data, '*');
        }
    }

    // 处理来自 Monaco iframe 的消息
    handleMonacoMessage (event) {
        const data = event.data;
        if (!data || !data.type) return;

        switch (data.type) {
            case 'monaco-ready': {
                // 不同 iframe 实例（切换文件类型/切换编辑器版本）会重新就绪，
                // 用 message source 区分，避免同一个 iframe 重复初始化。
                const iframeWindow = this.monacoIframeRef.current &&
                    this.monacoIframeRef.current.contentWindow;
                if (iframeWindow && event.source !== iframeWindow) break;
                if (this._monacoReadySource === event.source) break;
                this._monacoReadySource = event.source;
                this.setState({ monacoIframeReady: true }, () => {
                    this.sendMonacoInit();
                });
                break;
            }

            case 'monaco-content-change':
                if (data.content !== undefined) {
                    const files = [...this.state.files];
                    if (files[this.state.currentFile]) {
                        files[this.state.currentFile].content = data.content;
                    }
                    this.setState({ content: data.content, files });
                }
                break;
        }
    }

    formatJSON (jsonString) {
        if (typeof jsonString !== 'string') return jsonString;
        // vm.toJSON() 输出的已经是格式化 JSON，直接复用，避免大项目重复 parse/stringify
        if (/\n\s{2}/.test(jsonString)) return jsonString;
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return jsonString;
        }
    }

    compressJSON (jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed);
        } catch (e) {
            return jsonString;
        }
    }

    highlightSyntax (code, type) {
        if (!code) return '';
        // 大文件跳过高亮，避免生成大量 span 节点导致界面卡顿
        if (code.length > LARGE_CONTENT_THRESHOLD) {
            return String(code)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        const vsCodeColors = {
            background: '#1e1e1e',
            foreground: '#cccccc',
            comment: '#6a9955',
            keyword: '#569cd6',
            string: '#ce9178',
            number: '#b5cea8',
            functionName: '#dcdcaa',
            className: '#4ec9b0',
            attributeName: '#9cdcfe',
            tagName: '#569cd6',
            operator: '#d4d4d4',
            punctuation: '#808080',
            property: '#9cdcfe',
            meta: '#858585'
        };
        
        const escapeHtml = str => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        if (type === 'json') {
            let processed = escapeHtml(code);
            processed = processed.replace(/"([^"]+)"(?=\s*:)/g, `<span style="color: ${vsCodeColors.property};">"$1"</span>`);
            processed = processed.replace(/:\s*("[^"]*")/g, `<span style="color: ${vsCodeColors.punctuation};">:</span> <span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/:\s*(\d+\.?\d*)/g, `<span style="color: ${vsCodeColors.punctuation};">:</span> <span style="color: ${vsCodeColors.number};">$1</span>`);
            processed = processed.replace(/:\s*(true|false|null)/g, `<span style="color: ${vsCodeColors.punctuation};">:</span> <span style="color: ${vsCodeColors.keyword};">$1</span>`);
            processed = processed.replace(/\{|\}|\[|\]/g, `<span style="color: ${vsCodeColors.punctuation};">$&</span>`);
            processed = processed.replace(/,/g, `<span style="color: ${vsCodeColors.punctuation};">,</span>`);
            return processed;
        } else if (type === 'svg' || type === 'xml') {
            let processed = escapeHtml(code);
            
            processed = processed.replace(/(#[0-9a-fA-F]{3,6})/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\))/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            
            processed = processed.replace(/\b(\d+\.?\d*)\b/g, `<span style="color: ${vsCodeColors.number};">$1</span>`);
            
            processed = processed.replace(/&lt;(\w+)([^&gt;]*)&gt;/g, (match, tagName, attributes) => {
                const attrRegex = /([\w:-]+)(\s*=\s*)("[^"]*"|'[^']*'|\w+)?/g;
                let processedAttributes = attributes.replace(attrRegex, (m, name, eq, val) => {
                    let result = `<span style="color: ${vsCodeColors.attributeName};">${name}</span>`;
                    if (eq) {
                        result += `<span style="color: ${vsCodeColors.punctuation};">${eq}</span>`;
                        if (val) {
                            result += `<span style="color: ${vsCodeColors.string};">${val}</span>`;
                        }
                    }
                    return result;
                });
                
                return `<span style="color: ${vsCodeColors.tagName};">&lt;${tagName}${processedAttributes}&gt;</span>`;
            });
            
            processed = processed.replace(/&lt;\/(\w+)&gt;/g, `<span style="color: ${vsCodeColors.tagName};">&lt;/$1&gt;</span>`);
            processed = processed.replace(/&lt;\?([^&gt;]+)\?&gt;/g, `<span style="color: ${vsCodeColors.meta};">$&</span>`);
            processed = processed.replace(/&lt;\!\-\-([\s\S]*?)\-\-&gt;/g, `<span style="color: ${vsCodeColors.comment};">$&</span>`);
            
            return processed;
        } else if (type === 'html') {
            let processed = escapeHtml(code);
            
            processed = processed.replace(/&lt;(\w+)([^&gt;]*)&gt;/g, (match, tagName, attributes) => {
                const attrRegex = /([\w:-]+)(\s*=\s*)("[^"]*"|'[^']*'|\w+)?/g;
                let processedAttributes = attributes.replace(attrRegex, (m, name, eq, val) => {
                    let result = `<span style="color: ${vsCodeColors.attributeName};">${name}</span>`;
                    if (eq) {
                        result += `<span style="color: ${vsCodeColors.punctuation};">${eq}</span>`;
                        if (val) {
                            result += `<span style="color: ${vsCodeColors.string};">${val}</span>`;
                        }
                    }
                    return result;
                });
                
                return `<span style="color: ${vsCodeColors.tagName};">&lt;${tagName}${processedAttributes}&gt;</span>`;
            });
            
            processed = processed.replace(/&lt;\/(\w+)&gt;/g, `<span style="color: ${vsCodeColors.tagName};">&lt;/$1&gt;</span>`);
            processed = processed.replace(/&lt;\!\-\-([\s\S]*?)\-\-&gt;/g, `<span style="color: ${vsCodeColors.comment};">$&</span>`);
            
            const jsxRegex = /(\{[\s\S]*?\})/g;
            processed = processed.replace(jsxRegex, (match) => {
                let jsContent = match.slice(1, -1);
                jsContent = this.highlightSyntax(jsContent, 'jsx');
                return `<span style="color: ${vsCodeColors.punctuation};">{</span>${jsContent}<span style="color: ${vsCodeColors.punctuation};">}</span>`;
            });
            
            return processed;
        } else if (type === 'jsx' || type === 'javascript') {
            let processed = escapeHtml(code);
            
            const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'new', 'class', 'extends', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'with', 'delete', 'void', 'this', 'super', 'static', 'get', 'set', 'type', 'interface', 'implements', 'private', 'protected', 'public', 'abstract', 'declare', 'namespace', 'module', 'require', 'yield', 'enum', 'package', 'as', 'async', 'of', 'from'];
            
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
                processed = processed.replace(regex, `<span style="color: ${vsCodeColors.keyword};">$1</span>`);
            });
            
            processed = processed.replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, `<span style="color: ${vsCodeColors.keyword};">$1</span>`);
            processed = processed.replace(/\b(\d+\.?\d*)\b/g, `<span style="color: ${vsCodeColors.number};">$1</span>`);
            processed = processed.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(\/\/.*$)/gm, `<span style="color: ${vsCodeColors.comment};">$1</span>`);
            processed = processed.replace(/\/\*[\s\S]*?\*\//g, `<span style="color: ${vsCodeColors.comment};">$&</span>`);
            processed = processed.replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, `<span style="color: ${vsCodeColors.className};">$1</span>`);
            processed = processed.replace(/\b([a-z][a-zA-Z0-9]*)\s*(?=\()/g, `<span style="color: ${vsCodeColors.functionName};">$1</span>`);
            processed = processed.replace(/(\{|\}|\[|\]|\(|\))/g, `<span style="color: ${vsCodeColors.punctuation};">$1</span>`);
            processed = processed.replace(/(\+|\-|\*|\/|%|=|==|===|!=|!==|>|<|>=|<=|&&|\|\||!|\?:|\.)/g, `<span style="color: ${vsCodeColors.operator};">$1</span>`);
            
            return processed;
        } else if (type === 'css') {
            let processed = escapeHtml(code);
            
            processed = processed.replace(/(#[0-9a-fA-F]{3,6})/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\))/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            
            processed = processed.replace(/\b([a-z-]+)\s*(?=:)/g, `<span style="color: ${vsCodeColors.property};">$1</span>`);
            processed = processed.replace(/:\s*([^;]+)/g, (match, value) => {
                let result = `<span style="color: ${vsCodeColors.punctuation};">:</span> `;
                const valueParts = value.trim().split(/(\b[\w-]+\b|\d+\.?\d*)/g);
                valueParts.forEach(part => {
                    if (/^(auto|none|inherit|initial|unset|revert|revert-layer)$/.test(part)) {
                        result += `<span style="color: ${vsCodeColors.keyword};">${part}</span>`;
                    } else if (/^\d+/.test(part)) {
                        result += `<span style="color: ${vsCodeColors.number};">${part}</span>`;
                    } else if (/^[a-z-]+$/.test(part)) {
                        result += `<span style="color: ${vsCodeColors.string};">${part}</span>`;
                    } else {
                        result += part;
                    }
                });
                return result;
            });
            
            processed = processed.replace(/\/\*[\s\S]*?\*\//g, `<span style="color: ${vsCodeColors.comment};">$&</span>`);
            processed = processed.replace(/\{\s*$/gm, `<span style="color: ${vsCodeColors.punctuation};">{</span>`);
            processed = processed.replace(/^\s*\}/gm, `<span style="color: ${vsCodeColors.punctuation};">}</span>`);
            processed = processed.replace(/;/g, `<span style="color: ${vsCodeColors.punctuation};">;</span>`);
            
            return processed;
        }
        
        return escapeHtml(code);
    }

    getLineNumbers (code) {
        // 大文件只生成一个占位，避免每行一个 div 导致 DOM 爆炸
        if ((code || '').length > LARGE_CONTENT_THRESHOLD) {
            return '<div style="padding: 0 10px; text-align: right; color: #666; font-size: 13px; line-height: 1.5;">…</div>';
        }
        const lines = (code || '').split('\n').length;
        let numbers = '';
        for (let i = 1; i <= lines; i++) {
            numbers += `<div style="padding: 0 10px; text-align: right; color: #666; font-size: 13px; line-height: 1.5;">${i}</div>`;
        }
        return numbers;
    }

    selectFile (index) {
        const {filteredFiles} = this.state;
        const selected = filteredFiles[index];
        if (!selected || !selected.id) return;

        // 用唯一 id 匹配，避免重名文件（多角色同名/同名造型）时选错
        const selectedId = selected.id;

        const files = this.state.files.map((file, i) => ({
            ...file,
            selected: file.id === selectedId
        }));

        const fullIndex = files.findIndex(f => f.id === selectedId);
        if (fullIndex === -1) return;

        let content = files[fullIndex].content;

        // 如果是JSON文件，自动格式化显示
        if (files[fullIndex].type === 'json') {
            content = this.formatJSON(content);
        }

        this.setState({
            files,
            currentFile: fullIndex,
            content: content
        }, () => {
            // 文件切换后更新 Monaco iframe
            if (this.state.useMonacoEditor && this.state.monacoIframeReady) {
                this.sendMonacoInit();
            }
        });
    }

    handleSearchChange (e) {
        const query = e.target.value.toLowerCase();
        const {files} = this.state;

        const filtered = files.filter(file =>
            file.name.toLowerCase().includes(query)
        );

        this.setState({
            searchQuery: e.target.value,
            filteredFiles: filtered
        });
    }

    clearSearch () {
        this.setState({
            searchQuery: '',
            filteredFiles: this.state.files
        });
    }

    // 应用修改到VM
    applyChanges () {
        const {files, currentFile} = this.state;
        const file = files[currentFile];
        if (!file) return;

        // .rj 分片文件：把修改写回 .rj 压缩包后重新载入 VM。
        // 分片不是 sb3 形态，无法像 project.json 那样直接 loadProject。
        if (file.readOnly) {
            if (hasCurrentRJ() && (file.type === 'json' || file.type === 'svg')) {
                this.applyRJShard(file);
                return;
            }
            this.setState({message: '.rj 分片文件为只读预览，请用「保存 .rj」重新生成'});
            setTimeout(() => this.setState({message: ''}), 3000);
            return;
        }

        try {
            if (file.name === 'project.json') {
                // 压缩JSON回一行
                const compressedContent = this.compressJSON(file.content);
                const newData = JSON.parse(compressedContent);
                
                if (this.props.vm) {
                    this.props.vm.loadProject(newData).then(() => {
                        this.setState({ message: '✓ 项目已更新！' });
                        setTimeout(() => this.setState({ message: '' }), 3000);
                    }).catch(err => {
                        this.setState({ message: '✗ 更新失败: ' + err.message });
                        setTimeout(() => this.setState({ message: '' }), 5000);
                    });
                }
            } else if (file.type === 'svg' && file.costume && file.targetId) {
                // 更新SVG造型 - 使用存储的 targetId 和 costumeIndex 直接定位
                if (this.props.vm) {
                    const runtime = this.props.vm.runtime;
                    if (runtime) {
                        // 直接通过 targetId 找到对应的目标
                        const target = runtime.targets.find(t => t.id === file.targetId);
                        if (target) {
                            // 使用存储的 costumeIndex 或 asset.id 匹配
                            const spriteCostumes = target.sprite ? target.sprite.costumes : target.getCostumes();
                            let costumeIndex = file.costumeIndex;
                            if (typeof costumeIndex !== 'number' || !spriteCostumes[costumeIndex]) {
                                // fallback: 用 asset.id 查找
                                costumeIndex = spriteCostumes.findIndex(c => c.asset && c.asset.id === file.costume.asset.id);
                            }
                            if (typeof costumeIndex === 'number' && costumeIndex !== -1) {
                                // 把 SVG 文本转成 UTF-8 ArrayBuffer (scratch-storage Asset 期望的 data 类型)
                                const svgText = file.content;
                                const svgBytes = new TextEncoder().encode(svgText);
                                const svgArrayBuffer = svgBytes.buffer.slice(svgBytes.byteOffset, svgBytes.byteOffset + svgBytes.byteLength);

                                // 直接更新 costume asset
                                const costume = spriteCostumes[costumeIndex];
                                if (costume && costume.asset) {
                                    // 关键: setData 的第二个参数是 format，不传就会抛
                                    //   "Data provided without specifying its format"
                                    // 对 SVG 造型来说 dataFormat 固定是 'svg'
                                    if (typeof costume.asset.setData === 'function') {
                                        costume.asset.setData(svgArrayBuffer, 'svg');
                                    } else {
                                        // 直接赋值的兜底 — 同步更新 data / dataFormat / assetId
                                        costume.asset.data = svgArrayBuffer;
                                        // 如果旧 asset 已有 dataFormat 属性，强制写回 'svg'
                                        if ('dataFormat' in costume.asset) {
                                            costume.asset.dataFormat = 'svg';
                                        }
                                        // 让 scratch-storage 重新 hash 出新的 assetId / md5
                                        if (typeof costume.asset.update === 'function') {
                                            costume.asset.update();
                                        }
                                    }
                                }

                                // 强制设置 editingTarget 并尝试用 updateSvg 触发渲染更新
                                const originalEditingTarget = this.props.vm.editingTarget;
                                this.props.vm.editingTarget = target;
                                try {
                                    if (typeof target.setCostume === 'function') {
                                        target.setCostume(costumeIndex);
                                    }
                                    // 调用 updateSvg 以触发完整的更新流程 (可选, 有的 VM 版本没有)
                                    if (typeof this.props.vm.updateSvg === 'function') {
                                        this.props.vm.updateSvg(
                                            costumeIndex,
                                            svgText,
                                            file.costume.rotationCenterX,
                                            file.costume.rotationCenterY
                                        );
                                    }
                                } finally {
                                    this.props.vm.editingTarget = originalEditingTarget;
                                }

                                // 刷新舞台
                                if (typeof this.props.vm.refreshSvg === 'function') {
                                    this.props.vm.refreshSvg(costumeIndex);
                                } else if (target.renderer && typeof target.renderer.updateDrawable === 'function') {
                                    target.renderer.updateDrawable();
                                }

                                this.setState({ message: '✓ SVG造型已更新！' });
                                setTimeout(() => this.setState({ message: '' }), 3000);
                                return;
                            }
                        }
                    }
                }
                this.setState({ message: '✗ 未找到对应的造型或目标' });
                setTimeout(() => this.setState({ message: '' }), 5000);
            } else {
                this.setState({ message: '只有 project.json 和 SVG 可以应用到作品' });
                setTimeout(() => this.setState({ message: '' }), 3000);
            }
        } catch (e) {
            this.setState({ message: '✗ 格式错误: ' + e.message });
            setTimeout(() => this.setState({ message: '' }), 5000);
        }
    }

    // 把 .rj 分片的修改写回压缩包，并用 .rj 加载器重新载入作品
    async applyRJShard (file) {
        if (!this.props.vm) return;
        try {
            // JSON 先校验，避免把损坏的分片写回后整个作品无法载入
            if (file.type === 'json') JSON.parse(file.content);

            const zip = await getCurrentRJZip();
            if (!zip) throw new Error('.rj 数据不可用');

            zip.file(file.name, file.content);
            const buffer = await zip.generateAsync({
                type: 'arraybuffer',
                compression: 'DEFLATE'
            });

            const {loadRJIntoVMProgressive} = await import('../lib/rj/rj-lazy-loader.js');
            await loadRJIntoVMProgressive(this.props.vm, buffer, {});

            this.setState({message: '✓ 分片已应用到作品！'});
            setTimeout(() => this.setState({message: ''}), 3000);
        } catch (e) {
            this.setState({message: '✗ 应用失败: ' + e.message});
            setTimeout(() => this.setState({message: ''}), 5000);
        }
    }

    // 下载项目
    downloadProject () {
        // .rj 模式：直接下载当前 .rj 原始文件，保持分片结构不变
        if (hasCurrentRJ()) {
            const raw = getCurrentRJRaw();
            if (raw) {
                try {
                    const blob = new Blob([raw], {type: 'application/octet-stream'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'project.rj';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    this.setState({message: '已下载 .rj 文件！'});
                    setTimeout(() => this.setState({message: ''}), 3000);
                } catch (e) {
                    this.setState({message: '下载 .rj 失败'});
                    setTimeout(() => this.setState({message: ''}), 5000);
                }
                return;
            }
        }

        const {files} = this.state;
        const projectFile = files.find(f => f.name === 'project.json');
        
        if (projectFile) {
            try {
                const data = JSON.parse(projectFile.content);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'project.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.setState({ message: '已下载项目文件！' });
                setTimeout(() => this.setState({ message: '' }), 3000);
            } catch (e) {
                this.setState({ message: 'JSON格式错误，无法下载' });
                setTimeout(() => this.setState({ message: '' }), 5000);
            }
        }
    }

    // 获取文件图标（复用编辑器图标库 lucide-react）
    getFileIcon (type) {
        switch (type) {
            case 'json': return <FileCode size={14} />;
            case 'image': return <FileImage size={14} />;
            case 'svg': return <FileImage size={14} />;
            case 'sound': return <FileAudio size={14} />;
            default: return <File size={14} />;
        }
    }

    // 切换预览/代码模式
    toggleViewMode () {
        this.setState(prevState => ({
            viewMode: prevState.viewMode === 'preview' ? 'code' : 'preview'
        }));
    }

    // -----------------------------------------------------------------------
    // 文件树（.rj / .sb3 的文件名本身就是用 / 分隔的路径）
    // -----------------------------------------------------------------------
    buildFileTree (files) {
        const root = {name: '', path: '', folders: new Map(), files: []};

        files.forEach((file, index) => {
            const parts = String(file.name || '').split('/').filter(part => part.length > 0);
            let node = root;

            for (let i = 0; i < parts.length - 1; i++) {
                const folderName = parts[i];
                const folderPath = parts.slice(0, i + 1).join('/');
                let child = node.folders.get(folderName);
                if (!child) {
                    child = {name: folderName, path: folderPath, folders: new Map(), files: []};
                    node.folders.set(folderName, child);
                }
                node = child;
            }

            node.files.push({
                name: parts.length > 0 ? parts[parts.length - 1] : String(file.name || ''),
                file,
                index
            });
        });

        return root;
    }

    toggleFolder (path) {
        this.setState(prevState => ({
            collapsedFolders: Object.assign({}, prevState.collapsedFolders, {
                [path]: !prevState.collapsedFolders[path]
            })
        }));
    }

    renderFileTreeNodes (node, depth, forceExpand, currentFileObj, colors) {
        const rows = [];

        const folders = Array.from(node.folders.values()).sort((a, b) => {
            const rankDiff = rjPathRank(a.path) - rjPathRank(b.path);
            if (rankDiff !== 0) return rankDiff;
            return a.name.localeCompare(b.name);
        });

        folders.forEach(folder => {
            const collapsed = !forceExpand && !!this.state.collapsedFolders[folder.path];
            rows.push(
                <div
                    key={`folder:${folder.path}`}
                    onClick={() => this.toggleFolder(folder.path)}
                    title={folder.path}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: `6px 10px 6px ${10 + (depth * 14)}px`,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: colors.textSecondary,
                        userSelect: 'none'
                    }}
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    {collapsed ? <Folder size={14} /> : <FolderOpen size={14} />}
                    <span style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {folder.name}
                    </span>
                </div>
            );

            if (!collapsed) {
                rows.push(...this.renderFileTreeNodes(
                    folder, depth + 1, forceExpand, currentFileObj, colors
                ));
            }
        });

        const indent = 10 + (depth * 14) + (node.path ? 16 : 0);
        node.files.forEach(leaf => {
            const {file, index, name} = leaf;
            const isSelected = !!(currentFileObj && file.id === currentFileObj.id);
            rows.push(
                <div
                    key={`file:${file.id}:${index}`}
                    onClick={() => this.selectFile(index)}
                    title={file.name}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: `7px 10px 7px ${indent}px`,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        background: isSelected ? '#4d97ff' : 'transparent',
                        color: isSelected ? 'white' : colors.text,
                        borderBottom: `1px solid ${colors.border}`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                    }}
                >
                    <span style={{display: 'flex', alignItems: 'center', flexShrink: 0}}>
                        {this.getFileIcon(file.type)}
                    </span>
                    <span style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>{name}</span>
                </div>
            );
        });

        return rows;
    }

    renderFileTree (colors) {
        const {filteredFiles, currentFile, files, searchQuery} = this.state;
        const currentFileObj = files[currentFile];

        if (filteredFiles.length === 0) {
            return (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '13px'
                }}>
                    没有找到匹配的文件
                </div>
            );
        }

        const root = this.buildFileTree(filteredFiles);
        // 搜索时强制展开所有目录，保证命中的文件可见
        const forceExpand = searchQuery.length > 0;

        return this.renderFileTreeNodes(root, 0, forceExpand, currentFileObj, colors);
    }

    // -----------------------------------------------------------------------
    // 设置自由窗口
    // -----------------------------------------------------------------------
    renderSettingRadio (name, label, checked, onSelect) {
        return (
            <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 0',
                fontSize: '13px',
                cursor: 'pointer'
            }}>
                <input
                    type="radio"
                    name={name}
                    checked={checked}
                    onChange={onSelect}
                    style={{cursor: 'pointer'}}
                />
                <span>{label}</span>
            </label>
        );
    }

    renderSettingToggle (label, checked, onChange) {
        return (
            <label key={label} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '7px 0',
                fontSize: '13px',
                cursor: 'pointer'
            }}>
                <span>{label}</span>
                <input
                    type="checkbox"
                    checked={!!checked}
                    onChange={e => onChange(e.target.checked)}
                    style={{width: '16px', height: '16px', cursor: 'pointer'}}
                />
            </label>
        );
    }

    renderSettingSelect (label, value, options, onChange, colors) {
        return (
            <label key={label} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '7px 0',
                fontSize: '13px'
            }}>
                <span>{label}</span>
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        padding: '4px 8px',
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: '3px',
                        background: colors.inputBg,
                        color: colors.text,
                        fontSize: '12px'
                    }}
                >
                    {options.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </label>
        );
    }

    renderSettingsWindow () {
        const {theme} = this.props;
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        const colors = {
            background: isDarkTheme ? '#1E1E1E' : '#ffffff',
            text: isDarkTheme ? '#e0e0e0' : '#333333',
            textSecondary: isDarkTheme ? '#a0a0a0' : '#666666',
            border: isDarkTheme ? '#444444' : '#cccccc',
            headerBg: isDarkTheme ? '#1E1E1E' : '#f5f5f5',
            inputBg: isDarkTheme ? '#1E1E1E' : '#ffffff',
            inputBorder: isDarkTheme ? '#555555' : '#cccccc'
        };
        const {fileViewMode, useMonacoEditor, editorOptions} = this.state;

        const sectionStyle = {
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '14px',
            background: colors.headerBg
        };
        const sectionTitleStyle = {
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '4px',
            color: colors.text
        };

        return (
            <Modal
                id="superRefactorSettingsModal"
                contentLabel="超级重构设置"
                visible={!!this.props.visible && this.state.settingsVisible}
                className={`super-refactor-modal ${isDarkTheme ? 'dark-theme' : ''}`}
                onRequestClose={this.closeSettings}
                showHeader
                width={460}
                height={Math.min(620, window.innerHeight - 100)}
            >
                <div style={{
                    height: 'calc(100% - 40px)',
                    overflow: 'auto',
                    padding: '16px 20px',
                    boxSizing: 'border-box',
                    background: colors.background,
                    color: colors.text
                }}>
                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}>文件列表显示</div>
                        {this.renderSettingRadio('tree-file-view', '树状结构（新版）',
                            fileViewMode === 'tree', () => this.setFileViewMode('tree'))}
                        {this.renderSettingRadio('tree-file-view', '平铺列表（旧版）',
                            fileViewMode === 'list', () => this.setFileViewMode('list'))}
                    </div>

                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}>编辑器版本</div>
                        {this.renderSettingRadio('editor-version', '新版编辑器（Monaco）',
                            useMonacoEditor, () => this.setEditorVersion(true))}
                        {this.renderSettingRadio('editor-version', '旧版编辑器（内置）',
                            !useMonacoEditor, () => this.setEditorVersion(false))}
                    </div>

                    {useMonacoEditor && (
                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>新版编辑器选项</div>
                            {this.renderSettingToggle('侧边代码预览（小地图）',
                                editorOptions.minimap,
                                value => this.setEditorOption('minimap', value))}
                            {this.renderSettingToggle('代码折叠',
                                editorOptions.folding,
                                value => this.setEditorOption('folding', value))}
                            {editorOptions.folding && this.renderSettingSelect('折叠控件',
                                editorOptions.foldingControls,
                                [
                                    {value: 'always', label: '始终显示'},
                                    {value: 'mouseover', label: '悬停显示'}
                                ],
                                value => this.setEditorOption('foldingControls', value),
                                colors)}
                            {this.renderSettingToggle('顶部面包屑导航',
                                editorOptions.breadcrumbs,
                                value => this.setEditorOption('breadcrumbs', value))}
                            {this.renderSettingToggle('吸顶滚动（固定当前作用域）',
                                editorOptions.stickyScroll,
                                value => this.setEditorOption('stickyScroll', value))}
                            {this.renderSettingToggle('显示行号',
                                editorOptions.lineNumbers,
                                value => this.setEditorOption('lineNumbers', value))}
                            {this.renderSettingToggle('缩进参考线',
                                editorOptions.indentationGuides,
                                value => this.setEditorOption('indentationGuides', value))}
                            {this.renderSettingToggle('高亮当前行',
                                editorOptions.highlightActiveLine,
                                value => this.setEditorOption('highlightActiveLine', value))}
                            {this.renderSettingToggle('平滑滚动',
                                editorOptions.smoothScrolling,
                                value => this.setEditorOption('smoothScrolling', value))}
                            {this.renderSettingToggle('Ctrl + 滚轮缩放字号',
                                editorOptions.mouseWheelZoom,
                                value => this.setEditorOption('mouseWheelZoom', value))}
                            {this.renderSettingSelect('字号',
                                String(editorOptions.fontSize),
                                [
                                    {value: '12', label: '12'},
                                    {value: '13', label: '13'},
                                    {value: '14', label: '14'},
                                    {value: '16', label: '16'},
                                    {value: '18', label: '18'},
                                    {value: '20', label: '20'}
                                ],
                                value => this.setEditorOption('fontSize', Number(value)),
                                colors)}
                            {this.renderSettingSelect('Tab 宽度',
                                String(editorOptions.tabSize),
                                [
                                    {value: '2', label: '2'},
                                    {value: '4', label: '4'},
                                    {value: '8', label: '8'}
                                ],
                                value => this.setEditorOption('tabSize', Number(value)),
                                colors)}
                            {this.renderSettingSelect('空白字符',
                                editorOptions.renderWhitespace,
                                [
                                    {value: 'none', label: '不显示'},
                                    {value: 'selection', label: '选中区域'},
                                    {value: 'all', label: '全部'}
                                ],
                                value => this.setEditorOption('renderWhitespace', value),
                                colors)}
                            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '6px'}}>
                                <button
                                    onClick={this.resetEditorOptions}
                                    style={{
                                        padding: '4px 10px',
                                        background: 'transparent',
                                        color: colors.textSecondary,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    恢复默认
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <Button onClick={this.closeSettings}>
                            完成
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    render () {
        const {visible, theme} = this.props;
        const {files, currentFile, content, message, searchQuery, filteredFiles, viewMode, wordWrap, fileViewMode} = this.state;
        const currentFileObj = files[currentFile];
        const currentFileName = currentFileObj ? currentFileObj.name : '';
        const currentFileType = currentFileObj ? currentFileObj.type : '';
        // 大文件使用纯文本编辑器，避免高亮/行号 DOM 过多导致卡顿
        const largeContent = typeof content === 'string' && content.length > LARGE_CONTENT_THRESHOLD;

        // 判断是否为深色主题
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        
        // 主题颜色
        const colors = {
            background: isDarkTheme ? '#1E1E1E' : '#ffffff',
            text: isDarkTheme ? '#e0e0e0' : '#333333',
            textSecondary: isDarkTheme ? '#a0a0a0' : '#666666',
            border: isDarkTheme ? '#3a3a3a' : '#cccccc',
            headerBg: isDarkTheme ? '#1E1E1E' : '#f5f5f5',
            inputBg: isDarkTheme ? '#1E1E1E' : '#ffffff',
            inputBorder: isDarkTheme ? '#555555' : '#cccccc',
            buttonBg: isDarkTheme ? '#1E1E1E' : '#f5f5f5',
            buttonHover: isDarkTheme ? '#1a1a1a' : '#e0e0e0',
            // 文本编辑器区域保持原有深色，不跟随窗口变成纯黑
            editorBg: isDarkTheme ? '#1e1e1e' : '#ffffff'
        };

        // 是否可以编辑
        const canEdit = currentFileType === 'json' || currentFileType === 'svg';
        // 是否可以应用（.rj 的 JSON 分片可写回压缩包后重新载入）
        const canApply = currentFileName === 'project.json' ||
            currentFileType === 'svg' ||
            (hasCurrentRJ() && currentFileType === 'json');
        // 是否是SVG文件
        const isSvg = currentFileType === 'svg';
        // 是否显示切换按钮
        const showToggleButton = isSvg;

        // 底部按钮区样式（内联样式，避免 CSS Modules 作用域影响）
        const footerStyle = {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            flexShrink: 0,
            marginTop: '10px',
            paddingTop: '10px',
            paddingBottom: '12px',
            borderTop: `1px solid ${colors.border}`
        };
        const footerButtonStyle = {
            display: 'inline-flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            minHeight: '34px',
            padding: '7px 14px',
            boxSizing: 'border-box',
            border: `1px solid ${isDarkTheme ? '#4a4a4a' : '#b9b9b9'}`,
            borderRadius: '4px',
            background: colors.buttonBg,
            color: colors.text,
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            touchAction: 'manipulation'
        };
        const footerSettingsStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: '36px',
            height: '36px',
            padding: 0,
            boxSizing: 'border-box',
            border: `1px solid ${isDarkTheme ? '#4a4a4a' : '#b9b9b9'}`,
            borderRadius: '4px',
            background: colors.buttonBg,
            color: colors.textSecondary,
            cursor: 'pointer',
            touchAction: 'manipulation'
        };

        return (
            <Modal
                id="superRefactorModal"
                contentLabel="超级重构"
                visible={!!visible}
                className={`super-refactor-modal ${isDarkTheme ? 'dark-theme' : ''}`}
                onRequestClose={this.handleClose}
                showHeader={false}
                width={this.state.modalWidth}
                height={this.state.modalHeight}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    padding: '20px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    background: colors.background,
                    color: colors.text
                }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                            {files.length > 0 && (
                                <div style={{
                                    fontSize: '12px',
                                    color: colors.textSecondary
                                }}>
                                    共 {files.length} 个文件
                                </div>
                            )}
                            {message && (
                                <div style={{
                                    padding: '8px 16px',
                                    background: message.includes('✓') ? '#4CAF50' : 
                                               message.includes('✗') ? '#f44336' : '#4d97ff',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                }}>
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        flex: 1,
                        gap: '10px',
                        marginTop: '15px',
                        minHeight: 0,
                        overflow: 'hidden'
                    }}>
                        {/* 文件列表 */}
                        <div style={{
                            width: '280px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            overflow: 'hidden',
                            background: colors.background,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* 搜索框 */}
                            <div style={{
                                padding: '10px',
                                borderBottom: `1px solid ${colors.border}`,
                                background: colors.headerBg
                            }}>
                                <div style={{display: 'flex', gap: '5px'}}>
                                    <input
                                        type="text"
                                        placeholder="搜索文件..."
                                        value={searchQuery}
                                        onChange={this.handleSearchChange}
                                        style={{
                                            flex: 1,
                                            padding: '6px 10px',
                                            border: `1px solid ${colors.inputBorder}`,
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            background: colors.inputBg,
                                            color: colors.text
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={this.clearSearch}
                                            style={{
                                                padding: '6px 10px',
                                                background: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            清除
                                        </button>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: colors.textSecondary,
                                    marginTop: '5px'
                                }}>
                                    {filteredFiles.length} / {files.length} 个文件
                                </div>
                            </div>

                            {/* 文件列表：树状结构 / 旧版平铺列表 */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto'
                            }}>
                                {fileViewMode === 'tree' ? this.renderFileTree(colors) : (
                                    filteredFiles.length === 0 ? (
                                        <div style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '13px'
                                        }}>
                                            没有找到匹配的文件
                                        </div>
                                    ) : (
                                        filteredFiles.map((file, index) => {
                                            const isSelected = !!(currentFileObj && file.id === currentFileObj.id);

                                            return (
                                                <div
                                                key={index}
                                                onClick={() => this.selectFile(index)}
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    background: isSelected ? '#4d97ff' : colors.background,
                                                    color: isSelected ? 'white' : colors.text,
                                                    borderBottom: `1px solid ${colors.border}`,
                                                    fontSize: '12px',
                                                    fontFamily: 'monospace',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                                title={file.name}
                                            >
                                                    <span style={{display: 'flex', alignItems: 'center', flexShrink: 0}}>
                        {this.getFileIcon(file.type)}
                    </span>
                                                    <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                        {file.name}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )
                                )}
                            </div>
                        </div>

                        {/* 编辑器/预览区 */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0
                        }}>
                            <div style={{
                                padding: '10px 15px',
                                background: colors.headerBg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '4px 4px 0 0',
                                borderBottom: 'none',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: colors.text
                            }}>
                                <span>{currentFileName}</span>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                    {currentFileObj && (
                                        <span style={{fontSize: '11px', color: colors.textSecondary}}>
                                            {currentFileObj.type === 'json' ? 'JSON' : 
                                             currentFileObj.type === 'svg' ? 'SVG' :
                                             currentFileObj.type === 'image' ? '图片' : 
                                             currentFileObj.type === 'sound' ? '声音' : '文件'}
                                            {currentFileObj.size ? ` (${Math.round(currentFileObj.size / 1024)} KB)` : ''}
                                        </span>
                                    )}
                                    {showToggleButton && (
                                        <button
                                            onClick={this.toggleViewMode}
                                            style={{
                                                padding: '4px 8px',
                                                background: viewMode === 'code' ? '#4d97ff' : colors.buttonBg,
                                                color: viewMode === 'code' ? 'white' : colors.text,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                fontWeight: viewMode === 'code' ? 'bold' : 'normal'
                                            }}
                                        >
                                            {viewMode === 'preview' ? '显示代码' : '显示预览'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {isSvg ? (
                                viewMode === 'code' ? (
                                    this.state.useMonacoEditor ? (
                                        // Monaco 编辑器 iframe
                                        <iframe
                                            key={`monaco-svg-${this.state.monacoIframeKey}`}
                                            ref={this.monacoIframeRef}
                                            src="/monaco-editor-iframe.html"
                                            style={{
                                                flex: 1,
                                                minHeight: 0,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '0 0 4px 4px',
                                                width: '100%',
                                                pointerEvents: 'auto'
                                            }}
                                            frameBorder="0"
                                        />
                                    ) : largeContent ? (
                                        <textarea
                                            value={content}
                                            onChange={this.handleFileChange}
                                            onKeyDown={this.handleEditorKeyDown}
                                            spellCheck="false"
                                            style={{
                                                flex: 1,
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                padding: '15px',
                                                fontFamily: "Consolas, 'Courier New', monospace",
                                                fontSize: '13px',
                                                lineHeight: '1.5',
                                                resize: 'none',
                                                outline: 'none',
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '0 0 4px 4px',
                                                background: colors.editorBg,
                                                color: colors.text,
                                                whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                wordWrap: wordWrap ? 'break-word' : 'normal',
                                                overflow: 'auto'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0 0 4px 4px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                background: colors.editorBg,
                                                borderRight: `1px solid ${colors.border}`,
                                                overflow: 'hidden'
                                            }} dangerouslySetInnerHTML={{ __html: this.getLineNumbers(content) }} />
                                            <div style={{
                                                flex: 1,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    padding: '15px',
                                                    fontFamily: "Consolas, 'Courier New', monospace",
                                                    fontSize: '13px',
                                                    lineHeight: '1.5',
                                                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                    wordWrap: wordWrap ? 'break-word' : 'normal',
                                                    overflow: 'auto',
                                                    pointerEvents: 'none',
                                                    color: colors.text
                                                }} dangerouslySetInnerHTML={{ __html: this.highlightSyntax(content, 'svg') }} />
                                                <textarea
                                                    value={content}
                                                    onChange={this.handleFileChange}
                                                    onKeyDown={this.handleEditorKeyDown}
                                                    onScroll={this.handleEditorScroll}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        bottom: 0,
                                                        padding: '15px',
                                                        fontFamily: "Consolas, 'Courier New', monospace",
                                                        fontSize: '13px',
                                                        lineHeight: '1.5',
                                                        resize: 'none',
                                                        outline: 'none',
                                                        background: 'transparent',
                                                        color: 'transparent',
                                                        caretColor: colors.text,
                                                        border: 'none',
                                                        whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                        wordWrap: wordWrap ? 'break-word' : 'normal',
                                                        overflow: 'auto'
                                                    }}
                                                    spellCheck="false"
                                                />
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '0 0 4px 4px',
                                        background: colors.headerBg,
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'auto',
                                            margin: '20px'
                                        }}>
                                            {content ? (
                                                <div style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '100%'
                                                }}>
                                                    <svg dangerouslySetInnerHTML={{ __html: content }} />
                                                </div>
                                            ) : (
                                                <div style={{color: '#999'}}>无法预览SVG</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            ) : canEdit ? (
                                this.state.useMonacoEditor ? (
                                    // Monaco 编辑器 iframe
                                    <iframe
                                        key={`monaco-file-${this.state.monacoIframeKey}`}
                                        ref={this.monacoIframeRef}
                                        src="/monaco-editor-iframe.html"
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0 0 4px 4px',
                                            width: '100%',
                                            pointerEvents: 'auto'
                                        }}
                                        frameBorder="0"
                                    />
                                ) : largeContent ? (
                                    <textarea
                                        value={content}
                                        onChange={this.handleFileChange}
                                        onKeyDown={this.handleEditorKeyDown}
                                        spellCheck="false"
                                        style={{
                                            flex: 1,
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '15px',
                                            fontFamily: "Consolas, 'Courier New', monospace",
                                            fontSize: '13px',
                                            lineHeight: '1.5',
                                            resize: 'none',
                                            outline: 'none',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0 0 4px 4px',
                                            background: colors.inputBg,
                                            color: colors.text,
                                            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                            wordWrap: wordWrap ? 'break-word' : 'normal',
                                            overflow: 'auto'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '0 0 4px 4px',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            background: colors.headerBg,
                                            borderRight: `1px solid ${colors.border}`,
                                            overflow: 'hidden'
                                        }} dangerouslySetInnerHTML={{ __html: this.getLineNumbers(content) }} />
                                        <div style={{
                                            flex: 1,
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                padding: '15px',
                                                fontFamily: "Consolas, 'Courier New', monospace",
                                                fontSize: '13px',
                                                lineHeight: '1.5',
                                                whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                wordWrap: wordWrap ? 'break-word' : 'normal',
                                                overflow: 'auto',
                                                pointerEvents: 'none',
                                                color: colors.text
                                            }} dangerouslySetInnerHTML={{ __html: this.highlightSyntax(content, 'json') }} />
                                            <textarea
                                                value={content}
                                                onChange={this.handleFileChange}
                                                onKeyDown={this.handleEditorKeyDown}
                                                onScroll={this.handleEditorScroll}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    padding: '15px',
                                                    fontFamily: "Consolas, 'Courier New', monospace",
                                                    fontSize: '13px',
                                                    lineHeight: '1.5',
                                                    resize: 'none',
                                                    outline: 'none',
                                                    background: 'transparent',
                                                    color: 'transparent',
                                                    caretColor: colors.text,
                                                    border: 'none',
                                                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                    wordWrap: wordWrap ? 'break-word' : 'normal',
                                                    overflow: 'auto'
                                                }}
                                                spellCheck="false"
                                            />
                                    </div>
                                </div>
                            )
                            ) : currentFileType === 'image' ? (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0 0 4px 4px',
                                    background: colors.headerBg,
                                    overflow: 'auto'
                                }}>
                                    {content ? (
                                        <img 
                                            src={content} 
                                            alt={currentFileName}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <div style={{color: '#999'}}>无法预览图片</div>
                                    )}
                                </div>
                            ) : (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0 0 4px 4px',
                                    background: colors.headerBg,
                                    color: colors.textSecondary
                                }}>
                                    此文件类型不支持编辑
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 按钮：固定在窗口底部 */}
                    <div
                        className="super-refactor-footer"
                        style={footerStyle}
                    >
                        <Button
                            className="super-refactor-footer-button"
                            style={footerButtonStyle}
                            onClick={this.handleRefresh}
                        >
                            刷新
                        </Button>
                        <Button
                            className="super-refactor-footer-button"
                            style={Object.assign({}, footerButtonStyle, {
                                opacity: canApply ? 1 : 0.5
                            })}
                            onClick={this.applyChanges}
                            disabled={!canApply}
                        >
                            {canApply ? '应用到作品' : '不可应用'}
                        </Button>
                        <Button
                            className="super-refactor-footer-button"
                            style={footerButtonStyle}
                            onClick={this.downloadProject}
                        >
                            下载项目
                        </Button>
                        <Button
                            className="super-refactor-footer-button"
                            style={footerButtonStyle}
                            onClick={this.handleClose}
                        >
                            关闭
                        </Button>
                        <button
                            className="super-refactor-footer-settings"
                            onClick={this.openSettings}
                            title="超级重构设置"
                            style={footerSettingsStyle}
                        >
                            <Settings size={17} />
                        </button>
                    </div>
                </div>

                {/* 设置自由窗口（独立浮动窗口） */}
                {this.state.settingsVisible && this.renderSettingsWindow()}
            </Modal>
        );
    }
}

SuperRefactorModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM),
    theme: PropTypes.object,
    intl: PropTypes.object
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.superRefactorModal,
    vm: state.scratchGui.vm,
    theme: state.scratchGui.theme.theme
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeSuperRefactorModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(SuperRefactorModalContainer));
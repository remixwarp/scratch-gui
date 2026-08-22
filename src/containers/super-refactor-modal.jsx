import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeSuperRefactorModal} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import Button from '../components/button/button.jsx';
import VM from 'scratch-vm';
import './super-refactor-modal.css';

// 超过该字节数的文件不做逐 token 语法高亮与逐行行号渲染，避免打开卡顿
const LARGE_CONTENT_THRESHOLD = 150000;

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
            'handleWordWrapToggle',
            'toggleMonacoEditor',
            'handleMonacoMessage',
            'sendToMonacoIframe',
            'handleWindowResize'
        ]);

        this.state = {
            files: [],
            currentFile: 0,
            content: '',
            message: '',
            searchQuery: '',
            filteredFiles: [],
            viewMode: 'code', // code or preview for SVG
            wordWrap: true, // 自动换行
            useMonacoEditor: true, // 是否使用 Monaco 编辑器（默认新版）
            monacoIframeReady: false, // iframe 中的 Monaco 是否就绪
            modalWidth: Math.min(1100, window.innerWidth - 60),
            modalHeight: Math.min(700, window.innerHeight - 80)
        };
        
        this.monacoIframeRef = React.createRef();
    }

    componentDidMount () {
        this.loadProjectFiles();
        this.applyThemeToWindow();
        window.addEventListener('resize', this.handleWindowResize);
        window.addEventListener('message', this.handleMonacoMessage);
    }

    componentDidUpdate (prevProps) {
        // 每次打开时默认重置为新版 Monaco 编辑器，避免状态跨打开残留（点击“旧版编辑器”才会切回）
        if (prevProps.visible === false && this.props.visible === true) {
            this.setState({
                useMonacoEditor: true,
                monacoIframeReady: false,
                wordWrap: true
            });
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
            const windowElement = document.querySelector('#superRefactorModal');
            if (windowElement) {
                if (isDarkTheme) {
                    windowElement.classList.add('dark-theme');
                    windowElement.style.background = '#2d2d2d';
                    windowElement.style.color = '#e0e0e0';
                    
                    // 同时也设置内部元素的样式
                    const contentElement = windowElement.querySelector('.addon-window-content');
                    if (contentElement) {
                        contentElement.style.background = '#2d2d2d';
                        contentElement.style.color = '#e0e0e0';
                    }
                    
                    // 设置输入框和文本区域的样式
                    const inputs = windowElement.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.style.background = '#3a3a3a';
                        input.style.color = '#e0e0e0';
                        input.style.borderColor = '#555555';
                    });
                    
                } else {
                    windowElement.classList.remove('dark-theme');
                    windowElement.style.background = '';
                    windowElement.style.color = '';
                    
                    // 移除内部元素的样式
                    const contentElement = windowElement.querySelector('.addon-window-content');
                    if (contentElement) {
                        contentElement.style.background = '';
                        contentElement.style.color = '';
                    }
                    
                    // 移除输入框和文本区域的样式
                    const inputs = windowElement.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.style.background = '';
                        input.style.color = '';
                        input.style.borderColor = '';
                    });
                }
            }
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
                        targetId: target.id, // 保存目标ID，用于精确定位
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

    loadProjectFiles () {
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

    handleWordWrapToggle () {
        const newWordWrap = !this.state.wordWrap;
        this.setState({ wordWrap: newWordWrap }, () => {
            // 更新 Monaco iframe 的 wordWrap 设置
            if (this.state.useMonacoEditor && this.state.monacoIframeReady) {
                this.sendToMonacoIframe({
                    type: 'monaco-set-wordwrap',
                    wordWrap: newWordWrap
                });
            }
        });
    }

    // 切换到 Monaco 编辑器（iframe 方式）
    toggleMonacoEditor () {
        const newValue = !this.state.useMonacoEditor;
        this.setState({ 
            useMonacoEditor: newValue,
            monacoIframeReady: false
        });
        // 初始化由 iframe 的 monaco-ready 消息触发，无需手动延迟发送
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
            wordWrap: wordWrap ? 'on' : 'off'
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
            case 'monaco-ready':
                // 只在首次就绪时发送初始化，避免重复创建编辑器
                if (!this.state.monacoIframeReady) {
                    this.setState({ monacoIframeReady: true }, () => {
                        this.sendMonacoInit();
                    });
                }
                break;

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
                // 更新SVG造型 - 使用存储的 targetId 精确定位目标
                if (this.props.vm) {
                    const runtime = this.props.vm.runtime;
                    if (runtime) {
                        // 直接通过 targetId 找到对应的目标，避免因 assetId 冲突导致错误更新到舞台
                        const target = runtime.targets.find(t => t.id === file.targetId);
                        if (target) {
                            const costumes = target.getCostumes ? target.getCostumes() : [];
                            const costumeIndex = costumes.findIndex(c => c.asset && c.asset.id === file.costume.asset.id);
                            if (costumeIndex !== -1) {
                                // 保存原来的编辑目标
                                const originalEditingTarget = this.props.vm.editingTarget;
                                
                                // 临时设置为当前 target 作为编辑目标
                                this.props.vm.editingTarget = target;
                                
                                // 调用 updateSvg 来更新造型
                                this.props.vm.updateSvg(
                                    costumeIndex,
                                    file.content,
                                    file.costume.rotationCenterX,
                                    file.costume.rotationCenterY
                                );
                                
                                // 恢复原来的编辑目标
                                this.props.vm.editingTarget = originalEditingTarget;
                                
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

    // 下载项目
    downloadProject () {
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

    // 获取文件图标
    getFileIcon (type) {
        switch (type) {
            case 'json': return '▤';
            case 'image': return '▣';
            case 'svg': return '◇';
            case 'sound': return '♪';
            default: return '▢';
        }
    }

    // 切换预览/代码模式
    toggleViewMode () {
        this.setState(prevState => ({
            viewMode: prevState.viewMode === 'preview' ? 'code' : 'preview'
        }));
    }

    render () {
        const {visible, theme} = this.props;
        const {files, currentFile, content, message, searchQuery, filteredFiles, viewMode, wordWrap} = this.state;
        const currentFileObj = files[currentFile];
        const currentFileName = currentFileObj ? currentFileObj.name : '';
        const currentFileType = currentFileObj ? currentFileObj.type : '';
        // 大文件使用纯文本编辑器，避免高亮/行号 DOM 过多导致卡顿
        const largeContent = typeof content === 'string' && content.length > LARGE_CONTENT_THRESHOLD;

        // 判断是否为深色主题
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        
        // 主题颜色
        const colors = {
            background: isDarkTheme ? '#2d2d2d' : '#ffffff',
            text: isDarkTheme ? '#e0e0e0' : '#333333',
            textSecondary: isDarkTheme ? '#a0a0a0' : '#666666',
            border: isDarkTheme ? '#444444' : '#cccccc',
            headerBg: isDarkTheme ? '#3a3a3a' : '#f5f5f5',
            inputBg: isDarkTheme ? '#3a3a3a' : '#ffffff',
            inputBorder: isDarkTheme ? '#555555' : '#cccccc',
            buttonBg: isDarkTheme ? '#4a4a4a' : '#f5f5f5',
            buttonHover: isDarkTheme ? '#5a5a5a' : '#e0e0e0'
        };

        // 是否可以编辑
        const canEdit = currentFileType === 'json' || currentFileType === 'svg';
        // 是否可以应用
        const canApply = currentFileName === 'project.json' || currentFileType === 'svg';
        // 是否是SVG文件
        const isSvg = currentFileType === 'svg';
        // 是否显示切换按钮
        const showToggleButton = isSvg;

        return (
            <Modal
                id="superRefactorModal"
                contentLabel="超级重构"
                visible={!!visible}
                className={`super-refactor-modal ${isDarkTheme ? 'dark-theme' : ''}`}
                onRequestClose={this.handleClose}
                showHeader={true}
                width={this.state.modalWidth}
                height={this.state.modalHeight}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100% - 40px)',
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

                            {/* 文件列表 */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto'
                            }}>
                                {filteredFiles.length === 0 ? (
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
                                                <span>{this.getFileIcon(file.type)}</span>
                                                <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                    {file.name}
                                                </span>
                                            </div>
                                        );
                                    })
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
                                    {canEdit && (
                                        <button
                                            onClick={this.handleWordWrapToggle}
                                            style={{
                                                padding: '4px 8px',
                                                background: wordWrap ? '#4d97ff' : colors.buttonBg,
                                                color: wordWrap ? 'white' : colors.text,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                fontWeight: wordWrap ? 'bold' : 'normal'
                                            }}
                                        >
                                            {wordWrap ? '自动换行' : '禁用换行'}
                                        </button>
                                    )}
                                    {/* Monaco 编辑器切换按钮 */}
                                    {canEdit && (
                                        <button
                                            onClick={this.toggleMonacoEditor}
                                            style={{
                                                padding: '4px 8px',
                                                background: this.state.useMonacoEditor ? '#4d97ff' : colors.buttonBg,
                                                color: this.state.useMonacoEditor ? 'white' : colors.text,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                fontWeight: this.state.useMonacoEditor ? 'bold' : 'normal'
                                            }}
                                            title={this.state.useMonacoEditor ? '切换到旧版编辑器' : '切换到新版编辑器'}
                                        >
                                            {this.state.useMonacoEditor ? '旧版编辑器' : '新版编辑器'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {isSvg ? (
                                viewMode === 'code' ? (
                                    this.state.useMonacoEditor ? (
                                        // Monaco 编辑器 iframe
                                        <iframe
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

                    {/* 按钮 */}
                    <div style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: `1px solid ${colors.border}`,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        flexShrink: 0,
                        flexWrap: 'wrap'
                    }}>
                        <Button onClick={this.handleRefresh}>
                            刷新
                        </Button>
                        <Button 
                            onClick={this.applyChanges}
                            disabled={!canApply}
                        >
                            {canApply ? '应用到作品' : '不可应用'}
                        </Button>
                        <Button onClick={this.downloadProject}>
                            下载项目
                        </Button>
                        <Button onClick={this.handleClose}>
                            关闭
                        </Button>
                    </div>
                </div>
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
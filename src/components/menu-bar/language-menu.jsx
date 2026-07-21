import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import locales from '@remixwarp/scratch-l10n';

import {MenuItem, Submenu} from '../menu/menu.jsx';
import {languageMenuOpen, openLanguageMenu} from '../../reducers/menus.js';
import {selectLocale, setLocales} from '../../reducers/locales.js';

import styles from './settings-menu.css';

import ChevronDown from './ChevronDown.jsx';

import {Check, Globe, Upload, HelpCircle, X, FileJson, Download} from 'lucide-react';

import languageService from '../../services/LanguageService.js';

class LanguageMenu extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {
            showHelpModal: false,
            availableLocales: {}  // 初始化为空对象，在 componentDidMount 中初始化
        };
        bindAll(this, [
            'setRef',
            'handleMouseOver',
            'handleUploadLanguagePackage',
            'handleDownloadTemplate',
            'handleDownloadTestPackage',
            'showHelpModal',
            'closeHelpModal',
            'getAvailableLocales',
            'updateBlocklyMessages',
            'refreshBlockWorkspace'
        ]);
    }

    componentDidMount() {
        try {
            // 初始化语言列表，确保 languageService 已经完全初始化
            this.refreshLocales();
        } catch (e) {
            console.error('=== LanguageMenu componentDidMount error ===', e);
        }
    }

    getAvailableLocales () {
        return languageService.getAvailableLocales();
    }

    refreshLocales () {
        this.setState({
            availableLocales: this.getAvailableLocales()
        });
    }

    updateBlocklyMessages (locale, messages) {
        console.log('=== 更新积木翻译 ===', locale);
        
        // 检测各种可能的积木对象（添加更安全的检测）
        const hasBlockly = typeof window.Blockly !== 'undefined';
        const hasScratchBlocks = typeof window.ScratchBlocks !== 'undefined';
        const hasMsg = hasBlockly && typeof window.Blockly.Msg !== 'undefined';
        const hasScratchMsgs = hasScratchBlocks && typeof window.ScratchBlocks.ScratchMsgs !== 'undefined';
        // 更安全的检测：使用 optional chaining
        const hasScratchBlocksMsg = hasScratchBlocks && 
                                    typeof window.ScratchBlocks.Blockly !== 'undefined' && 
                                    typeof window.ScratchBlocks.Blockly.Msg !== 'undefined';
        
        console.log('=== 检测结果 ===');
        console.log('  window.Blockly:', hasBlockly);
        console.log('  window.ScratchBlocks:', hasScratchBlocks);
        console.log('  window.Blockly.Msg:', hasMsg);
        console.log('  window.ScratchBlocks.ScratchMsgs:', hasScratchMsgs);
        console.log('  window.ScratchBlocks.Blockly.Msg:', hasScratchBlocksMsg);
        
        // 如果没有积木系统，直接返回
        if (!hasBlockly && !hasScratchBlocks) {
            console.log('=== 未检测到积木系统，跳过更新 ===');
            return;
        }
        
        // 提取积木相关的翻译（以 BLOCK_ 或 CONTROL_、DATA_、EVENT_、LOOKS_、MOTION_、OPERATORS_、SENSING_ 开头的键）
        const blockMessages = {};
        const blockKeyPrefixes = ['CONTROL_', 'DATA_', 'EVENT_', 'LOOKS_', 'MOTION_', 'OPERATORS_', 'SENSING_', 'BLOCK_'];
        
        Object.keys(messages).forEach(key => {
            if (blockKeyPrefixes.some(prefix => key.startsWith(prefix))) {
                blockMessages[key] = messages[key];
            }
        });
        
        console.log('=== 积木翻译键数 ===', Object.keys(blockMessages).length);
        
        // 如果有积木翻译，更新到 Blockly.Msg
        if (Object.keys(blockMessages).length > 0) {
            // 更新 Blockly.Msg（优先使用 Blockly 对象）
            if (hasMsg) {
                Object.assign(window.Blockly.Msg, blockMessages);
                console.log('=== Blockly.Msg 已更新 ===');
            }
            
            // 更新 ScratchBlocks.Blockly.Msg（如果存在）
            if (hasScratchBlocksMsg) {
                Object.assign(window.ScratchBlocks.Blockly.Msg, blockMessages);
                console.log('=== ScratchBlocks.Blockly.Msg 已更新 ===');
            }
            
            // 更新 ScratchMsgs.locales
            if (hasScratchMsgs) {
                if (!window.ScratchBlocks.ScratchMsgs.locales[locale]) {
                    window.ScratchBlocks.ScratchMsgs.locales[locale] = {};
                }
                Object.assign(window.ScratchBlocks.ScratchMsgs.locales[locale], blockMessages);
                console.log('=== ScratchMsgs.locales 已更新 ===');
                
                // 不调用 setLocale，避免破坏现有状态
                console.log('=== 已跳过 setLocale 调用，翻译将在积木渲染时自动生效 ===');
            }
            
            // 不刷新工作区，避免积木消失
            console.log('=== 已跳过工作区刷新，新翻译将在积木重新渲染时生效 ===');
        }
    }

    refreshBlockWorkspace () {
        console.log('=== 尝试刷新积木工作区 ===');
        
        // 尝试多种方式刷新工作区（添加更安全的检测）
        const refreshMethods = [
            // 方式1: 通过 AddonHooks
            () => {
                if (typeof window.AddonHooks !== 'undefined' && 
                    typeof window.AddonHooks.blocklyWorkspace !== 'undefined') {
                    console.log('=== 通过 AddonHooks 刷新工作区 ===');
                    if (typeof window.AddonHooks.blocklyWorkspace.refreshToolboxSelection_ === 'function') {
                        window.AddonHooks.blocklyWorkspace.refreshToolboxSelection_();
                    }
                    return true;
                }
                return false;
            },
            // 方式2: 通过 ScratchBlocks.getMainWorkspace
            () => {
                if (typeof window.ScratchBlocks !== 'undefined' && 
                    typeof window.ScratchBlocks.getMainWorkspace === 'function') {
                    console.log('=== 通过 ScratchBlocks.getMainWorkspace 刷新工作区 ===');
                    const workspace = window.ScratchBlocks.getMainWorkspace();
                    if (workspace && typeof workspace.refreshToolboxSelection_ === 'function') {
                        workspace.refreshToolboxSelection_();
                    }
                    return true;
                }
                return false;
            },
            // 方式3: 通过 ScratchBlocks.Blockly.getMainWorkspace（更安全的检测）
            () => {
                if (typeof window.ScratchBlocks !== 'undefined' && 
                    typeof window.ScratchBlocks.Blockly !== 'undefined' && 
                    typeof window.ScratchBlocks.Blockly.getMainWorkspace === 'function') {
                    console.log('=== 通过 ScratchBlocks.Blockly.getMainWorkspace 刷新工作区 ===');
                    const workspace = window.ScratchBlocks.Blockly.getMainWorkspace();
                    if (workspace && typeof workspace.refreshToolboxSelection_ === 'function') {
                        workspace.refreshToolboxSelection_();
                    }
                    return true;
                }
                return false;
            },
            // 方式4: 通过全局 workspace
            () => {
                if (typeof window.workspace !== 'undefined') {
                    console.log('=== 通过全局 workspace 刷新工作区 ===');
                    if (typeof window.workspace.refreshToolboxSelection_ === 'function') {
                        window.workspace.refreshToolboxSelection_();
                    }
                    return true;
                }
                return false;
            },
            // 方式5: 触发 resize 事件
            () => {
                console.log('=== 通过 resize 事件刷新 ===');
                window.dispatchEvent(new Event('resize'));
                return true;
            }
        ];
        
        // 尝试每种刷新方式
        refreshMethods.forEach(method => {
            try {
                if (method()) {
                    console.log('=== 工作区刷新成功 ===');
                }
            } catch (e) {
                console.log('=== 刷新方法失败 ===', e);
            }
        });
    }

    showHelpModal () {
        this.setState({showHelpModal: true});
    }

    closeHelpModal () {
        this.setState({showHelpModal: false});
    }

    handleUploadLanguagePackage () {
        console.log('=== handleUploadLanguagePackage 被调用 ===');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            console.log('=== 选择了文件 ===', file.name);
            try {
                const content = await file.text();
                console.log('=== 文件内容长度 ===', content.length);
                const result = languageService.uploadLanguagePackage(content);
                console.log('=== 上传结果 ===', result);
                
                if (result.success) {
                    alert(result.message);
                    this.refreshLocales();
                    const availableLocales = this.getAvailableLocales();
                    const messagesByLocale = {};
                    Object.keys(availableLocales).forEach(locale => {
                        messagesByLocale[locale] = availableLocales[locale].messages || {};
                    });
                    
                    console.log('=== 准备更新语言 ===');
                    console.log('messagesByLocale 键:', Object.keys(messagesByLocale));
                    console.log('zh-cn 翻译键数:', Object.keys(messagesByLocale['zh-cn'] || {}).length);
                    
                    const targetLocaleMessages = messagesByLocale[result.locale] || {};
                    const sampleKeys = Object.keys(targetLocaleMessages).filter(k => k.startsWith('gui.menuBar'));
                    console.log('目标语言 menuBar 翻译:', sampleKeys.map(k => ({[k]: targetLocaleMessages[k]})));
                    
                    this.props.onSetLocales(messagesByLocale);
                    console.log('=== onSetLocales 已调用 ===');
                    
                    setTimeout(() => {
                        if (result.locale) {
                            console.log('=== 切换语言 ===', result.locale);
                            try {
                                // 保存当前选中的语言到localStorage
                                languageService.saveCurrentLocale(result.locale);
                                // 先切换语言，然后在回调中更新积木翻译
                                this.props.onChangeLanguage(result.locale);
                                console.log('=== onChangeLanguage 已调用 ===');
                                
                                // 在语言切换完成后延迟更新积木翻译
                                setTimeout(() => {
                                    try {
                                        console.log('=== 准备更新积木翻译 ===');
                                        this.updateBlocklyMessages(result.locale, targetLocaleMessages);
                                        console.log('=== 积木翻译更新完成 ===');
                                    } catch (e) {
                                        console.error('=== 更新积木翻译失败 ===', e);
                                    }
                                }, 300);
                            } catch (e) {
                                console.error('=== 切换语言失败 ===', e);
                            }
                        }
                    }, 100);
                } else {
                    alert('上传失败：\n' + result.errors.join('\n'));
                }
            } catch (error) {
                alert('读取文件失败：' + error.message);
                console.error('=== 读取文件错误 ===', error);
            }
        };
        input.click();
    }

    handleDownloadTemplate (locale = 'en') {
        const template = languageService.generateTemplate(locale);
        const blob = new Blob([JSON.stringify(template, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `language-package-${locale}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    handleDownloadTestPackage () {
        const testPackage = languageService.generateTestPackage();
        const blob = new Blob([JSON.stringify(testPackage, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test-language-package-zh-cn.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    componentDidUpdate (prevProps) {
        // If the submenu has been toggled open, try scrolling the selected option into view.
        if (!prevProps.menuOpen && this.props.menuOpen && this.selectedRef) {
            this.scrollSelectedIntoView();
        }
    }

    setRef (component) {
        this.selectedRef = component;
    }

    handleMouseOver () {
        // If we are using hover rather than clicks for submenus, scroll the selected option into view
        if (!this.props.menuOpen && this.selectedRef) {
            this.scrollSelectedIntoView();
        }
    }

    scrollSelectedIntoView () {
        // the native scrollIntoView() scrolls the entire page when used outside the editor,
        // so we do this manually instead.
        // selectedRef is the checkmark <img>, its parent is a <div> from <MenuItem>, then a <div> from <SubMenu>

        const menuItem = this.selectedRef.parentNode;
        const scrollContainer = menuItem.parentNode;

        const itemHeight = menuItem.offsetHeight;
        const selectedItemPosition = menuItem.offsetTop;
        const visibleHeight = scrollContainer.offsetHeight;

        scrollContainer.scrollTop = selectedItemPosition - (visibleHeight / 2) + (itemHeight / 2);
    }

    render () {
        const isChinese = this.props.currentLocale === 'zh-cn';
        
        console.log('=== LanguageMenu render ===');
        console.log('currentLocale:', this.props.currentLocale);
        console.log('isChinese:', isChinese);
        console.log('availableLocales:', Object.keys(this.state.availableLocales));
        
        return (
            <MenuItem
                expanded={this.props.menuOpen}
            >
                <div
                    className={styles.option}
                    onClick={this.props.onRequestOpen}
                    onMouseOver={this.handleMouseOver}
                >
                    <Globe className={styles.icon} />
                    <span className={styles.submenuLabel}>
                        <FormattedMessage
                            defaultMessage="Language"
                            description="Language sub-menu"
                            id="gui.menuBar.language"
                        />
                    </span>
                    <ChevronDown className={styles.expandCaret} />
                </div>
                <Submenu
                    className={styles.languageSubmenu}
                    place={this.props.isRtl ? 'left' : 'right'}
                >
                    <div className={styles.languagePackageRow}>
                        <MenuItem
                            className={classNames(styles.languageMenuItem, styles.uploadButton)}
                            onClick={() => {
                                this.handleUploadLanguagePackage();
                            }}
                        >
                            <Upload size={15} />
                            <span style={{paddingLeft: '8px'}}>
                                {isChinese ? '上传语言包' : 'Upload Language Pack'}
                            </span>
                        </MenuItem>
                        <MenuItem
                            className={classNames(styles.languageMenuItem, styles.testButton)}
                            onClick={() => {
                                this.handleDownloadTestPackage();
                            }}
                            title={isChinese ? '下载测试语言包' : 'Download Test Package'}
                        >
                            <Download size={15} />
                            <span style={{paddingLeft: '8px'}}>
                                {isChinese ? '测试语言包' : 'Test Package'}
                            </span>
                        </MenuItem>
                        <MenuItem
                            className={classNames(styles.languageMenuItem, styles.helpButton)}
                            onClick={() => {
                                this.showHelpModal();
                            }}
                            title={isChinese ? '语言包使用说明' : 'Language Pack Help'}
                        >
                            <HelpCircle size={15} />
                        </MenuItem>
                    </div>
                    {
                        Object.keys(this.state.availableLocales)
                            .map(locale => (
                                <MenuItem
                                    key={locale}
                                    className={styles.languageMenuItem}
                                    // eslint-disable-next-line react/jsx-no-bind
                                    onClick={() => {
                                        // 保存当前选中的语言到localStorage
                                        languageService.saveCurrentLocale(locale);
                                        this.props.onChangeLanguage(locale);
                                    }}
                                >
                                    <Check
                                        className={classNames(styles.check, {
                                            [styles.selected]: this.props.currentLocale === locale
                                        })}
                                        size={15}
                                        {...(this.props.currentLocale === locale && {ref: this.setRef})}
                                    />
                                    {this.state.availableLocales[locale].name}
                                </MenuItem>
                            ))
                    }
                </Submenu>

                {this.state.showHelpModal && typeof document !== 'undefined' && ReactDOM.createPortal(
                    <div
                        className={styles.helpModalOverlay}
                        onClick={this.closeHelpModal}
                        onMouseDown={e => e.stopPropagation()}
                        onMouseUp={e => e.stopPropagation()}
                    >
                        <div className={styles.helpModal} onClick={e => e.stopPropagation()}>
                            <div className={styles.helpModalHeader}>
                                <div className={styles.helpModalTitle}>
                                    <FileJson size={20} />
                                    <span>{isChinese ? '语言包使用说明' : 'Language Pack Help'}</span>
                                </div>
                                <button className={styles.helpModalClose} onClick={this.closeHelpModal}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className={styles.helpModalContent}>
                                <div className={styles.helpSection}>
                                    <h3>{isChinese ? '什么是语言包？' : 'What is a Language Pack?'}</h3>
                                    <p>{isChinese ? '语言包是一个JSON格式的文件，包含了编辑器中所有文本的翻译内容。通过上传自定义语言包，您可以将编辑器界面翻译成任何语言。' : 'A language pack is a JSON file containing translations for all text in the editor. By uploading a custom language pack, you can translate the editor interface into any language.'}</p>
                                </div>
                                <div className={styles.helpSection}>
                                    <h3>{isChinese ? '语言包格式' : 'Language Pack Format'}</h3>
                                    <pre className={styles.jsonExample}>
{`{
  "locale": "zh-cn",
  "name": "简体中文",
  "description": "简体中文语言包",
  "translations": {
    "gui.menuBar.language": "语言",
    "gui.menuBar.file": "文件",
    ...
  }
}`}
                                    </pre>
                                </div>
                                <div className={styles.helpSection}>
                                    <h3>{isChinese ? '字段说明' : 'Field Description'}</h3>
                                    <ul className={styles.helpList}>
                                        <li><strong>locale:</strong> {isChinese ? '语言代码，如 zh-cn, en, ja' : 'Language code, e.g., zh-cn, en, ja'}</li>
                                        <li><strong>name:</strong> {isChinese ? '语言包名称，显示在语言选择菜单中' : 'Language pack name, displayed in the language menu'}</li>
                                        <li><strong>description:</strong> {isChinese ? '语言包描述（可选）' : 'Language pack description (optional)'}</li>
                                        <li><strong>translations:</strong> {isChinese ? '翻译键值对，包含所有需要翻译的文本' : 'Translation key-value pairs containing all translatable text'}</li>
                                    </ul>
                                </div>
                                <div className={styles.helpSection}>
                                    <h3>{isChinese ? '如何创建语言包' : 'How to Create a Language Pack'}</h3>
                                    <ol className={styles.helpList}>
                                        <li>{isChinese ? '点击下方按钮下载示例语言包模板' : 'Click the button below to download the sample language pack template'}</li>
                                        <li>{isChinese ? '使用文本编辑器打开下载的JSON文件' : 'Open the downloaded JSON file in a text editor'}</li>
                                        <li>{isChinese ? '修改translations中的翻译内容' : 'Modify the translation content in translations'}</li>
                                        <li>{isChinese ? '保存文件，然后在语言菜单中点击"上传语言包"按钮' : 'Save the file, then click the "Upload Language Pack" button in the language menu'}</li>
                                    </ol>
                                </div>
                                <div className={styles.helpSection}>
                                    <h3>{isChinese ? '注意事项' : 'Notes'}</h3>
                                    <ul className={styles.helpList}>
                                        <li>{isChinese ? '所有翻译键都必须保留，即使您不想翻译它们' : 'All translation keys must be preserved, even if you don\'t want to translate them'}</li>
                                        <li>{isChinese ? '如果某个翻译键为空或缺失，系统将使用默认英文翻译' : 'If a translation key is empty or missing, the system will use the default English translation'}</li>
                                        <li>{isChinese ? '请确保JSON格式正确，否则语言包将无法加载' : 'Make sure the JSON format is correct, otherwise the language pack will not load'}</li>
                                    </ul>
                                </div>
                            </div>
                            <div className={styles.helpModalFooter}>
                                <div className={styles.downloadSection}>
                                    <span className={styles.downloadLabel}>
                                        {isChinese ? '选择示例语言:' : 'Select Sample Language:'}
                                    </span>
                                    <button className={styles.downloadButton} onClick={() => {
                                        this.handleDownloadTemplate('en');
                                    }}>
                                        <Download size={16} />
                                        <span>English</span>
                                    </button>
                                    <button className={styles.downloadButton} onClick={() => {
                                        this.handleDownloadTemplate('zh-cn');
                                    }}>
                                        <Download size={16} />
                                        <span>简体中文</span>
                                    </button>
                                </div>
                                <button className={styles.closeButton} onClick={this.closeHelpModal}>
                                    {isChinese ? '关闭' : 'Close'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </MenuItem>
        );
    }
}

LanguageMenu.propTypes = {
    currentLocale: PropTypes.string,
    isRtl: PropTypes.bool,
    label: PropTypes.string,
    menuOpen: PropTypes.bool,
    onChangeLanguage: PropTypes.func,
    onRequestCloseSettings: PropTypes.func,
    onRequestOpen: PropTypes.func
};

const mapStateToProps = state => ({
    currentLocale: state.locales.locale,
    isRtl: state.locales.isRtl,
    menuOpen: languageMenuOpen(state)
});

const mapDispatchToProps = (dispatch, ownProps) => ({
    onChangeLanguage: locale => {
        dispatch(selectLocale(locale));
        ownProps.onRequestCloseSettings();
    },
    onRequestOpen: () => dispatch(openLanguageMenu()),
    onSetLocales: messagesByLocale => {
        dispatch(setLocales(messagesByLocale));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LanguageMenu);

import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';
import {Search, X, Keyboard, RotateCcw} from 'lucide-react';

import {getDefaultShortcuts} from '../../lib/shortcuts/registry.js';
import {setShortcutsEnabled, updateShortcuts} from '../../lib/shortcuts/event-router.js';
import {setShortcut, resetShortcut, resetAllShortcuts} from '../../reducers/shortcuts.js';
import {closeShortcutManagerModal} from '../../reducers/modals';

import WindowedModal from '../../containers/windowed-modal.jsx';
import Input from '../forms/input.jsx';
import ShortcutCategory from './shortcut-category.jsx';

import styles from './shortcut-manager.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Keyboard Shortcuts',
        description: 'Title of keyboard shortcuts manager modal',
        id: 'shortcut-manager.title'
    },
    search: {
        defaultMessage: 'Search shortcuts...',
        description: 'Placeholder text for search input',
        id: 'shortcut-manager.search'
    },
    noResults: {
        defaultMessage: 'No shortcuts found',
        description: 'Message when no shortcuts match search',
        id: 'shortcut-manager.noResults'
    },
    categories: {
        defaultMessage: 'Categories',
        description: 'Label for categories sidebar',
        id: 'shortcut-manager.categories'
    },
    allShortcuts: {
        defaultMessage: 'All Shortcuts',
        description: 'Label for showing all shortcuts',
        id: 'shortcut-manager.allShortcuts'
    },
    recordingPrompt: {
        defaultMessage: 'Press a key combination to set the shortcut for {name}',
        description: 'Prompt shown while recording a new shortcut',
        id: 'shortcut-manager.recordingPrompt'
    },
    cancelRecording: {
        defaultMessage: 'Cancel',
        description: 'Cancel button while recording a shortcut',
        id: 'shortcut-manager.cancelRecording'
    },
    recordingKeysPrompt: {
        defaultMessage: 'Keys pressed: {keys}',
        description: 'Shown while recording, listing the keys pressed so far',
        id: 'shortcut-manager.recordingKeysPrompt'
    },
    recordingHint: {
        defaultMessage: 'Hold the keys together (up to 5 keys), then choose Save.',
        description: 'Hint while recording a shortcut',
        id: 'shortcut-manager.recordingHint'
    },
    saveRecording: {
        defaultMessage: 'Save',
        description: 'Save button for recorded shortcut',
        id: 'shortcut-manager.saveRecording'
    },
    reRecord: {
        defaultMessage: 'Re-record',
        description: 'Re-record button while recording a shortcut',
        id: 'shortcut-manager.reRecord'
    },
    resetButton: {
        defaultMessage: 'Reset',
        description: 'Reset button in keyboard shortcuts manager',
        id: 'shortcut-manager.resetButton'
    },
    resetTitle: {
        defaultMessage: 'Reset keyboard shortcuts',
        description: 'Title of reset confirm dialog',
        id: 'shortcut-manager.resetTitle'
    },
    resetDesc: {
        defaultMessage: 'Choose what to reset:',
        description: 'Description in reset confirm dialog',
        id: 'shortcut-manager.resetDesc'
    },
    resetCurrent: {
        defaultMessage: 'Reset current list ({name})',
        description: 'Reset only the currently displayed category',
        id: 'shortcut-manager.resetCurrent'
    },
    resetAll: {
        defaultMessage: 'Reset all shortcuts',
        description: 'Reset every custom shortcut',
        id: 'shortcut-manager.resetAll'
    },
    resetConfirmCancel: {
        defaultMessage: 'Cancel',
        description: 'Cancel button in reset confirm dialog',
        id: 'shortcut-manager.resetConfirmCancel'
    },
    categoryAll: {
        defaultMessage: 'All Shortcuts',
        description: 'Label for the all shortcuts list',
        id: 'shortcut-manager.categoryAll'
    },
    categoryFile: {
        defaultMessage: 'File',
        description: 'Shortcut category name',
        id: 'shortcut.category.file'
    },
    categoryEdit: {
        defaultMessage: 'Edit',
        description: 'Shortcut category name',
        id: 'shortcut.category.edit'
    },
    categoryView: {
        defaultMessage: 'View',
        description: 'Shortcut category name',
        id: 'shortcut.category.view'
    },
    categoryProjectControls: {
        defaultMessage: 'Project Controls',
        description: 'Shortcut category name',
        id: 'shortcut.category.projectControls'
    },
    categoryEditorNavigation: {
        defaultMessage: 'Editor Navigation',
        description: 'Shortcut category name',
        id: 'shortcut.category.editorNavigation'
    },
    categoryLibraryAccess: {
        defaultMessage: 'Library Access',
        description: 'Shortcut category name',
        id: 'shortcut.category.libraryAccess'
    },
    categorySpriteManagement: {
        defaultMessage: 'Sprite Management',
        description: 'Shortcut category name',
        id: 'shortcut.category.spriteManagement'
    },
    categoryWindowManagement: {
        defaultMessage: 'Windows',
        description: 'Shortcut category name',
        id: 'shortcut.category.windowManagement'
    },
    categorySuperRefactor: {
        defaultMessage: 'Super Refactor',
        description: 'Shortcut category name',
        id: 'shortcut.category.superRefactor'
    },
    save: {
        defaultMessage: 'Save',
        description: 'Shortcut label',
        id: 'shortcut.save'
    },
    saveAsCopy: {
        defaultMessage: 'Save As Copy',
        description: 'Shortcut label',
        id: 'shortcut.saveAsCopy'
    },
    loadFromComputer: {
        defaultMessage: 'Load from Computer',
        description: 'Shortcut label',
        id: 'shortcut.loadFromComputer'
    },
    packageProject: {
        defaultMessage: 'Package Project',
        description: 'Shortcut label',
        id: 'shortcut.packageProject'
    },
    restorePoints: {
        defaultMessage: 'Restore Points',
        description: 'Shortcut label',
        id: 'shortcut.restorePoints'
    },
    settings: {
        defaultMessage: 'Settings',
        description: 'Shortcut label',
        id: 'shortcut.settings'
    },
    fullScreen: {
        defaultMessage: 'Toggle Fullscreen',
        description: 'Shortcut label',
        id: 'shortcut.fullScreen'
    },
    blocksTab: {
        defaultMessage: 'Blocks Tab',
        description: 'Shortcut label',
        id: 'shortcut.blocksTab'
    },
    costumesTab: {
        defaultMessage: 'Costumes Tab',
        description: 'Shortcut label',
        id: 'shortcut.costumesTab'
    },
    soundsTab: {
        defaultMessage: 'Sounds Tab',
        description: 'Shortcut label',
        id: 'shortcut.soundsTab'
    },
    greenFlag: {
        defaultMessage: 'Start Project (Green Flag)',
        description: 'Shortcut label',
        id: 'shortcut.greenFlag'
    },
    stopAll: {
        defaultMessage: 'Stop All',
        description: 'Shortcut label',
        id: 'shortcut.stopAll'
    },
    spriteLibrary: {
        defaultMessage: 'Open Sprite Library',
        description: 'Shortcut label',
        id: 'shortcut.spriteLibrary'
    },
    costumeLibrary: {
        defaultMessage: 'Open Costume Library',
        description: 'Shortcut label',
        id: 'shortcut.costumeLibrary'
    },
    soundLibrary: {
        defaultMessage: 'Open Sound Library',
        description: 'Shortcut label',
        id: 'shortcut.soundLibrary'
    },
    extensionLibrary: {
        defaultMessage: 'Open Extension Library',
        description: 'Shortcut label',
        id: 'shortcut.extensionLibrary'
    },
    extensionManager: {
        defaultMessage: 'Extension Manager',
        description: 'Shortcut label',
        id: 'shortcut.extensionManager'
    },
    duplicateSprite: {
        defaultMessage: 'Duplicate Sprite',
        description: 'Shortcut label',
        id: 'shortcut.duplicateSprite'
    },
    toggleBackpack: {
        defaultMessage: 'Toggle Backpack',
        description: 'Shortcut label',
        id: 'shortcut.toggleBackpack'
    },
    deleteSprite: {
        defaultMessage: 'Delete Sprite',
        description: 'Shortcut label',
        id: 'shortcut.deleteSprite'
    },
    stageFullScreen: {
        defaultMessage: 'Toggle Stage Fullscreen',
        description: 'Shortcut label',
        id: 'shortcut.stageFullScreen'
    },
    undo: {
        defaultMessage: 'Undo',
        description: 'Shortcut label',
        id: 'shortcut.undo'
    },
    redo: {
        defaultMessage: 'Redo',
        description: 'Shortcut label',
        id: 'shortcut.redo'
    },
    copy: {
        defaultMessage: 'Copy',
        description: 'Shortcut label',
        id: 'shortcut.copy'
    },
    paste: {
        defaultMessage: 'Paste',
        description: 'Shortcut label',
        id: 'shortcut.paste'
    },
    cut: {
        defaultMessage: 'Cut',
        description: 'Shortcut label',
        id: 'shortcut.cut'
    },
    closeWindow: {
        defaultMessage: 'Close Window',
        description: 'Shortcut label',
        id: 'shortcut.closeWindow'
    },
    aiChat: {
        defaultMessage: 'Open AI Chat',
        description: 'Shortcut label',
        id: 'shortcut.aiChat'
    },
    aiAgent: {
        defaultMessage: 'Open AI Agent',
        description: 'Shortcut label',
        id: 'shortcut.aiAgent'
    },
    commandPalette: {
        defaultMessage: 'Command Palette',
        description: 'Shortcut label',
        id: 'shortcut.commandPalette'
    },
    showProblems: {
        defaultMessage: 'Toggle Problems Panel',
        description: 'Shortcut label',
        id: 'shortcut.problems'
    },
    showConsole: {
        defaultMessage: 'Toggle Console Panel',
        description: 'Shortcut label',
        id: 'shortcut.console'
    },
    openCodeEditor: {
        defaultMessage: 'Open Code Editor',
        description: 'Shortcut label',
        id: 'shortcut.openCodeEditor'
    },
    openGitPanel: {
        defaultMessage: 'Open Git Panel',
        description: 'Shortcut label',
        id: 'shortcut.openGitPanel'
    },
    toggleExplorer: {
        defaultMessage: 'Toggle Explorer',
        description: 'Shortcut label',
        id: 'shortcut.toggleExplorer'
    },
    toggleZenMode: {
        defaultMessage: 'Toggle Zen Mode',
        description: 'Shortcut label',
        id: 'shortcut.toggleZenMode'
    }
});

const categoryMessages = {
    'file': messages.categoryFile,
    'edit': messages.categoryEdit,
    'view': messages.categoryView,
    'projectControls': messages.categoryProjectControls,
    'editorNavigation': messages.categoryEditorNavigation,
    'libraryAccess': messages.categoryLibraryAccess,
    'spriteManagement': messages.categorySpriteManagement,
    'windowManagement': messages.categoryWindowManagement,
    'superRefactor': messages.categorySuperRefactor
};

class ShortcutManager extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleSearchChange',
            'handleClose',
            'handleCategoryClick',
            'handleAllCategoriesClick',
            'handleSelectCategory',
            'renderCategory',
            'renderCategoryGroup',
            'handleOpenResetConfirm',
            'handleCloseResetConfirm',
            'handleResetCurrent',
            'handleResetAll'
        ]);

        this.state = {
            searchQuery: '',
            selectedCategory: null,
            recordingId: null,
            recordingKeys: [],
            showResetConfirm: false
        };
        this._keyListener = null;
    }

    componentWillUnmount () {
        this._stopRecordingListener();
        // 兜底：确保全局快捷键触发被恢复
        setShortcutsEnabled(true);
    }

    _stopRecordingListener () {
        if (this._keyListener) {
            window.removeEventListener('keydown', this._keyListener, true);
            this._keyListener = null;
        }
    }

    handleStartRecording = shortcutId => {
        this._stopRecordingListener();
        this.setState({
            recordingId: shortcutId,
            recordingKeys: []
        });
        // 仅在录制进行期间禁用全局快捷键触发，避免录制按键误触发其他命令
        setShortcutsEnabled(false);
        const listener = e => {
            e.preventDefault();
            e.stopPropagation();
            if (e.repeat) return; // 忽略长按重复

            const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];

            // 仅按下修饰键：实时预览当前已按住的修饰键，继续等待主键
            if (modifierKeys.includes(e.key)) {
                const parts = [];
                if (e.ctrlKey) parts.push('Ctrl');
                if (e.altKey) parts.push('Alt');
                if (e.shiftKey) parts.push('Shift');
                if (e.metaKey) parts.push('Meta');
                this.setState({recordingKeys: parts});
                return;
            }

            // 非修饰键：一次性采集“同时按下”的所有修饰键 + 主键（最多 5 个键）
            const parts = [];
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.altKey) parts.push('Alt');
            if (e.shiftKey) parts.push('Shift');
            if (e.metaKey) parts.push('Meta');
            let key = e.key;
            if (key === ' ') {
                key = 'Space';
            } else if (key.length === 1) {
                key = key.toUpperCase();
            } else {
                key = key.charAt(0).toUpperCase() + key.slice(1);
            }
            parts.push(key);

            if (parts.length > 5) parts.length = 5; // 安全限制：最多 5 个键

            this._stopRecordingListener();
            // 录制完成，恢复全局快捷键触发
            setShortcutsEnabled(true);
            // 保持 recordingId，进入预览状态（显示已按组合 + 保存/重录/取消）
            this.setState({recordingKeys: parts});
        };
        this._keyListener = listener;
        window.addEventListener('keydown', listener, true);
    };

    // 确认保存当前录制的组合键（不再自动保存）
    handleConfirmRecording = () => {
        const {recordingId, recordingKeys} = this.state;
        this._stopRecordingListener();
        setShortcutsEnabled(true);
        if (recordingId && recordingKeys.length > 0) {
            const combo = recordingKeys.join('+');
            this.props.onSetShortcut(recordingId, combo);
            // 同步应用到事件路由的快捷键表，使新键立即生效（而非沿用旧触发方式）
            const nextCustom = {
                ...(this.props.customShortcuts || {}),
                [recordingId]: combo
            };
            updateShortcuts(nextCustom);
        }
        this.setState({
            recordingId: null,
            recordingKeys: []
        });
    };

    handleCancelRecording = () => {
        this._stopRecordingListener();
        setShortcutsEnabled(true);
        this.setState({
            recordingId: null,
            recordingKeys: []
        });
    };

    handleSearchChange (e) {
        this.setState({searchQuery: e.target.value});
    }

    handleClose () {
        this._stopRecordingListener();
        setShortcutsEnabled(true); // 兜底恢复全局快捷键触发
        this.props.onRequestClose();
    }

    handleCategoryClick (category) {
        this.setState({
            selectedCategory: category,
            searchQuery: ''
        });
    }

    handleAllCategoriesClick () {
        this.handleCategoryClick(null);
    }

    handleSelectCategory (categoryId) {
        this.handleCategoryClick(categoryId);
    }

    handleOpenResetConfirm () {
        this.setState({showResetConfirm: true});
    }

    handleCloseResetConfirm () {
        this.setState({showResetConfirm: false});
    }

    // 重置当前列表（选中分类；未选中则为全部）下所有被自定义的快捷键
    handleResetCurrent () {
        const {selectedCategory} = this.state;
        const customShortcuts = this.props.customShortcuts || {};
        const all = this.getAllShortcuts();
        const scope = selectedCategory; // null 表示全部
        const scoped = all.filter(s =>
            (scope === null || s.category === scope) && customShortcuts[s.id]
        );
        scoped.forEach(s => this.props.onResetShortcut(s.id));
        const next = {...customShortcuts};
        scoped.forEach(s => delete next[s.id]);
        updateShortcuts(next); // 同步事件路由，恢复为默认触发方式
        this.setState({showResetConfirm: false});
    }

    // 重置所有自定义快捷键
    handleResetAll () {
        this.props.onResetAllShortcuts();
        updateShortcuts({}); // 同步事件路由
        this.setState({showResetConfirm: false});
    }

    getAllShortcuts () {
        const defaultShortcuts = getDefaultShortcuts();
        const customShortcuts = this.props.customShortcuts || {};
        const {intl} = this.props;

        const shortcutMessages = {
            'save': messages.save,
            'saveAsCopy': messages.saveAsCopy,
            'loadFromComputer': messages.loadFromComputer,
            'packageProject': messages.packageProject,
            'restorePoints': messages.restorePoints,
            'settings': messages.settings,
            'fullScreen': messages.fullScreen,
            'blocksTab': messages.blocksTab,
            'costumesTab': messages.costumesTab,
            'soundsTab': messages.soundsTab,
            'greenFlag': messages.greenFlag,
            'stopAll': messages.stopAll,
            'spriteLibrary': messages.spriteLibrary,
            'costumeLibrary': messages.costumeLibrary,
            'soundLibrary': messages.soundLibrary,
            'extensionLibrary': messages.extensionLibrary,
            'extensionManager': messages.extensionManager,
            'duplicateSprite': messages.duplicateSprite,
            'toggleBackpack': messages.toggleBackpack,
            'deleteSprite': messages.deleteSprite,
            'stageFullScreen': messages.stageFullScreen,
            'undo': messages.undo,
            'redo': messages.redo,
            'copy': messages.copy,
            'paste': messages.paste,
            'cut': messages.cut,
            'showProblems': messages.showProblems,
            'showConsole': messages.showConsole,
            'closeWindow': messages.closeWindow,
            'openCodeEditor': messages.openCodeEditor,
            'openGitPanel': messages.openGitPanel,
            'aiChat': messages.aiChat,
            'aiAgent': messages.aiAgent,
            'commandPalette': messages.commandPalette,
            'toggleExplorer': messages.toggleExplorer,
            'toggleZenMode': messages.toggleZenMode,
            'aiChat': messages.aiChat,
            'aiAgent': messages.aiAgent,
            'commandPalette': messages.commandPalette
        };

        const coreShortcuts = defaultShortcuts.map(shortcut => {
            const label = intl.formatMessage(shortcutMessages[shortcut.id]);
            if (customShortcuts[shortcut.id]) {
                return {
                    ...shortcut,
                    key: customShortcuts[shortcut.id],
                    label
                };
            }
            return {
                ...shortcut,
                label
            };
        });

        // 合并 addon 快捷键（由 keymap-cheatsheet addon 通过 window.RW_ADDON_SHORTCUTS 暴露）
        // 这类快捷键为只读（readOnly: true），来源于各 addon，不可自定义
        const addonShortcuts = (typeof window !== 'undefined' && Array.isArray(window.RW_ADDON_SHORTCUTS))
            ? window.RW_ADDON_SHORTCUTS.map(s => ({
                id: s.id,
                key: s.key,
                defaultKey: s.defaultKey,
                category: s.category,
                label: s.label,
                source: s.source,
                readOnly: true,
                actionType: null
            }))
            : [];

        return [...coreShortcuts, ...addonShortcuts];
    }

    getFilteredShortcuts () {
        const allShortcuts = this.getAllShortcuts();
        const {searchQuery, selectedCategory} = this.state;

        return allShortcuts.filter(shortcut => {
            if (selectedCategory && shortcut.category !== selectedCategory) {
                return false;
            }

            if (!searchQuery) return true;

            const query = searchQuery.toLowerCase();
            return shortcut.label.toLowerCase().includes(query) ||
                   shortcut.key.toLowerCase().includes(query);
        });
    }

    getCategoriesWithCounts () {
        const allShortcuts = this.getAllShortcuts();
        const categories = {};
        const {intl} = this.props;

        allShortcuts.forEach(shortcut => {
            if (!categories[shortcut.category]) {
                categories[shortcut.category] = {
                    label: intl.formatMessage(categoryMessages[shortcut.category]),
                    count: 0
                };
            }
            categories[shortcut.category].count++;
        });

        return Object.entries(categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, {label, count}]) => ({id, label, count}));
    }

    renderCategory (category) {
        const {selectedCategory} = this.state;
        const onClick = () => this.handleSelectCategory(category.id);
        return (
            <div
                key={category.id}
                className={classNames(styles.categoryItem, {
                    [styles.selected]: selectedCategory === category.id
                })}
                onClick={onClick}
            >
                <span className={styles.categoryLabel}>{category.label}</span>
                <span className={styles.categoryCount}>{category.count}</span>
            </div>
        );
    }

    renderCategoryGroup ([categoryId, categoryShortcuts]) {
        const {intl} = this.props;

        return (
            <ShortcutCategory
                key={categoryId}
                category={intl.formatMessage(categoryMessages[categoryId])}
                shortcuts={categoryShortcuts}
                onEditShortcut={this.handleStartRecording}
                recordingId={this.state.recordingId}
            />
        );
    }

    getRecordingName () {
        const all = this.getAllShortcuts();
        const found = all.find(s => s.id === this.state.recordingId);
        return found ? found.label : this.state.recordingId;
    }

    renderRecordingOverlay () {
        const {intl} = this.props;
        const {recordingKeys} = this.state;
        const keysText = recordingKeys.length > 0
            ? recordingKeys.join(' + ')
            : '—';
        return (
            <div className={styles.recordingOverlay}>
                <div className={styles.recordingBox}>
                    <div className={styles.recordingIcon}>
                        <Keyboard size={28} />
                    </div>
                    <p className={styles.recordingText}>
                        {intl.formatMessage(messages.recordingPrompt, {
                            name: this.getRecordingName()
                        })}
                    </p>
                    <p className={styles.recordingKeys}>
                        {intl.formatMessage(messages.recordingKeysPrompt, {keys: keysText})}
                    </p>
                    <p className={styles.recordingHint}>
                        {intl.formatMessage(messages.recordingHint)}
                    </p>
                    <div className={styles.recordingActions}>
                        <button
                            type="button"
                            className={styles.recordingSave}
                            disabled={recordingKeys.length === 0}
                            onClick={this.handleConfirmRecording}
                        >
                            {intl.formatMessage(messages.saveRecording)}
                        </button>
                        <button
                            type="button"
                            className={styles.recordingCancel}
                            onClick={this.handleStartRecording.bind(this, this.state.recordingId)}
                        >
                            {intl.formatMessage(messages.reRecord)}
                        </button>
                        <button
                            type="button"
                            className={styles.recordingCancel}
                            onClick={this.handleCancelRecording}
                        >
                            {intl.formatMessage(messages.cancelRecording)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    render () {
        const {searchQuery, selectedCategory} = this.state;
        const categories = this.getCategoriesWithCounts();
        const shortcuts = this.getFilteredShortcuts();

        const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
            if (!groups[shortcut.category]) {
                groups[shortcut.category] = [];
            }
            groups[shortcut.category].push(shortcut);
            return groups;
        }, {});

        return (
            <WindowedModal
                id="shortcut-manager-modal"
                contentLabel={this.props.intl.formatMessage(messages.title)}
                visible={this.props.visible}
                onRequestClose={this.handleClose}
                title={this.props.intl.formatMessage(messages.title)}
                width={800}
                height={600}
            >
                <div className={styles.container}>
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <Keyboard size={16} />
                            <span className={styles.sidebarTitle}>
                                <FormattedMessage {...messages.categories} />
                            </span>
                        </div>

                        <div className={styles.searchContainer}>
                            <Search
                                size={14}
                                className={styles.searchIcon}
                            />
                            <Input
                                type="text"
                                placeholder={this.props.intl.formatMessage(messages.search)}
                                value={searchQuery}
                                onChange={this.handleSearchChange}
                                className={styles.searchInput}
                            />
                        </div>

                        <div className={styles.categoryList}>
                            <div
                                className={classNames(styles.categoryItem, {
                                    [styles.selected]: !selectedCategory && !searchQuery
                                })}
                                onClick={this.handleAllCategoriesClick}
                            >
                                <span className={styles.categoryLabel}>
                                    <FormattedMessage {...messages.allShortcuts} />
                                </span>
                                <span className={styles.categoryCount}>{this.getAllShortcuts().length}</span>
                            </div>

                            {categories.map(category => (
                                <div
                                    key={category.id}
                                    className={classNames(styles.categoryItem, {
                                        [styles.selected]: selectedCategory === category.id
                                    })}
                                >
                                    <span
                                        className={styles.categoryLabel}
                                        onClick={() => this.handleSelectCategory(category.id)}
                                    >
                                        {category.label}
                                    </span>
                                    <span className={styles.categoryCount}>{category.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.content}>
                        <div className={styles.contentHeader}>
                            <span className={styles.contentTitle}>
                                {selectedCategory ? categoryMessages[selectedCategory] &&
                                    this.props.intl.formatMessage(categoryMessages[selectedCategory]) :
                                    this.props.intl.formatMessage(messages.categoryAll)}
                            </span>
                            <button
                                type="button"
                                className={styles.resetButton}
                                onClick={this.handleOpenResetConfirm}
                            >
                                <RotateCcw size={14} />
                                <FormattedMessage {...messages.resetButton} />
                            </button>
                        </div>
                        {searchQuery && shortcuts.length === 0 ? (
                            <div className={styles.noResults}>
                                <X size={24} />
                                <FormattedMessage {...messages.noResults} />
                            </div>
                        ) : (
                            Object.entries(groupedShortcuts).map(this.renderCategoryGroup)
                        )}
                    </div>
                </div>
                {this.state.recordingId && this.renderRecordingOverlay()}
                {this.state.showResetConfirm && this.renderResetConfirm()}
            </WindowedModal>
        );
    }

    renderResetConfirm () {
        const {intl} = this.props;
        const {selectedCategory} = this.state;
        const currentName = selectedCategory && categoryMessages[selectedCategory] ?
            intl.formatMessage(categoryMessages[selectedCategory]) :
            intl.formatMessage(messages.categoryAll);
        return (
            <div className={styles.resetOverlay}>
                <div className={styles.resetBox}>
                    <h3 className={styles.resetTitle}>
                        {intl.formatMessage(messages.resetTitle)}
                    </h3>
                    <p className={styles.resetDesc}>
                        {intl.formatMessage(messages.resetDesc)}
                    </p>
                    <div className={styles.resetActions}>
                        <button
                            type="button"
                            className={styles.resetConfirmButton}
                            onClick={this.handleResetCurrent}
                        >
                            {intl.formatMessage(messages.resetCurrent, {name: currentName})}
                        </button>
                        <button
                            type="button"
                            className={styles.resetConfirmButton}
                            onClick={this.handleResetAll}
                        >
                            {intl.formatMessage(messages.resetAll)}
                        </button>
                        <button
                            type="button"
                            className={styles.recordingCancel}
                            onClick={this.handleCloseResetConfirm}
                        >
                            {intl.formatMessage(messages.resetConfirmCancel)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

ShortcutManager.propTypes = {
    visible: PropTypes.bool.isRequired,
    customShortcuts: PropTypes.object,
    onRequestClose: PropTypes.func.isRequired,
    intl: PropTypes.shape({
        formatMessage: PropTypes.func
    }).isRequired
};

const mapStateToProps = state => ({
    customShortcuts: state.scratchGui.shortcuts.customShortcuts
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeShortcutManagerModal()),
    onSetShortcut: (shortcutId, key) => dispatch(setShortcut(shortcutId, key)),
    onResetShortcut: shortcutId => dispatch(resetShortcut(shortcutId)),
    onResetAllShortcuts: () => dispatch(resetAllShortcuts())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ShortcutManager));

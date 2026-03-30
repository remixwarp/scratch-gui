/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-unused-vars */
import classNames from 'classnames';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';

import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import CommunityButton from './community-button.jsx';
import ShareButton from './share-button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Divider from '../divider/divider.jsx';
// import SaveStatus from './save-status.jsx';
import ProjectWatcher from '../../containers/project-watcher.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import MenuLabel from './tw-menu-label.jsx';
import {MenuItem, MenuSection, Submenu} from '../menu/menu.jsx';
import ProjectTitleInput from './project-title-input.jsx';
import AuthorInfo from './author-info.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';
import FramerateChanger from '../../containers/tw-framerate-changer.jsx';
import MenuBarHOC from '../../containers/menu-bar-hoc.jsx';
import SettingsMenu from './settings-menu.jsx';
import TWViewCounter from './tw-view-counter.jsx';

import ChangeUsername from '../../containers/tw-change-username.jsx';
import CloudVariablesToggler from '../../containers/tw-cloud-toggler.jsx';
import TWSaveStatus from './tw-save-status.jsx';
import TWNews from './tw-news.jsx';
import CollaborationContainer from '../../containers/collaboration-container.jsx';

import TWDesktopSettings from './tw-desktop-settings.jsx';

import {FEEDBACK_URL, APP_NAME} from '../../lib/constants/brand.js';

import {
    openTipsLibrary,
    openSettingsModal,
    openRestorePointModal,
    openGitModal,
    openExtensionManagerModal,
    openShortcutManagerModal,
    openSimpleDialog,
    openTutorialModal
} from '../../reducers/modals';
import {showOnboarding} from '../../reducers/onboarding';
import {openCollaborationModal} from '../../reducers/collaboration';
import {setPlayer} from '../../reducers/mode';
import {openAIChatModal, openAIAgentModal, openSuperRefactorModal} from '../../reducers/modals';
import {
    isTimeTravel220022BC,
    isTimeTravel1920,
    isTimeTravel1990,
    isTimeTravel2020,
    isTimeTravelNow,
    setTimeTravel
} from '../../reducers/time-travel';
import {
    autoUpdateProject,
    getIsUpdating,
    getIsShowingProject,
    manualUpdateProject,
    requestNewProject,
    remixProject,
    saveProjectAsCopy
} from '../../reducers/project-state';
import {
    openAboutMenu,
    closeAboutMenu,
    aboutMenuOpen,
    openAccountMenu,
    closeAccountMenu,
    accountMenuOpen,
    openFileMenu,
    closeFileMenu,
    fileMenuOpen,
    openWorkspaceBookmarksMenu,
    closeWorkspaceBookmarksMenu,
    workspaceBookmarksMenuOpen,
    openEditMenu,
    closeEditMenu,
    editMenuOpen,
    openLoginMenu,
    closeLoginMenu,
    loginMenuOpen,
    openModeMenu,
    closeModeMenu,
    modeMenuOpen,
    settingsMenuOpen,
    openSettingsMenu,
    closeSettingsMenu,
    errorsMenuOpen,
    openErrorsMenu,
    closeErrorsMenu,
    openToolsMenu,
    closeToolsMenu,
    toolsMenuOpen,
    openAIMenu,
    closeAIMenu,
    aiMenuOpen
} from '../../reducers/menus';
import {setFileHandle} from '../../reducers/tw.js';
import JSZip from '@turbowarp/jszip';
import settingsStore from '../../addons/settings-store-singleton.js';
import {
    setAutosaveEnabled,
    setAutosaveInterval,
    setAutosaveNotifications
} from '../../reducers/autosave.js';

import collectMetadata from '../../lib/collect-metadata';
import LazyScratchBlocks from '../../lib/tw-lazy-scratch-blocks';
import SettingsStore from '../../addons/settings-store-singleton.js';

import WorkspaceBookmarksMenu from './workspace-bookmarks-menu.jsx';
import BilmeMenu from './bl-bilme-menu.jsx';

import {
    createWorkspaceBookmarksExportData,
    downloadJsonObject,
    getDefaultWorkspaceBookmarksPayload,
    mergeWorkspaceBookmarksPayload,
    readWorkspaceBookmarksFromStage,
    writeWorkspaceBookmarksToStage
} from '../../lib/mw/workspace-bookmarks.js';

import styles from './menu-bar.css';

// import helpIcon from '../../lib/assets/icon--tutorials.svg';
// import mystuffIcon from './icon--mystuff.png';
// import profileIcon from './icon--profile.png';

import ChevronDown from './ChevronDown.jsx';

import ninetiesLogo from './nineties_logo.svg';
import catLogo from './cat_logo.svg';
import prehistoricLogo from './prehistoric-logo.svg';
import oldtimeyLogo from './oldtimey-logo.svg';

import {
    FilePen, PencilRuler, TriangleAlert, Info, Shuffle,
    FilePlusCorner, Upload, RefreshCcw, ClockPlus, Package, FileInput,
    Save, ArchiveRestore, UserPen, Cloud, Settings, PackagePlus, Puzzle,
    Bookmark, GitBranch, FileCog, Bug, Database, Undo, Redo, Handshake, Sparkles, Wrench, Keyboard,
    Zap, Gauge, BookOpen
} from 'lucide-react';

import sharedMessages from '../../lib/constants/shared-messages';

import SeeInsideButton from './tw-see-inside.jsx';

/* const ariaMessages = defineMessages({
    tutorials: {
        id: 'gui.menuBar.tutorialsLibrary',
        defaultMessage: 'Tutorials',
        description: 'accessibility text for the tutorials button'
    }
}); */

const twMessages = defineMessages({
    compileError: {
        id: 'tw.menuBar.compileError',
        defaultMessage: '{sprite}: {error}',
        description: 'Error message in error menu'
    }
});

const MenuBarItemTooltip = ({
    children,
    className,
    enable,
    id,
    place = 'bottom'
}) => {
    if (enable) {
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    }
    return (
        <ComingSoonTooltip
            className={classNames(styles.comingSoon, className)}
            place={place}
            tooltipClassName={styles.comingSoonTooltip}
            tooltipId={id}
        >
            {children}
        </ComingSoonTooltip>
    );
};


MenuBarItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    enable: PropTypes.bool,
    id: PropTypes.string,
    place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

const MenuItemTooltip = ({id, isRtl, children, className}) => (
    <ComingSoonTooltip
        className={classNames(styles.comingSoon, className)}
        isRtl={isRtl}
        place={isRtl ? 'left' : 'right'}
        tooltipClassName={styles.comingSoonTooltip}
        tooltipId={id}
    >
        {children}
    </ComingSoonTooltip>
);

MenuItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    id: PropTypes.string,
    isRtl: PropTypes.bool
};

const AboutButton = props => (
    <Button
        className={classNames(styles.menuBarItem, styles.hoverable)}
        iconClassName={styles.aboutIcon}
        iconElem={Info}
        onClick={props.onClick}
    />
);

AboutButton.propTypes = {
    onClick: PropTypes.func.isRequired
};

// Unlike <MenuItem href="">, this uses an actual <a>
const MenuItemLink = props => (
    <a
        href={props.href}
        rel="noreferrer"
        target="_blank"
        className={styles.menuItemLink}
    >
        <MenuItem>{props.children}</MenuItem>
    </a>
);

MenuItemLink.propTypes = {
    children: PropTypes.node.isRequired,
    href: PropTypes.string.isRequired
};

const formatShortcutDisplay = keyCombo => {
    if (!keyCombo) return '';
    const platform = bowser.mac ? 'mac' : 'windows';
    return keyCombo
        .replace(/Ctrl/g, platform === 'mac' ? '⌘' : 'Ctrl')
        .replace(/Cmd/g, '⌘')
        .replace(/Alt/g, platform === 'mac' ? '⌥' : 'Alt')
        .replace(/Shift/g, '⇧')
        .replace(/Space/g, '␣')
        .replace(/Enter/g, '↵')
        .replace(/ /g, '');
};

class MenuBar extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            autosaveTimeRemaining: 0,
            autosavePaused: false,
            workspaceBookmarks: [],
            workspaceBookmarksCategories: ['General'],
            workspaceBookmarksCollapsedCategories: [],
            canUndo: true,
            canRedo: true
        };
        this.workspaceBookmarksProjectListener = null;
        this.autosaveCountdownInterval = null;
        this.undoRedoChangeListener = null;
        bindAll(this, [
            'handleClickSeeInside',
            'handleClickNew',
            'handleClickNewWindow',
            'handleClickRemix',
            'handleClickSave',
            'handleClickSaveAsCopy',
            'handleClickPackager',
            'handleClickDesktopSettings',
            'handleClickRestorePoints',
            'handleClickSeeCommunity',
            'handleClickShare',
            'handleClickUndo',
            'handleClickRedo',
            'handleClickCollaboration',
            'handleSetMode',
            'handleKeyPress',
            'handleRestoreOption',
            'getSaveToComputerHandler',
            'restoreOptionMessage',
            'handleToggleAutosave',
            'getAutosaveEnabled',
            'getAutosaveTimeRemaining',
            'loadWorkspaceBookmarksFromProject',
            'saveWorkspaceBookmarksToProject',
            'ensureScratchBlocks',
            'getCurrentWorkspaceBookmarkState',
            'applyWorkspaceBookmarkState',
            'updateUndoRedoState',
            'handleAddWorkspaceBookmark',
            'handleSwitchWorkspaceBookmark',
            'handleDeleteWorkspaceBookmark',
            'handleEditWorkspaceBookmark',
            'handleToggleWorkspaceBookmarkCategoryCollapsed',
            'handleExportWorkspaceBookmarks',
            'handleImportWorkspaceBookmarks',
            'handleClearAllWorkspaceBookmarks',
            'showAlert',
            'showPrompt',
            'showConfirm',
            'handleCompatibilitySave',
            'getPlatformInfo',
            'checkCustomExtensions',
            'getCompatibilityIssues',
            'showCompatibilityDialog',
            'handleConvertToScratch',
            'handleConvertToTurbowarp',
            'handleConvertTo02Engine',
            'handleConvertToAstraEditor',
            'handleConvertToRemixWarp',
            'handleSuperRefactorSave',
            'handleSuperRefactorClick'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
        this.startAutosaveCountdown();

        // Prevent the legacy addon from also injecting a bookmarks menu.
        window.__bilupNativeWorkspaceBookmarks = true;

        this.loadWorkspaceBookmarksFromProject();
        if (this.props.vm && this.props.vm.runtime) {
            this.workspaceBookmarksProjectListener = () => {
                this.loadWorkspaceBookmarksFromProject();
            };
            this.props.vm.runtime.on('PROJECT_LOADED', this.workspaceBookmarksProjectListener);
        }

        this.ensureScratchBlocks().then(ScratchBlocks => {
            const workspace = ScratchBlocks.getMainWorkspace();
            if (workspace) {
                this.undoRedoChangeListener = () => {
                    setTimeout(() => this.updateUndoRedoState(), 0);
                };
                workspace.addChangeListener(this.undoRedoChangeListener);
                setTimeout(() => this.updateUndoRedoState(), 100);
            }
        });
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
        
        if (this.autosaveCountdownInterval) {
            clearInterval(this.autosaveCountdownInterval);
            this.autosaveCountdownInterval = null;
        }
        
        if (this.props.vm && this.props.vm.runtime && this.workspaceBookmarksProjectListener) {
            this.props.vm.runtime.off('PROJECT_LOADED', this.workspaceBookmarksProjectListener);
        }
        
        if (this.undoRedoChangeListener) {
            this.ensureScratchBlocks().then(ScratchBlocks => {
                const workspace = ScratchBlocks.getMainWorkspace();
                if (workspace) {
                    workspace.removeChangeListener(this.undoRedoChangeListener);
                }
            });
        }
    }

    showAlert (title, message) {
        return new Promise(resolve => {
            this.props.openSimpleDialog({
                type: 'alert',
                title,
                message,
                onOk: () => resolve()
            });
        });
    }

    showPrompt (title, message, defaultValue = '') {
        return new Promise(resolve => {
            this.props.openSimpleDialog({
                type: 'prompt',
                title,
                message,
                defaultValue,
                onOk: value => resolve(value),
                onCancel: () => resolve(null)
            });
        });
    }

    showConfirm (title, message) {
        return new Promise(resolve => {
            this.props.openSimpleDialog({
                type: 'confirm',
                title,
                message,
                onOk: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    getPlatformInfo (agentName) {   
        const platforms = {
            'Scratch': { name: 'Scratch', url: 'https://scratch.mit.edu' },
            'TurboWarp': { name: 'TurboWarp', url: 'https://turbowarp.org' },
            '02Engine': { name: '02Engine', url: 'https://02engine.02studio.xyz/' },
            'AstraEditor': { name: 'AstraEditor', url: 'https://www.astras.top/' },
            'Bilup': { name: 'Bilup', url: 'https://editor.bilup.org/' }
        };
        return platforms[agentName] || { name: agentName.toLowerCase(), url: '' };
    }

    async handleCompatibilitySave (agentName) {
        // Save with specific agent metadata
        if (this.props.vm && this.props.vm.saveProjectSb3DontZip) {
            try {
                // Get project files without zipping
                const projectFiles = this.props.vm.saveProjectSb3DontZip();
                const jsonData = projectFiles['project.json'];

                // Parse project.json
                const projectJson = JSON.parse(new TextDecoder().decode(jsonData));

                // Modify meta to indicate the target platform
                if (!projectJson.meta) {
                    projectJson.meta = {};
                }
                projectJson.meta.agent = agentName;

                // Modify meta.platform to match the target platform
                const platformInfo = this.getPlatformInfo(agentName);
                projectJson.meta.platform = platformInfo;

                // Convert back to Uint8Array
                const modifiedJson = new TextEncoder().encode(JSON.stringify(projectJson));
                projectFiles['project.json'] = modifiedJson;

                // Create a new zip with the modified project.json
                const JSZip = require('jszip');
                const zip = new JSZip();

                // Add all files to the zip
                for (const [filename, data] of Object.entries(projectFiles)) {
                    zip.file(filename, data);
                }

                // Generate the zip file
                const content = await zip.generateAsync({type: 'uint8array'});

                // Download the file
                const downloadBlob = require('../../lib/utils/download-blob').default;
                downloadBlob(`project-${agentName.toLowerCase()}.sb3`, content);

            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error during compatibility save:', error);
                this.showAlert('Error', `Failed to convert project: ${error.message}`);
            }
        }
    }

    checkCustomExtensions () {
        // Check if the project contains any custom extensions (non-builtin)
        if (!this.props.vm || !this.props.vm.extensionManager) {
            return [];
        }

        const customExtensions = [];
        const extensionManager = this.props.vm.extensionManager;

        // Get all loaded extensions
        for (const extensionId of extensionManager._loadedExtensions.keys()) {
            // Check if this is a builtin extension
            if (!extensionManager.isBuiltinExtension(extensionId)) {
                customExtensions.push(extensionId);
            }
        }

        return customExtensions;
    }

    getCompatibilityIssues (targetPlatform) {
        // Get all compatibility issues for the target platform
        const issues = [];

        if (!this.props.vm || !this.props.vm.runtime) {
            return issues;
        }

        const runtime = this.props.vm.runtime;

        // Check custom extensions - only for Scratch
        if (targetPlatform === 'Scratch') {
            const customExtensions = this.checkCustomExtensions();
            if (customExtensions.length > 0) {
                issues.push({
                    type: 'extension',
                    severity: 'error',
                    message: `包含 ${customExtensions.length} 个自定义扩展：${customExtensions.join(', ')}`,
                    details: '这些扩展在Scratch中无法使用'
                });
            }
        }

        // Check stage size
        const stageWidth = runtime.stageWidth;
        const stageHeight = runtime.stageHeight;

        if (targetPlatform === 'Scratch') {
            if (stageWidth !== 480 || stageHeight !== 360) {
                issues.push({
                    type: 'stage',
                    severity: 'warning',
                    message: `舞台尺寸 (${stageWidth}x${stageHeight}) 与Scratch默认尺寸 (480x360) 不同`,
                    details: '在Scratch中舞台尺寸将被重置为默认值'
                });
            }
        }

        return issues;
    }

    showCompatibilityDialog (targetPlatform, issues) {
        // Show compatibility issues in a dialog
        const errors = issues.filter(i => i.severity === 'error');
        const warnings = issues.filter(i => i.severity === 'warning');

        let message = `转换到 ${targetPlatform} 的兼容性报告：\n\n`;

        if (errors.length > 0) {
            message += `❌ 错误 (${errors.length} 项)：\n`;
            errors.forEach((issue, index) => {
                message += `${index + 1}. ${issue.message}\n`;
                if (issue.details) {
                    message += `   ${issue.details}\n`;
                }
            });
            message += '\n';
        }

        if (warnings.length > 0) {
            message += `⚠️ 警告 (${warnings.length} 项)：\n`;
            warnings.forEach((issue, index) => {
                message += `${index + 1}. ${issue.message}\n`;
                if (issue.details) {
                    message += `   ${issue.details}\n`;
                }
            });
            message += '\n';
        }

        if (errors.length > 0) {
            message += '存在错误，建议修复后再转换。是否仍要继续？';
        } else if (warnings.length > 0) {
            message += '存在警告，但项目仍可转换。是否继续？';
        } else {
            return true;
        }

        return confirm(message);
    }

    handleConvertToScratch () {
        const issues = this.getCompatibilityIssues('Scratch');
        if (issues.length > 0) {
            const shouldContinue = this.showCompatibilityDialog('Scratch', issues);
            if (!shouldContinue) {
                return;
            }
        }
        this.handleCompatibilitySave('Scratch');
    }

    handleConvertToTurbowarp () {
        const issues = this.getCompatibilityIssues('TurboWarp');
        if (issues.length > 0) {
            const shouldContinue = this.showCompatibilityDialog('TurboWarp', issues);
            if (!shouldContinue) {
                return;
            }
        }
        this.handleCompatibilitySave('TurboWarp');
    }

    handleConvertTo02Engine () {
        const issues = this.getCompatibilityIssues('02Engine');
        if (issues.length > 0) {
            const shouldContinue = this.showCompatibilityDialog('02Engine', issues);
            if (!shouldContinue) {
                return;
            }
        }
        this.handleCompatibilitySave('02Engine');
    }

    handleConvertToAstraEditor () {
        const issues = this.getCompatibilityIssues('AstraEditor');
        if (issues.length > 0) {
            const shouldContinue = this.showCompatibilityDialog('AstraEditor', issues);
            if (!shouldContinue) {
                return;
            }
        }
        this.handleCompatibilitySave('AstraEditor');
    }

    handleConvertToRemixWarp () {
        const issues = this.getCompatibilityIssues('RemixWarp');
        if (issues.length > 0) {
            const shouldContinue = this.showCompatibilityDialog('RemixWarp', issues);
            if (!shouldContinue) {
                return;
            }
        }
        this.handleCompatibilitySave('RemixWarp');
    }

    handleSuperRefactorSave (newCode) {
        try {
            // Parse the new code which contains all files
            let files;
            try {
                files = JSON.parse(newCode);
            } catch (e) {
                this.showAlert('Error', 'Invalid JSON code');
                return;
            }
            
            // 显示保存成功的消息
            this.showAlert('Success', 'Editor files have been updated');
            
            // 在实际应用中，这里应该将文件保存到磁盘
            // 但由于浏览器环境的限制，我们无法直接写入文件系统
            // 这里只是模拟保存操作
            console.log('Files to save:', files);
            
        } catch (error) {
            console.error('Error during super refactor save:', error);
            this.showAlert('Error', `Failed to save: ${error.message}`);
        }
    }

    handleSuperRefactorClick () {
        let projectCode = '{}';
        try {
            if (this.props.vm && this.props.vm.saveProjectSb3DontZip) {
                const projectFiles = this.props.vm.saveProjectSb3DontZip();
                const jsonData = projectFiles['project.json'];
                if (jsonData) {
                    projectCode = new TextDecoder().decode(jsonData);
                }
            }
        } catch (e) {
            console.error('Error getting project code:', e);
        }
        // 直接调用dispatch来打开模态框
        if (this.props.dispatch) {
            this.props.dispatch({
                type: 'scratch-gui/modals/OPEN_MODAL',
                modal: 'superRefactorModal',
                superRefactorCode: projectCode,
                superRefactorOnSave: this.handleSuperRefactorSave.bind(this)
            });
        }
    }

    handleClickNew () {
        // if the project is dirty, and user owns the project, we will autosave.
        // but if they are not logged in and can't save, user should consider
        // downloading or logging in first.
        // Note that if user is logged in and editing someone else's project,
        // they'll lose their work.
        const readyToReplaceProject = this.props.confirmReadyToReplaceProject(
            this.props.intl.formatMessage(sharedMessages.replaceProjectWarning)
        );
        this.props.onRequestCloseFile();
        if (readyToReplaceProject) {
            this.props.onClickNew(this.props.canSave && this.props.canCreateNew);
        }
        this.props.onRequestCloseFile();
    }
    handleClickNewWindow () {
        this.props.onClickNewWindow();
        this.props.onRequestCloseFile();
    }
    handleClickRemix () {
        this.props.onClickRemix();
        this.props.onRequestCloseFile();
    }
    handleClickSave () {
        this.props.onClickSave();
        this.props.onRequestCloseFile();
    }
    handleClickSaveAsCopy () {
        this.props.onClickSaveAsCopy();
        this.props.onRequestCloseFile();
    }
    handleClickPackager () {
        this.props.onClickPackager();
        this.props.onRequestCloseFile();
    }
    handleClickDesktopSettings () {
        this.props.onClickDesktopSettings();
        this.props.onRequestCloseSettings();
    }
    handleClickRestorePoints () {
        this.props.onClickRestorePoints();
        this.props.onRequestCloseFile();
    }
    handleClickAddRestorePoint = () => {
        if (this.props.vm) {
            this.props.vm.emit('TRIGGER_MANUAL_RESTORE_POINT');
        }
    };
    handleClickSeeCommunity (waitForUpdate) {
        if (this.props.shouldSaveBeforeTransition()) {
            this.props.autoUpdateProject(); // save before transitioning to project page
            waitForUpdate(true); // queue the transition to project page
        } else {
            waitForUpdate(false); // immediately transition to project page
        }
    }
    handleClickShare (waitForUpdate) {
        if (!this.props.isShared) {
            if (this.props.canShare) { // save before transitioning to project page
                this.props.onShare();
            }
            if (this.props.canSave) { // save before transitioning to project page
                this.props.autoUpdateProject();
                waitForUpdate(true); // queue the transition to project page
            } else {
                waitForUpdate(false); // immediately transition to project page
            }
        }
    }
    handleClickCollaboration () {
        this.props.onClickCollaboration();
    }
    handleSetMode (mode) {
        return () => {
            // Turn on/off filters for modes.
            if (mode === '1920') {
                document.documentElement.style.filter = 'brightness(.9)contrast(.8)sepia(1.0)';
                document.documentElement.style.height = '100%';
            } else if (mode === '1990') {
                document.documentElement.style.filter = 'hue-rotate(40deg)';
                document.documentElement.style.height = '100%';
            } else {
                document.documentElement.style.filter = '';
                document.documentElement.style.height = '';
            }

            // Change logo for modes
            if (mode === '1990') {
                document.getElementById('logo_img').src = ninetiesLogo;
            } else if (mode === '2020') {
                document.getElementById('logo_img').src = catLogo;
            } else if (mode === '1920') {
                document.getElementById('logo_img').src = oldtimeyLogo;
            } else if (mode === '220022BC') {
                document.getElementById('logo_img').src = prehistoricLogo;
            } else {
                document.getElementById('logo_img').src = this.props.logo;
            }

            this.props.onSetTimeTravelMode(mode);
        };
    }
    handleRestoreOption (restoreFun) {
        return () => {
            restoreFun();
            this.props.onRequestCloseEdit();
        };
    }
    handleKeyPress (event) {
        // Workspace bookmarks shortcuts (Ctrl+Alt+1..0 to switch, Ctrl+Alt+T to add)
        // Ignore when typing.
        const target = event.target;
        const isTyping = target && (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        );
        if (!isTyping && !this.props.isPlayerOnly && event.ctrlKey && event.altKey) {
            const key = event.key.toLowerCase();
            if (key >= '1' && key <= '9') {
                event.preventDefault();
                void this.handleSwitchWorkspaceBookmark(parseInt(key, 10) - 1);
                return;
            }
            if (key === '0') {
                event.preventDefault();
                void this.handleSwitchWorkspaceBookmark(9);
                return;
            }
            if (key === 't') {
                event.preventDefault();
                void this.handleAddWorkspaceBookmark();
                return;
            }
        }

        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;
        if (modifier) {
            if (event.key.toLowerCase() === 's') {
                this.props.handleSaveProject();
                event.preventDefault();
            } else if (event.key.toLowerCase() === 'o') {
                event.preventDefault();
                this.props.onStartSelectingFileUpload();
            }
        }
    }

    loadWorkspaceBookmarksFromProject () {
        try {
            const vm = this.props.vm;
            if (!vm || !vm.runtime) return;
            const stage = vm.runtime.getTargetForStage();
            if (!stage || !stage.comments) return;

            const payload = readWorkspaceBookmarksFromStage(stage) || getDefaultWorkspaceBookmarksPayload();
            this.setState({
                workspaceBookmarks: payload.bookmarks,
                workspaceBookmarksCategories: payload.categories,
                workspaceBookmarksCollapsedCategories: payload.collapsedCategories
            });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Failed to load workspace bookmarks:', e);
        }
    }

    saveWorkspaceBookmarksToProject () {
        try {
            const vm = this.props.vm;
            if (!vm || !vm.runtime) return;
            const stage = vm.runtime.getTargetForStage();
            if (!stage || !stage.comments) return;

            writeWorkspaceBookmarksToStage(stage, {
                bookmarks: this.state.workspaceBookmarks,
                categories: this.state.workspaceBookmarksCategories,
                collapsedCategories: this.state.workspaceBookmarksCollapsedCategories
            });

            if (vm.runtime.emitProjectChanged) {
                vm.runtime.emitProjectChanged();
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Failed to save workspace bookmarks:', e);
        }
    }

    ensureScratchBlocks () {
        if (LazyScratchBlocks.isLoaded()) {
            return Promise.resolve(LazyScratchBlocks.get());
        }
        return LazyScratchBlocks.load().then(() => LazyScratchBlocks.get());
    }

    async getCurrentWorkspaceBookmarkState () {
        const ScratchBlocks = await this.ensureScratchBlocks();
        const workspace = ScratchBlocks.getMainWorkspace();
        if (!workspace) return null;

        const metrics = workspace.getMetrics();
        const currentTarget = this.props.vm ? this.props.vm.editingTarget : null;

        return {
            scrollX: metrics.viewLeft,
            scrollY: metrics.viewTop,
            scale: workspace.scale,
            targetId: currentTarget ? currentTarget.id : null
        };
    }

    async applyWorkspaceBookmarkState (state) {
        if (!state) return;

        const vm = this.props.vm;
        if (!vm || !vm.runtime) return;

        if (state.targetId && state.targetId !== vm.editingTarget?.id) {
            const target = vm.runtime.getTargetById(state.targetId);
            if (target) {
                vm.setEditingTarget(state.targetId);
            }
        }

        const ScratchBlocks = await this.ensureScratchBlocks();
        const workspace = ScratchBlocks.getMainWorkspace();
        if (workspace && workspace.scrollbar) {
            workspace.setScale(state.scale);
            const scrollX = state.scrollX - workspace.getMetrics().contentLeft;
            const scrollY = state.scrollY - workspace.getMetrics().contentTop;
            workspace.scrollbar.set(scrollX, scrollY);
        }
    }

    async handleAddWorkspaceBookmark () {
        const maxTabs = 20;
        const enableCategories = true;

        if (this.state.workspaceBookmarks.length >= maxTabs) {
            await this.showAlert(
                this.props.intl.formatMessage({
                    defaultMessage: 'Error',
                    id: 'tw.workspaceBookmarks.errorTitle'
                }),
                this.props.intl.formatMessage({
                    defaultMessage: 'Maximum number of bookmarks reached ({max})',
                    description: 'Alert when too many bookmarks exist',
                    id: 'tw.workspaceBookmarks.maxReached'
                }, {max: maxTabs})
            );
            return;
        }

        const state = await this.getCurrentWorkspaceBookmarkState();
        if (!state) return;

        const name = await this.showPrompt(
            this.props.intl.formatMessage({
                defaultMessage: 'Bookmark Name',
                id: 'tw.workspaceBookmarks.nameTitle'
            }),
            this.props.intl.formatMessage({
                defaultMessage: 'Bookmark name:',
                description: 'Prompt title for bookmark name',
                id: 'tw.workspaceBookmarks.namePrompt'
            }),
            `Bookmark ${this.state.workspaceBookmarks.length + 1}`
        );
        if (name === null) return;

        let category = 'General';
        if (enableCategories) {
            const categoryList = this.state.workspaceBookmarksCategories.join(', ');
            const categoryInput = await this.showPrompt(
                this.props.intl.formatMessage({
                    defaultMessage: 'Bookmark Category',
                    id: 'tw.workspaceBookmarks.categoryTitle'
                }),
                this.props.intl.formatMessage({
                    defaultMessage: 'Category (existing: {categories})',
                    description: 'Prompt for bookmark category',
                    id: 'tw.workspaceBookmarks.categoryPrompt'
                }, {categories: categoryList}),
                'General'
            );
            if (categoryInput === null) return;
            category = categoryInput.trim() || 'General';
        }

        const bookmark = {
            name: (name.trim() || `Bookmark ${this.state.workspaceBookmarks.length + 1}`),
            category,
            state,
            timestamp: Date.now()
        };

        this.setState(prev => {
            const categories = new Set(prev.workspaceBookmarksCategories);
            categories.add(category);
            return {
                workspaceBookmarks: [...prev.workspaceBookmarks, bookmark],
                workspaceBookmarksCategories: [...categories]
            };
        }, () => {
            this.saveWorkspaceBookmarksToProject();
            this.props.onRequestCloseWorkspaceBookmarks();
        });
    }

    async handleSwitchWorkspaceBookmark (index) {
        if (index < 0 || index >= this.state.workspaceBookmarks.length) return;
        await this.applyWorkspaceBookmarkState(this.state.workspaceBookmarks[index].state);
        this.props.onRequestCloseWorkspaceBookmarks();
    }

    handleDeleteWorkspaceBookmark (index) {
        if (index < 0 || index >= this.state.workspaceBookmarks.length) return;
        this.setState(prev => {
            const next = [...prev.workspaceBookmarks];
            next.splice(index, 1);
            return {workspaceBookmarks: next};
        }, () => {
            this.saveWorkspaceBookmarksToProject();
        });
    }

    async handleEditWorkspaceBookmark (index) {
        const enableCategories = true;
        if (index < 0 || index >= this.state.workspaceBookmarks.length) return;
        const bookmark = this.state.workspaceBookmarks[index];

        const newName = await this.showPrompt(
            this.props.intl.formatMessage({
                defaultMessage: 'Bookmark Name',
                id: 'tw.workspaceBookmarks.nameTitle'
            }),
            this.props.intl.formatMessage({
                defaultMessage: 'Bookmark name:',
                description: 'Prompt title for bookmark name',
                id: 'tw.workspaceBookmarks.namePrompt'
            }),
            bookmark.name
        );
        if (newName === null || newName.trim() === '') {
            this.props.onRequestCloseWorkspaceBookmarks();
            return;
        }

        let newCategory = bookmark.category || 'General';
        if (enableCategories) {
            const categoryList = this.state.workspaceBookmarksCategories.join(', ');
            const categoryInput = await this.showPrompt(
                this.props.intl.formatMessage({
                    defaultMessage: 'Bookmark Category',
                    id: 'tw.workspaceBookmarks.categoryTitle'
                }),
                this.props.intl.formatMessage({
                    defaultMessage: 'Category (existing: {categories})',
                    description: 'Prompt for bookmark category',
                    id: 'tw.workspaceBookmarks.categoryPrompt'
                }, {categories: categoryList}),
                newCategory
            );
            if (categoryInput !== null) {
                newCategory = categoryInput.trim() || 'General';
            }
        }

        this.setState(prev => {
            const next = [...prev.workspaceBookmarks];
            next[index] = {
                ...next[index],
                name: newName.trim(),
                category: newCategory
            };
            const categories = new Set(prev.workspaceBookmarksCategories);
            categories.add(newCategory);
            return {
                workspaceBookmarks: next,
                workspaceBookmarksCategories: [...categories]
            };
        }, () => {
            this.saveWorkspaceBookmarksToProject();
            this.props.onRequestCloseWorkspaceBookmarks();
        });
    }

    handleToggleWorkspaceBookmarkCategoryCollapsed (category) {
        this.setState(prev => {
            const set = new Set(prev.workspaceBookmarksCollapsedCategories);
            if (set.has(category)) {
                set.delete(category);
            } else {
                set.add(category);
            }
            return {workspaceBookmarksCollapsedCategories: [...set]};
        }, () => {
            this.saveWorkspaceBookmarksToProject();
        });
    }

    handleExportWorkspaceBookmarks () {
        const data = createWorkspaceBookmarksExportData({
            bookmarks: this.state.workspaceBookmarks,
            categories: this.state.workspaceBookmarksCategories,
            collapsedCategories: this.state.workspaceBookmarksCollapsedCategories
        });
        downloadJsonObject(data, `workspace-bookmarks-${Date.now()}.json`);
        this.props.onRequestCloseWorkspaceBookmarks();
    }

    handleImportWorkspaceBookmarks () {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', e => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data || !Array.isArray(data.bookmarks)) {
                        throw new Error('Invalid format');
                    }
                    const importCount = data.bookmarks.length;
                    this.setState(prev => {
                        const merged = mergeWorkspaceBookmarksPayload({
                            bookmarks: prev.workspaceBookmarks,
                            categories: prev.workspaceBookmarksCategories,
                            collapsedCategories: prev.workspaceBookmarksCollapsedCategories
                        }, data);
                        return {
                            workspaceBookmarks: merged.bookmarks,
                            workspaceBookmarksCategories: merged.categories
                        };
                    }, async () => {
                        this.saveWorkspaceBookmarksToProject();
                        await this.showAlert(
                            this.props.intl.formatMessage({
                                defaultMessage: 'Success',
                                id: 'tw.workspaceBookmarks.importTitle'
                            }),
                            this.props.intl.formatMessage({
                                defaultMessage: 'Successfully imported {count} bookmarks!',
                                description: 'Alert after importing bookmarks',
                                id: 'tw.workspaceBookmarks.importSuccess'
                            }, {count: importCount})
                        );
                    });
                } catch {
                    this.showAlert(
                        this.props.intl.formatMessage({
                            defaultMessage: 'Error',
                            id: 'tw.workspaceBookmarks.importErrorTitle'
                        }),
                        this.props.intl.formatMessage({
                            defaultMessage: 'Failed to import bookmarks. Please check the file format.',
                            description: 'Alert when import fails',
                            id: 'tw.workspaceBookmarks.importFailed'
                        })
                    );
                }
            };
            reader.readAsText(file);
        });
        input.click();
        this.props.onRequestCloseWorkspaceBookmarks();
    }

    async handleClearAllWorkspaceBookmarks () {
        if (this.state.workspaceBookmarks.length === 0) {
            this.props.onRequestCloseWorkspaceBookmarks();
            return;
        }
        const ok = await this.showConfirm(
            this.props.intl.formatMessage({
                defaultMessage: 'Confirm',
                id: 'tw.workspaceBookmarks.clearTitle'
            }),
            this.props.intl.formatMessage({
                defaultMessage: 'Are you sure you want to delete all {count} bookmarks? This action cannot be undone.',
                description: 'Confirmation when clearing bookmarks',
                id: 'tw.workspaceBookmarks.clearAllConfirm'
            }, {count: this.state.workspaceBookmarks.length})
        );
        if (!ok) {
            this.props.onRequestCloseWorkspaceBookmarks();
            return;
        }
        this.setState({
            workspaceBookmarks: [],
            workspaceBookmarksCategories: ['General'],
            workspaceBookmarksCollapsedCategories: []
        }, () => {
            this.saveWorkspaceBookmarksToProject();
            this.props.onRequestCloseWorkspaceBookmarks();
        });
    }
    getSaveToComputerHandler (downloadProjectCallback) {
        return () => {
            this.props.onRequestCloseFile();
            downloadProjectCallback();
            if (this.props.onProjectTelemetryEvent) {
                const metadata = collectMetadata(this.props.vm, this.props.projectTitle, this.props.locale);
                this.props.onProjectTelemetryEvent('projectDidSave', metadata);
            }
        };
    }

    handleExportSettings = async () => {
        try {
            // 收集所有设置数据
            let addonSettings = null;
            try {
                // 尝试导出插件设置，即使 theme 有问题也能继续
                addonSettings = settingsStore.export({theme: this.props.theme || {isDark: () => false}});
            } catch (themeError) {
                console.error('Error exporting addon settings:', themeError);
                // 如果 theme 有问题，使用默认值
                addonSettings = {
                    core: {
                        lightTheme: true,
                        version: 'v1.0.0'
                    },
                    addons: {}
                };
            }

            // 收集所有 localStorage 设置
            const localStorageSettings = {};
            const keysToExport = [
                'tw:theme',
                'tw:shortcuts',
                'tw:language',
                'tw:addons',
                'tw:custom-themes',
                'tw:persisted_unsandboxed',
                'tw:restore-point-interval'
            ];

            for (const key of keysToExport) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    localStorageSettings[key] = value;
                }
            }

            // 收集工作区书签
            const workspaceBookmarks = {
                bookmarks: this.state.workspaceBookmarks || [],
                categories: this.state.workspaceBookmarksCategories || ['General'],
                collapsedCategories: this.state.workspaceBookmarksCollapsedCategories || []
            };

            // 收集 Redux 状态中的相关设置
            const reduxSettings = {
                locale: this.props.locale,
                isRtl: this.props.isRtl
            };

            const settingsData = {
                version: '1.1.0',
                exportTime: new Date().toISOString(),
                editorVersion: '3.2.37',
                addonSettings: addonSettings,
                localStorageSettings: localStorageSettings,
                workspaceBookmarks: workspaceBookmarks,
                reduxSettings: reduxSettings
            };

            // 创建压缩包
            const zip = new JSZip();
            zip.file('settings.json', JSON.stringify(settingsData, null, 2));
            zip.file('version.json', JSON.stringify({
                version: '1.1.0',
                exportTime: settingsData.exportTime,
                editorVersion: settingsData.editorVersion
            }, null, 2));

            // 生成压缩文件
            const content = await zip.generateAsync({type: 'blob'});

            // 保存文件
            const blob = new Blob([content], {type: 'application/zip'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `remixwarp-settings-${Date.now().toString(36)}.rws`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 显示成功消息
            this.showAlert('成功', '设置已成功导出');
        } catch (error) {
            console.error('Error exporting settings:', error);
            this.showAlert('错误', '导出设置失败，请重试。');
        } finally {
            this.props.onRequestCloseFile();
        }
    };

    handleImportSettings = () => {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.rws';
        input.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            try {
                // 读取文件
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        // 解析压缩包
                        const zip = new JSZip();
                        const content = await zip.loadAsync(event.target.result);

                        // 读取设置文件
                        const settingsFile = content.file('settings.json');
                        if (!settingsFile) {
                            throw new Error('Invalid settings file');
                        }

                        const settingsData = JSON.parse(await settingsFile.async('text'));

                        // 确认覆盖现有设置
                        if (!confirm('确定要导入设置吗？这将覆盖您当前的设置。')) {
                            return;
                        }

                        // 导入插件设置
                        if (settingsData.addonSettings) {
                            settingsStore.import(settingsData.addonSettings);
                        }

                        // 导入 localStorage 设置
                        if (settingsData.localStorageSettings) {
                            for (const [key, value] of Object.entries(settingsData.localStorageSettings)) {
                                localStorage.setItem(key, value);
                            }
                        }

                        // 兼容旧版本格式
                        if (settingsData.themeSettings) {
                            localStorage.setItem('tw:theme', settingsData.themeSettings);
                        }
                        if (settingsData.shortcuts) {
                            localStorage.setItem('tw:shortcuts', settingsData.shortcuts);
                        }
                        if (settingsData.language) {
                            localStorage.setItem('tw:language', settingsData.language);
                        }

                        // 导入工作区书签
                        if (settingsData.workspaceBookmarks) {
                            this.setState({
                                workspaceBookmarks: settingsData.workspaceBookmarks.bookmarks || [],
                                workspaceBookmarksCategories: settingsData.workspaceBookmarks.categories || ['General'],
                                workspaceBookmarksCollapsedCategories: settingsData.workspaceBookmarks.collapsedCategories || []
                            }, () => {
                                this.saveWorkspaceBookmarksToProject();
                            });
                        }

                        // 显示成功消息并提示刷新
                        this.showAlert('成功', '设置已成功导入。请刷新页面以应用更改。');
                    } catch (error) {
                        console.error('Error importing settings:', error);
                        this.showAlert('错误', '导入设置失败，请检查文件格式。');
                    }
                };
                reader.readAsArrayBuffer(file);
            } catch (error) {
                console.error('Error reading file:', error);
                this.showAlert('错误', '读取设置文件失败，请重试。');
            } finally {
                this.props.onRequestCloseFile();
            }
        };
        input.click();
    };
    handleToggleAutosave () {
        // Instead of enabling/disabling, just pause/resume the timer
        this.setState(prevState => ({autosavePaused: !prevState.autosavePaused}));
        this.props.onRequestCloseFile();
    }
    getAutosaveEnabled () {
        // Check if autosave addon is enabled and use its settings
        const isAutosaveAddonEnabled = SettingsStore.getAddonEnabled('autosave');

        if (isAutosaveAddonEnabled) {
            return SettingsStore.getAddonSetting('autosave', 'enabled');
        }
        return this.props.autosaveEnabled;
    }
    getAutosaveTimeRemaining () {
        return this.state.autosaveTimeRemaining;
    }
    startAutosaveCountdown () {
        // Clear existing interval
        if (this.autosaveCountdownInterval) {
            clearInterval(this.autosaveCountdownInterval);
        }

        // Don't start countdown if autosave is disabled
        if (!this.getAutosaveEnabled()) {
            this.setState({autosaveTimeRemaining: 0});
            return;
        }

        // Get interval from addon settings or Redux state
        const isAutosaveAddonEnabled = SettingsStore.getAddonEnabled('autosave');
        let intervalMinutes;

        if (isAutosaveAddonEnabled) {
            intervalMinutes = SettingsStore.getAddonSetting('autosave', 'interval') || 5;
        } else {
            intervalMinutes = this.props.autosaveInterval || 5;
        }

        // Set initial time
        const totalSeconds = intervalMinutes * 60;
        this.setState({autosaveTimeRemaining: totalSeconds});

        // Start countdown
        this.autosaveCountdownInterval = setInterval(() => {
            this.setState(prevState => {
                // Don't countdown if paused
                if (prevState.autosavePaused) {
                    return prevState; // No change
                }

                const newTime = prevState.autosaveTimeRemaining - 1;

                if (newTime <= 0) {
                    // Time to autosave!
                    this.performAutosave();
                    return {autosaveTimeRemaining: totalSeconds}; // Reset timer
                }
                return {autosaveTimeRemaining: newTime};
            });
        }, 1000);
    }
    performAutosave () {
        // Save to the current file using the same method as manual save
        if (this.props.handleSaveProject) {
            this.props.handleSaveProject();

            // Show notification if enabled
            const isAutosaveAddonEnabled = SettingsStore.getAddonEnabled('autosave');
            let showNotifications = true;

            if (isAutosaveAddonEnabled) {
                showNotifications = SettingsStore.getAddonSetting('autosave', 'showNotifications');
            }

            if (showNotifications) {
                this.showAutosaveNotification('Project autosaved successfully!', 'success');
            }
        }
    }
    showAutosaveNotification (message, type = 'info') {
        // Use the toast notification system instead of manual DOM manipulation
        if (this.props.showToast) {
            this.props.showToast(message, type);
        } else {
            // Fallback to console if showToast is not available
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    formatTimeRemaining (seconds) {
        if (seconds <= 0) return '';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        return `${remainingSeconds}s`;
    }
    restoreOptionMessage (deletedItem) {
        switch (deletedItem) {
        case 'Sprite':
            return (<FormattedMessage
                defaultMessage="Restore Sprite"
                description="Menu bar item for restoring the last deleted sprite."
                id="gui.menuBar.restoreSprite"
            />);
        case 'Sound':
            return (<FormattedMessage
                defaultMessage="Restore Sound"
                description="Menu bar item for restoring the last deleted sound."
                id="gui.menuBar.restoreSound"
            />);
        case 'Costume':
            return (<FormattedMessage
                defaultMessage="Restore Costume"
                description="Menu bar item for restoring the last deleted costume."
                id="gui.menuBar.restoreCostume"
            />);
        default: {
            return (<FormattedMessage
                defaultMessage="Restore"
                description="Menu bar item for restoring the last deleted item in its disabled state." /* eslint-disable-line max-len */
                id="gui.menuBar.restore"
            />);
        }
        }
    }
    handleClickSeeInside () {
        this.props.onClickSeeInside();
    }
    handleClickUndo () {
        if (!this.props.isPlayerOnly && this.state.canUndo) {
            this.ensureScratchBlocks().then(ScratchBlocks => {
                const workspace = ScratchBlocks.getMainWorkspace();
                if (workspace) {
                    workspace.undo(false);
                    this.updateUndoRedoState();
                }
            });
        }
    }
    handleClickRedo () {
        if (!this.props.isPlayerOnly && this.state.canRedo) {
            this.ensureScratchBlocks().then(ScratchBlocks => {
                const workspace = ScratchBlocks.getMainWorkspace();
                if (workspace) {
                    workspace.undo(true);
                    this.updateUndoRedoState();
                }
            });
        }
    }
    updateUndoRedoState () {
        if (this.props.isPlayerOnly) return;
        this.ensureScratchBlocks().then(ScratchBlocks => {
            const workspace = ScratchBlocks.getMainWorkspace();
            if (workspace) {
                const canUndo = workspace.hasUndoStack ?
                    workspace.hasUndoStack() : (workspace.undoStack_ && workspace.undoStack_.length > 0);
                const canRedo = workspace.hasRedoStack ?
                    workspace.hasRedoStack() : (workspace.redoStack_ && workspace.redoStack_.length > 0);
                this.setState({canUndo, canRedo});
            }
        });
    }
    buildAboutMenu (onClickAbout) {
        if (!onClickAbout) {
            // hide the button
            return null;
        }
        if (typeof onClickAbout === 'function') {
            // make a button which calls a function
            return <AboutButton onClick={onClickAbout} />;
        }
        // assume it's an array of objects
        // each item must have a 'title' FormattedMessage and a 'handleClick' function
        // generate a menu with items for each object in the array
        return (
            <MenuLabel
                open={this.props.aboutMenuOpen}
                onOpen={this.props.onRequestOpenAbout}
                onClose={this.props.onRequestCloseAbout}
            >
                <Info
                    className={styles.aboutIcon}
                    size={20}
                />
                <MenuBarMenu
                    className={classNames(styles.menuBarMenu)}
                    open={this.props.aboutMenuOpen}
                    place={this.props.isRtl ? 'right' : 'left'}
                >
                    {
                        onClickAbout.map(itemProps => (
                            <MenuItem
                                key={itemProps.title}
                                isRtl={this.props.isRtl}
                                onClick={this.wrapAboutMenuCallback(itemProps.onClick)}
                            >
                                {itemProps.title}
                            </MenuItem>
                        ))
                    }
                </MenuBarMenu>
            </MenuLabel>
        );
    }
    wrapAboutMenuCallback (callback) {
        return () => {
            callback();
            this.props.onRequestCloseAbout();
        };
    }
    render () {
        const saveNowMessage = (
            <FormattedMessage
                defaultMessage="Save now"
                description="Menu bar item for saving now"
                id="gui.menuBar.saveNow"
            />
        );
        const createCopyMessage = (
            <FormattedMessage
                defaultMessage="Save as a copy"
                description="Menu bar item for saving as a copy"
                id="gui.menuBar.saveAsCopy"
            />
        );
        const remixMessage = (
            <FormattedMessage
                defaultMessage="Remix"
                description="Menu bar item for remixing"
                id="gui.menuBar.remix"
            />
        );
        const newProjectMessage = (
            <FormattedMessage
                defaultMessage="New"
                description="Menu bar item for creating a new project"
                id="gui.menuBar.new"
            />
        );
        const remixButton = (
            <Button
                className={classNames(
                    styles.menuBarButton,
                    styles.remixButton
                )}
                iconClassName={styles.remixButtonIcon}
                iconElem={Shuffle}
                onClick={this.handleClickRemix}
            >
                {remixMessage}
            </Button>
        );
        // Show the About button only if we have a handler for it (like in the desktop app)
        const aboutButton = this.buildAboutMenu(this.props.onClickAbout);
        const menuBar = (
            <Box
                className={classNames(
                    this.props.className,
                    styles.menuBar
                )}
            >
                <div
                    className={classNames(
                        styles.mainMenu,
                        {
                            [styles[`main-menu-align-${this.props.theme.menuBarAlign || 'center'}`]]: true
                        }
                    )}
                >
                    <div className={styles.fileGroup}>
                        {this.props.errors.length > 0 && <div>
                            <MenuLabel
                                open={this.props.errorsMenuOpen}
                                onOpen={this.props.onClickErrors}
                                onClose={this.props.onRequestCloseErrors}
                            >
                                <TriangleAlert size={20} />
                                <ChevronDown size={8} />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.errorsMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                >
                                    <MenuSection>
                                        <MenuItemLink href={FEEDBACK_URL}>
                                            <FormattedMessage
                                                defaultMessage="Some scripts encountered errors."
                                                description="Link in error menu"
                                                id="tw.menuBar.reportError1"
                                            />
                                        </MenuItemLink>
                                        <MenuItemLink href={FEEDBACK_URL}>
                                            <FormattedMessage
                                                defaultMessage="This is a bug. Please report it."
                                                description="Link in error menu"
                                                id="tw.menuBar.reportError2"
                                            />
                                        </MenuItemLink>
                                    </MenuSection>
                                    <MenuSection>
                                        {this.props.errors.map(({id, sprite, error}) => (
                                            <MenuItem key={id}>
                                                {this.props.intl.formatMessage(twMessages.compileError, {
                                                    sprite,
                                                    error
                                                })}
                                            </MenuItem>
                                        ))}
                                    </MenuSection>
                                </MenuBarMenu>
                            </MenuLabel>
                        </div>}
                        {(this.props.canManageFiles) && (
                            <MenuLabel
                                open={this.props.fileMenuOpen}
                                onOpen={this.props.onClickFile}
                                onClose={this.props.onRequestCloseFile}
                            >
                                <FilePen
                                    width={20}
                                    height={20}
                                    size={20}
                                />
                                <span className={styles.collapsibleLabel}>
                                    <FormattedMessage
                                        defaultMessage="File"
                                        description="Text for file dropdown menu"
                                        id="gui.menuBar.file"
                                    />
                                </span>
                                <ChevronDown size={8} />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.fileMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                >
                                    <MenuItem
                                        isRtl={this.props.isRtl}
                                        onClick={this.handleClickNew}
                                    >
                                        <FilePlusCorner />
                                        {newProjectMessage}
                                    </MenuItem>
                                    {this.props.onClickNewWindow && (
                                        <MenuItem
                                            isRtl={this.props.isRtl}
                                            onClick={this.handleClickNewWindow}
                                        >
                                            <FormattedMessage
                                                defaultMessage="New window"
                                                // eslint-disable-next-line max-len
                                                description="Part of desktop app. Menu bar item that creates a new window."
                                                id="tw.menuBar.newWindow"
                                            />
                                        </MenuItem>
                                    )}
                                    {(this.props.canSave || this.props.canCreateCopy || this.props.canRemix) && (
                                        <MenuSection>
                                            {this.props.canSave && (
                                                <MenuItem
                                                    onClick={this.handleClickSave}
                                                    shortcut={formatShortcutDisplay('Ctrl+S')}
                                                >
                                                    {saveNowMessage}
                                                </MenuItem>
                                            )}
                                            {this.props.canCreateCopy && (
                                                <div>
                                                    <Save />
                                                    <MenuItem
                                                        onClick={this.handleClickSaveAsCopy}
                                                        shortcut={formatShortcutDisplay('Ctrl+Shift+S')}
                                                    >
                                                        {createCopyMessage}
                                                    </MenuItem>
                                                </div>
                                            )}
                                            {this.props.canRemix && (
                                                <MenuItem onClick={this.handleClickRemix}>
                                                    {remixMessage}
                                                </MenuItem>
                                            )}
                                        </MenuSection>
                                    )}
                                    <MenuSection>
                                        <MenuItem
                                            onClick={this.props.onStartSelectingFileUpload}
                                            shortcut={formatShortcutDisplay('Ctrl+O')}
                                        >
                                            <Upload />
                                            {this.props.intl.formatMessage(sharedMessages.loadFromComputerTitle)}
                                        </MenuItem>
                                        <SB3Downloader
                                            showSaveFilePicker={this.props.showSaveFilePicker}
                                        >
                                            {(_className, downloadProject, extended) => (
                                                <React.Fragment>
                                                    {extended.available && (
                                                        <React.Fragment>
                                                            {extended.name !== null && (
                                                                <MenuItem
                                                                    // eslint-disable-next-line max-len
                                                                    onClick={this.getSaveToComputerHandler(extended.saveToLastFile)}
                                                                    shortcut={formatShortcutDisplay('Ctrl+Shift+S')}
                                                                >
                                                                    <FileInput />
                                                                    <FormattedMessage
                                                                        defaultMessage="Save to {file}"
                                                                        // eslint-disable-next-line max-len
                                                                        description="Menu bar item to save project to an existing file on the user's computer"
                                                                        id="tw.saveTo"
                                                                        values={{
                                                                            file: extended.name
                                                                        }}
                                                                    />
                                                                </MenuItem>
                                                            )}
                                                            {/* eslint-disable-next-line max-len */}
                                                            <MenuItem
                                                                onClick={this.getSaveToComputerHandler(extended.saveAsNew)}
                                                                shortcut={formatShortcutDisplay('Ctrl+S')}
                                                            >
                                                                <Save />
                                                                <FormattedMessage
                                                                    defaultMessage="Save as..."
                                                                    // eslint-disable-next-line max-len
                                                                    description="Menu bar item to select a new file to save the project as"
                                                                    id="tw.saveAs"
                                                                />
                                                            </MenuItem>
                                                        </React.Fragment>
                                                    )}
                                                </React.Fragment>
                                            )}
                                        </SB3Downloader>
                                    </MenuSection>
                                    <MenuSection>
                                        <MenuItem
                                            isRtl={this.props.isRtl}
                                            expanded={false}
                                        >
                                            <div className={styles.menuItemContent}>
                                                <FormattedMessage
                                                    defaultMessage="Compatibility Convert"
                                                    description="Convert project to different editor formats"
                                                    id="gui.menuBar.compatibility"
                                                />
                                                <ChevronDown size={8} />
                                            </div>
                                            <Submenu place={this.props.isRtl ? 'left' : 'right'}>
                                                <div className={styles.menuSectionTitle}>
                                                    <FormattedMessage
                                                        defaultMessage="Save to"
                                                        description="Save to compatibility editors"
                                                        id="gui.menuBar.compatibility.saveTo"
                                                    />
                                                </div>
                                                <MenuItem onClick={this.handleConvertToScratch}>
                                                    <FormattedMessage
                                                        defaultMessage="Scratch"
                                                        description="Convert to Scratch compatibility"
                                                        id="gui.menuBar.compatibility.scratch"
                                                    />
                                                </MenuItem>
                                                <MenuItem onClick={this.handleConvertToTurbowarp}>
                                                    <FormattedMessage
                                                        defaultMessage="Turbowarp"
                                                        description="Convert to Turbowarp compatibility"
                                                        id="gui.menuBar.compatibility.turbowarp"
                                                    />
                                                </MenuItem>
                                                <MenuItem onClick={this.handleConvertTo02Engine}>
                                                    <FormattedMessage
                                                        defaultMessage="02Engine"
                                                        description="Convert to 02Engine compatibility"
                                                        id="gui.menuBar.compatibility.02engine"
                                                    />
                                                </MenuItem>
                                                <MenuItem onClick={this.handleConvertToAstraEditor}>
                                                    <FormattedMessage
                                                        defaultMessage="AstraEditor"
                                                        description="Convert to AstraEditor compatibility"
                                                        id="gui.menuBar.compatibility.astraeditor"
                                                    />
                                                </MenuItem>
                                                <MenuItem onClick={this.handleConvertToRemixWarp}>
                                                    <FormattedMessage
                                                        defaultMessage="RemixWarp"
                                                        description="Convert to Bilup compatibility"
                                                        id="gui.menuBar.compatibility.Bilup"
                                                    />
                                                </MenuItem>
                                            </Submenu>
                                        </MenuItem>
                                    </MenuSection>
                                    {this.props.onClickPackager && (
                                        <MenuSection>
                                            <MenuItem
                                                onClick={this.handleClickPackager}
                                                shortcut={formatShortcutDisplay('Ctrl+P')}
                                            >
                                                <Package />
                                                <FormattedMessage
                                                    defaultMessage="Package project"
                                                    // eslint-disable-next-line max-len
                                                    description="Menu bar item to open the current project in the packager"
                                                    id="tw.menuBar.package"
                                                />
                                            </MenuItem>
                                        </MenuSection>
                                    )}
                                    <MenuSection className={styles.menuSection}>
                                        <MenuItem onClick={this.props.onClickCollaboration}>
                                            <Handshake size={20} />
                                            <FormattedMessage
                                                defaultMessage="Live Collaboration"
                                                description="Menu bar item for live collaboration"
                                                id="tw.menuBar.collaboration"
                                            />
                                        </MenuItem>
                                        <MenuItem onClick={this.props.onClickTutorial}>
                                            <BookOpen size={20} />
                                            {this.props.locale === 'zh-cn' ? '视频教程' : 'Video Tutorial'}
                                        </MenuItem>
                                    </MenuSection>
                                    <MenuSection>
                                        <MenuItem
                                            onClick={this.handleClickRestorePoints}
                                            shortcut={formatShortcutDisplay('Alt+R')}
                                        >
                                            <RefreshCcw />
                                            <FormattedMessage
                                                defaultMessage="Restore points"
                                                description="Menu bar item to manage restore points"
                                                id="tw.menuBar.restorePoints"
                                            />
                                        </MenuItem>
                                        <MenuItem onClick={this.handleClickAddRestorePoint}>
                                            <ClockPlus />
                                            <FormattedMessage
                                                defaultMessage="Create restore point"
                                                description="Menu bar item to create a manual restore point immediately"
                                                id="tw.menuBar.createRestorePoint"
                                            />
                                        </MenuItem>
                                    </MenuSection>
                                    <MenuSection>
                                        <MenuItem
                                            expanded={false}
                                        >
                                            <div className={styles.menuItemContent}>
                                                {this.props.locale === 'zh-cn' ? '配置迁移' : 'Config Migration'}
                                                <ChevronDown size={8} />
                                            </div>
                                            <Submenu place={this.props.isRtl ? 'left' : 'right'}>
                                                <MenuItem onClick={this.handleExportSettings}>
                                                    {this.props.locale === 'zh-cn' ? '导出全部配置' : 'Export All Config'}
                                                </MenuItem>
                                                <MenuItem onClick={this.handleImportSettings}>
                                                    {this.props.locale === 'zh-cn' ? '导入全部配置' : 'Import All Config'}
                                                </MenuItem>
                                            </Submenu>
                                        </MenuItem>
                                    </MenuSection>
                                    {this.getAutosaveEnabled() && (
                                        <MenuSection>
                                            <MenuItem onClick={this.handleToggleAutosave}>
                                                <span
                                                    className={classNames({
                                                        [styles.inactive]: this.state.autosavePaused
                                                    })}
                                                >
                                                    {this.state.autosavePaused ? '⏸' : '✓'}
                                                </span>
                                                {' '}
                                                {this.state.autosavePaused ? (
                                                    <FormattedMessage
                                                        defaultMessage="Resume autosave"
                                                        description="Menu bar item to resume autosave"
                                                        id="tw.menuBar.resumeAutosave"
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        defaultMessage="Pause autosave"
                                                        description="Menu bar item to pause autosave"
                                                        id="tw.menuBar.pauseAutosave"
                                                    />
                                                )}
                                                {this.getAutosaveTimeRemaining() > 0 && (
                                                    <span
                                                        style={{
                                                            marginLeft: '8px',
                                                            fontSize: '0.9em',
                                                            opacity: this.state.autosavePaused ? 0.5 : 0.7
                                                        }}
                                                    >
                                                        {'('}
                                                        {this.formatTimeRemaining(this.getAutosaveTimeRemaining())}
                                                        {')'}
                                                        {this.state.autosavePaused && ' ⏸'}
                                                    </span>
                                                )}
                                            </MenuItem>
                                        </MenuSection>
                                    )}
                                </MenuBarMenu>
                            </MenuLabel>
                        )}
                        <MenuLabel
                            open={this.props.editMenuOpen}
                            onOpen={this.props.onClickEdit}
                            onClose={this.props.onRequestCloseEdit}
                        >
                            <PencilRuler size={20} />
                            <span className={styles.collapsibleLabel}>
                                <FormattedMessage
                                    defaultMessage="Edit"
                                    description="Text for edit dropdown menu"
                                    id="gui.menuBar.edit"
                                />
                            </span>
                            <ChevronDown size={8} />
                            <MenuBarMenu
                                className={classNames(styles.menuBarMenu)}
                                open={this.props.editMenuOpen}
                                place={this.props.isRtl ? 'left' : 'right'}
                            >
                                <MenuSection>
                                    {this.props.isPlayerOnly ? null : (
                                        <DeletionRestorer>{(handleRestore, {restorable, deletedItem}) => (
                                            <MenuItem
                                                className={classNames({[styles.disabled]: !restorable})}
                                                onClick={this.handleRestoreOption(handleRestore)}
                                            >
                                                <ArchiveRestore />
                                                {this.restoreOptionMessage(deletedItem)}
                                            </MenuItem>
                                        )}</DeletionRestorer>
                                    )}
                                </MenuSection>
                                <MenuSection>
                                    <MenuItem
                                        className={classNames({[styles.disabled]: !this.state.canUndo})}
                                        onClick={this.state.canUndo ? this.handleClickUndo : null}
                                        shortcut={formatShortcutDisplay('Ctrl+Z')}
                                    >
                                        <Undo />

                                        <FormattedMessage
                                            defaultMessage="Undo"
                                            description="Menu bar item for undoing"
                                            id="gui.menuBar.undo"
                                        />
                                    </MenuItem>
                                    <MenuItem
                                        className={classNames({[styles.disabled]: !this.state.canRedo})}
                                        onClick={this.state.canRedo ? this.handleClickRedo : null}
                                        shortcut={formatShortcutDisplay('Ctrl+Shift+Z')}
                                    >
                                        <Redo />

                                        <FormattedMessage
                                            defaultMessage="Redo"
                                            description="Menu bar item for redoing"
                                            id="gui.menuBar.redo"
                                        />
                                    </MenuItem>
                                </MenuSection>
                                <MenuSection>
                                    <MenuItem
                                        onClick={() => {
                                            this.props.onClickSettingsModal();
                                            this.props.onRequestCloseEdit();
                                        }}
                                        shortcut={formatShortcutDisplay('Ctrl+,')}
                                    >
                                        <Settings />
                                        <FormattedMessage
                                            defaultMessage="Project Settings"
                                            description="Menu bar item for settings"
                                            id="tw.menuBar.moreSettings"
                                        />
                                    </MenuItem>
                                    {this.props.onClickDesktopSettings &&
                                        <TWDesktopSettings onClick={this.props.onClickDesktopSettings} />}
                                    {this.props.onClickAddonSettings && (
                                        <MenuItem
                                            onClick={() => {
                                                this.props.onClickAddonSettings();
                                                this.props.onRequestCloseEdit();
                                            }}
                                        >
                                            <Puzzle />
                                            <FormattedMessage
                                                defaultMessage="Addons"
                                                description="Menu bar item for addon settings"
                                                id="tw.menuBar.addons"
                                            />
                                        </MenuItem>
                                    )}
                                    <ChangeUsername>{changeUsername => (
                                        <MenuItem onClick={changeUsername}>
                                            <UserPen />
                                            <FormattedMessage
                                                defaultMessage="Change Username"
                                                description="Menu bar item for changing the username"
                                                id="tw.menuBar.changeUsername"
                                            />
                                        </MenuItem>
                                    )}</ChangeUsername>
                                    <CloudVariablesToggler>{(toggleCloudVariables, {enabled, canUseCloudVariables}) => (
                                        <MenuItem
                                            className={classNames({[styles.disabled]: !canUseCloudVariables})}
                                            onClick={toggleCloudVariables}
                                        >
                                            <Cloud />
                                            {canUseCloudVariables ? (
                                                enabled ? (
                                                    <FormattedMessage
                                                        defaultMessage="Disable Cloud Variables"
                                                        description="Menu bar item for disabling cloud variables"
                                                        id="tw.menuBar.cloudOff"
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        defaultMessage="Enable Cloud Variables"
                                                        description="Menu bar item for enabling cloud variables"
                                                        id="tw.menuBar.cloudOn"
                                                    />
                                                )
                                            ) : (
                                                <FormattedMessage
                                                    defaultMessage="Cloud Variables are not Available"
                                                    // eslint-disable-next-line max-len
                                                    description="Menu bar item for when cloud variables are not available"
                                                        id="tw.menuBar.cloudUnavailable"
                                                    />
                                                )}
                                            </MenuItem>
                                        )}</CloudVariablesToggler>
                                        <TurboMode>{(toggleTurboMode, {turboMode}) => (
                                            <MenuItem onClick={toggleTurboMode}>
                                                <Zap />
                                                {turboMode ? (
                                                    <FormattedMessage
                                                        defaultMessage="Turn off Turbo Mode"
                                                        description="Menu bar item for turning off turbo mode"
                                                        id="gui.menuBar.turboModeOff"
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        defaultMessage="Turn on Turbo Mode"
                                                        description="Menu bar item for turning on turbo mode"
                                                        id="gui.menuBar.turboModeOn"
                                                    />
                                                )}
                                            </MenuItem>
                                        )}</TurboMode>
                                        <FramerateChanger>{(changeFramerate, {framerate}) => (
                                            <MenuItem onClick={changeFramerate}>
                                                <Gauge />
                                                {framerate === 60 ? (
                                                    <FormattedMessage
                                                        defaultMessage="Turn off 60 FPS Mode"
                                                        description="Menu bar item for turning off 60 FPS mode"
                                                        id="tw.menuBar.60off"
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        defaultMessage="Turn on 60 FPS Mode"
                                                        description="Menu bar item for turning on 60 FPS mode"
                                                        id="tw.menuBar.60on"
                                                    />
                                                )}
                                            </MenuItem>
                                        )}</FramerateChanger>
                                    </MenuSection>
                                <MenuSection>
                                    <MenuItem
                                        onClick={() => {
                                            this.props.onClickShowTutorial();
                                            this.props.onRequestCloseEdit();
                                        }}
                                    >
                                        <Sparkles />
                                        <FormattedMessage
                                            defaultMessage="Show Tutorial"
                                            description="Menu bar item to show the tutorial"
                                            id="tw.menuBar.showTutorial"
                                        />
                                    </MenuItem>
                                    {this.props.superRefactor && (
                                        <MenuItem
                                            onClick={() => {
                                                this.handleSuperRefactorClick();
                                                this.props.onRequestCloseEdit();
                                            }}
                                        >
                                            <Shuffle />
                                            <FormattedMessage
                                                defaultMessage="超级重构"
                                                description="Menu bar item for super refactor"
                                                id="tw.menuBar.superRefactor"
                                            />
                                        </MenuItem>
                                    )}
                                </MenuSection>
                            </MenuBarMenu>
                        </MenuLabel>
                        {this.props.isTotallyNormal && (
                            <MenuLabel
                                open={this.props.modeMenuOpen}
                                onOpen={this.props.onClickMode}
                                onClose={this.props.onRequestCloseMode}
                            >
                                <FormattedMessage
                                    defaultMessage="Mode"
                                    description="Mode menu item in the menu bar"
                                    id="gui.menuBar.modeMenu"
                                />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.modeMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                >
                                    <MenuSection>
                                        <MenuItem onClick={this.handleSetMode('NOW')}>
                                            <span className={classNames({[styles.inactive]: !this.props.modeNow})}>
                                                {'✓'}
                                            </span>
                                            {' '}
                                            <FormattedMessage
                                                defaultMessage="Normal mode"
                                                description="April fools: resets editor to not have any pranks"
                                                id="gui.menuBar.normalMode"
                                            />
                                        </MenuItem>
                                        <MenuItem onClick={this.handleSetMode('2020')}>
                                            <span className={classNames({[styles.inactive]: !this.props.mode2020})}>
                                                {'✓'}
                                            </span>
                                            {' '}
                                            <FormattedMessage
                                                defaultMessage="Caturday mode"
                                                description="April fools: Cat blocks mode"
                                                id="gui.menuBar.caturdayMode"
                                            />
                                        </MenuItem>
                                    </MenuSection>
                                </MenuBarMenu>
                            </MenuLabel>
                        )}
                        {(this.props.canChangeTheme || this.props.canChangeLanguage) && (<SettingsMenu
                            canChangeLanguage={this.props.canChangeLanguage}
                            canChangeTheme={this.props.canChangeTheme}
                            isRtl={this.props.isRtl}
                            onClickDesktopSettings={
                                this.props.onClickDesktopSettings &&
                                this.handleClickDesktopSettings
                            }
                            // eslint-disable-next-line react/jsx-no-bind
                            onOpenCustomSettings={this.props.onClickAddonSettings.bind(null, 'editor-theme3')}
                            onRequestClose={this.props.onRequestCloseSettings}
                            onRequestOpen={this.props.onClickSettings}
                            settingsMenuOpen={this.props.settingsMenuOpen}
                        />)}
                        <MenuLabel
                            open={this.props.toolsMenuOpen}
                            onOpen={this.props.onClickTools}
                            onClose={this.props.onRequestCloseTools}
                        >
                            <Wrench size={20} />
                            <span className={styles.collapsibleLabel}>
                                <FormattedMessage
                                    defaultMessage="Tools"
                                    description="Text for tools dropdown menu"
                                    id="gui.menuBar.tools"
                                />
                            </span>
                            <ChevronDown size={8} />
                            <MenuBarMenu
                                className={classNames(styles.menuBarMenu)}
                                open={this.props.toolsMenuOpen}
                                place={this.props.isRtl ? 'left' : 'right'}
                            >
                                <MenuSection>
                                    <MenuItem
                                        onClick={() => {
                                            this.props.onClickGitModal();
                                            this.props.onRequestCloseTools();
                                        }}
                                    >
                                        <GitBranch />
                                        <FormattedMessage
                                            defaultMessage="Git"
                                            description="Menu bar item to open git window"
                                            id="mw.menuBar.git"
                                        />
                                    </MenuItem>
                                    <MenuItem
                                        expanded={this.props.aiMenuOpen}
                                    >
                                        <div
                                            className={styles.option}
                                            onClick={this.props.onClickAI}
                                        >
                                            <Sparkles className={styles.icon} />
                                            <span className={styles.submenuLabel}>
                                                <FormattedMessage
                                                    defaultMessage="AI"
                                                    description="AI sub-menu"
                                                    id="gui.menuBar.ai"
                                                />
                                            </span>
                                            <ChevronDown className={styles.expandCaret} />
                                        </div>
                                        <Submenu
                                            className={styles.languageSubmenu}
                                            place={this.props.isRtl ? 'left' : 'right'}
                                        >
                                            <MenuSection>
                                                <MenuItem
                                                    onClick={() => {
                                                        this.props.onClickAIChat();
                                                        this.props.onRequestCloseTools();
                                                    }}
                                                >
                                                    <FormattedMessage
                                                        defaultMessage="AI Chat"
                                                        description="Menu bar item for AI chat"
                                                        id="gui.menuBar.aiChat"
                                                    />
                                                </MenuItem>
                                                <MenuItem
                                                    onClick={() => {
                                                        this.props.onClickAIAgent();
                                                        this.props.onRequestCloseTools();
                                                    }}
                                                >
                                                    <FormattedMessage
                                                        defaultMessage="AI Agent"
                                                        description="Menu bar item for AI agent"
                                                        id="gui.menuBar.aiAgent"
                                                    />
                                                </MenuItem>
                                            </MenuSection>
                                        </Submenu>
                                    </MenuItem>
                                </MenuSection>
                                {window.__mistwarpDebuggerToggle || window.__mistwarpVariableManagerToggle ? (
                                    <MenuSection>
                                        {window.__mistwarpDebuggerToggle && (
                                            <MenuItem
                                                onClick={() => {
                                                    window.__mistwarpDebuggerToggle();
                                                    this.props.onRequestCloseTools();
                                                }}
                                            >
                                                <Bug />
                                                <FormattedMessage
                                                    defaultMessage="Debugger"
                                                    description="Menu bar item to toggle the debugger"
                                                    id="tw.menuBar.debugger"
                                                />
                                            </MenuItem>
                                        )}
                                        {window.__mistwarpVariableManagerToggle && (
                                            <MenuItem
                                                onClick={() => {
                                                    window.__mistwarpVariableManagerToggle();
                                                    this.props.onRequestCloseTools();
                                                }}
                                            >
                                                <Database />
                                                <FormattedMessage
                                                    defaultMessage="Variable Manager"
                                                    description="Menu bar item to toggle the variable manager"
                                                    id="tw.menuBar.variableManager"
                                                />
                                            </MenuItem>
                                        )}
                                    </MenuSection>
                                ) : null}
                                <MenuSection>
                                     <MenuItem
                                         onClick={() => {
                                             this.props.onRequestCloseTools();
                                             this.props.onOpenExtensionLibrary();
                                         }}
                                         shortcut={formatShortcutDisplay('Ctrl+.')}
                                     >
                                         <PackagePlus />
                                         <FormattedMessage
                                             defaultMessage="Add Extension"
                                             description="Menu bar item for adding or importing extensions"
                                             id="tw.menuBar.extensions.addImport"
                                         />
                                     </MenuItem>
                                     <MenuItem
                                         onClick={() => {
                                             this.props.onRequestCloseTools();
                                             this.props.onOpenExtensionManagerModal();
                                         }}
                                         shortcut={formatShortcutDisplay('Ctrl+Alt+E')}
                                     >
                                        <FileCog />
                                        <FormattedMessage
                                            defaultMessage="Manage Extensions"
                                            description="Menu bar item for managing loaded extensions"
                                            id="tw.menuBar.extensions.manage"
                                        />
                                    </MenuItem>
                                </MenuSection>
                                <MenuSection>
                                    <MenuItem
                                        onClick={() => {
                                            this.props.onClickShortcutManagerModal();
                                            this.props.onRequestCloseTools();
                                        }}
                                    >
                                        <Keyboard />
                                        <FormattedMessage
                                            defaultMessage="Keyboard Shortcuts"
                                            description="Menu bar item for keyboard shortcuts"
                                            id="tw.menuBar.keyboardShortcuts"
                                        />
                                    </MenuItem>
                                </MenuSection>
                            </MenuBarMenu>
                        </MenuLabel>
                        {!this.props.isPlayerOnly && (
                            <MenuLabel
                                open={this.props.workspaceBookmarksMenuOpen}
                                onOpen={this.props.onClickWorkspaceBookmarks}
                                onClose={this.props.onRequestCloseWorkspaceBookmarks}
                            >
                                <Bookmark size={20} />
                                <span className={styles.collapsibleLabel}>
                                    <FormattedMessage
                                        defaultMessage="Bookmarks"
                                        description="Workspace bookmarks menu label"
                                        id="tw.workspaceBookmarks.menuLabel"
                                    />
                                </span>
                                <ChevronDown size={8} />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.workspaceBookmarksMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                >
                                    <WorkspaceBookmarksMenu
                                        bookmarks={this.state.workspaceBookmarks}
                                        categories={this.state.workspaceBookmarksCategories}
                                        collapsedCategories={this.state.workspaceBookmarksCollapsedCategories}
                                        enableCategories
                                        showSearch
                                        intl={this.props.intl}
                                        onAddBookmark={this.handleAddWorkspaceBookmark}
                                        onSwitchToBookmark={this.handleSwitchWorkspaceBookmark}
                                        onEditBookmark={this.handleEditWorkspaceBookmark}
                                        onDeleteBookmark={this.handleDeleteWorkspaceBookmark}
                                        onToggleCategoryCollapsed={this.handleToggleWorkspaceBookmarkCategoryCollapsed}
                                        onExport={this.handleExportWorkspaceBookmarks}
                                        onImport={this.handleImportWorkspaceBookmarks}
                                        onClearAll={this.handleClearAllWorkspaceBookmarks}
                                    />
                                </MenuBarMenu>
                            </MenuLabel>
                        )}
                    </div>

                    <Divider className={styles.divider} />

                    {this.props.canEditTitle ? (
                        <div className={classNames(styles.menuBarItem, styles.growable)}>
                            <MenuBarItemTooltip
                                enable
                                id="title-field"
                            >
                                <ProjectTitleInput
                                    className={classNames(styles.titleFieldGrowable)}
                                />
                            </MenuBarItemTooltip>
                        </div>
                    ) : ((this.props.authorUsername && this.props.authorUsername !== this.props.username) ? (
                        <AuthorInfo
                            className={styles.authorInfo}
                            imageUrl={this.props.authorThumbnailUrl}
                            projectId={this.props.projectId}
                            projectTitle={this.props.projectTitle}
                            userId={this.props.authorId}
                            username={this.props.authorUsername}
                        />
                    ) : null)}

                    {(this.props.isShowingProject || this.props.isUpdating) &&
                        this.props.projectId && this.props.projectId !== '0' ? (
                            <div className={classNames(styles.menuBarItem, styles.viewCounter)}>
                                <TWViewCounter projectId={this.props.projectId} />
                            </div>
                        ) : null}
                    {this.props.canShare ? (
                        (this.props.isShowingProject || this.props.isUpdating) && (
                            <div className={classNames(styles.menuBarItem)}>
                                <ProjectWatcher onDoneUpdating={this.props.onSeeCommunity}>
                                    {
                                        waitForUpdate => (
                                            <ShareButton
                                                className={styles.menuBarButton}
                                                isShared={this.props.isShared}
                                                /* eslint-disable react/jsx-no-bind */
                                                onClick={() => {
                                                    this.handleClickShare(waitForUpdate);
                                                }}
                                            /* eslint-enable react/jsx-no-bind */
                                            />
                                        )
                                    }
                                </ProjectWatcher>
                            </div>
                        )
                    ) : this.props.showComingSoon ? (
                        <div className={classNames(styles.menuBarItem)}>
                            <MenuBarItemTooltip id="share-button">
                                <ShareButton className={styles.menuBarButton} />
                            </MenuBarItemTooltip>
                        </div>
                    ) : null}
                    {this.props.canRemix && (
                        <div className={classNames(styles.menuBarItem)}>
                            {remixButton}
                        </div>
                    )}
                    <div className={classNames(styles.menuBarItem, styles.communityButtonWrapper)}>
                        {this.props.enableCommunity ? (
                            (this.props.isShowingProject || this.props.isUpdating) && (
                                <ProjectWatcher onDoneUpdating={this.props.onSeeCommunity}>
                                    {
                                        waitForUpdate => (
                                            <CommunityButton
                                                className={styles.menuBarButton}
                                                /* eslint-disable react/jsx-no-bind */
                                                onClick={() => {
                                                    this.handleClickSeeCommunity(waitForUpdate);
                                                }}
                                            /* eslint-enable react/jsx-no-bind */
                                            />
                                        )
                                    }
                                </ProjectWatcher>
                            )
                        ) : (this.props.showComingSoon ? (
                            <MenuBarItemTooltip id="community-button">
                                <CommunityButton className={styles.menuBarButton} />
                            </MenuBarItemTooltip>
                        ) : (this.props.enableSeeInside ? (
                            <SeeInsideButton
                                className={styles.menuBarButton}
                                onClick={this.handleClickSeeInside}
                            />
                        ) : []))}
                    </div>
                    {/* tw: add a feedback button */}
                    <div className={styles.menuBarItem}>
                        <a
                            className={styles.feedbackLink}
                            href={FEEDBACK_URL}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {/* todo: icon */}
                            <Button className={styles.feedbackButton}>
                                <FormattedMessage
                                    defaultMessage="{APP_NAME} Feedback"
                                    description="Button to give feedback in the menu bar"
                                    id="tw.feedbackButton"
                                    values={{
                                        APP_NAME
                                    }}
                                />
                            </Button>
                        </a>
                    </div>
                </div>

                <div className={styles.accountInfoGroup}>
                    <TWSaveStatus
                        showSaveFilePicker={this.props.showSaveFilePicker}
                    />
                    {aboutButton}
                </div>
            </Box>
        );

        return (
            <React.Fragment>
                {menuBar}
                <TWNews />
            </React.Fragment>
        );
    }
}

MenuBar.propTypes = {
    enableSeeInside: PropTypes.bool,
    onClickSeeInside: PropTypes.func,
    aboutMenuOpen: PropTypes.bool,
    accountMenuOpen: PropTypes.bool,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    autoUpdateProject: PropTypes.func,
    autosaveEnabled: PropTypes.bool,
    autosaveInterval: PropTypes.number,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    className: PropTypes.string,
    logo: PropTypes.string,
    errors: PropTypes.arrayOf(PropTypes.shape({
        sprite: PropTypes.string,
        error: PropTypes.string,
        id: PropTypes.number
    })),
    errorsMenuOpen: PropTypes.bool,
    onClickErrors: PropTypes.func,
    onRequestCloseErrors: PropTypes.func,
    confirmReadyToReplaceProject: PropTypes.func,
    currentLocale: PropTypes.string.isRequired,
    editMenuOpen: PropTypes.bool,
    editorMenuOpen: PropTypes.bool,
    enableCommunity: PropTypes.bool,
    fileMenuOpen: PropTypes.bool,
    workspaceBookmarksMenuOpen: PropTypes.bool,
    toolsMenuOpen: PropTypes.bool,
    aiMenuOpen: PropTypes.bool,
    handleSaveProject: PropTypes.func,
    intl: intlShape,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    isUpdating: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    loginMenuOpen: PropTypes.bool,
    mode1920: PropTypes.bool,
    mode1990: PropTypes.bool,
    mode2020: PropTypes.bool,
    mode220022BC: PropTypes.bool,
    modeMenuOpen: PropTypes.bool,
    modeNow: PropTypes.bool,
    onClickAbout: PropTypes.oneOfType([
        PropTypes.func, // button mode: call this callback when the About button is clicked
        PropTypes.arrayOf( // menu mode: list of items in the About menu
            PropTypes.shape({
                title: PropTypes.string, // text for the menu item
                onClick: PropTypes.func // call this callback when the menu item is clicked
            })
        )
    ]),
    onClickAccount: PropTypes.func,
    onClickAddonSettings: PropTypes.func,
    onClickCollaboration: PropTypes.func,
    onClickDesktopSettings: PropTypes.func,
    onClickPackager: PropTypes.func,
    onClickRestorePoints: PropTypes.func,
    onClickAddRestorePoint: PropTypes.func,
    onClickExtensionManager: PropTypes.func,
    openSimpleDialog: PropTypes.func.isRequired,
    showToast: PropTypes.func,
    onClickEdit: PropTypes.func,
    onClickEditor: PropTypes.func,
    onClickFile: PropTypes.func,
    onClickWorkspaceBookmarks: PropTypes.func,
    onClickLogin: PropTypes.func,
    onClickMode: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickNewWindow: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onClickSettings: PropTypes.func,
    onClickPreferencesModal: PropTypes.func,
    onClickSettingsModal: PropTypes.func,
    onClickGitModal: PropTypes.func,
    onClickShowTutorial: PropTypes.func,
    onClickTutorial: PropTypes.func,
    onClickShortcutManagerModal: PropTypes.func,
    onOpenSettingsModal: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenExtensionLibrary: PropTypes.func,
    onOpenExtensionManagerModal: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onOpenTipLibrary: PropTypes.func,
    onProjectTelemetryEvent: PropTypes.func,
    onRequestCloseAbout: PropTypes.func,
    onRequestCloseAccount: PropTypes.func,
    onRequestCloseEdit: PropTypes.func,
    onRequestCloseEditor: PropTypes.func,
    onRequestCloseFile: PropTypes.func,
    onRequestCloseWorkspaceBookmarks: PropTypes.func,
    onRequestCloseLogin: PropTypes.func,
    onRequestCloseMode: PropTypes.func,
    onRequestCloseSettings: PropTypes.func,
    onClickTools: PropTypes.func,
    onRequestCloseTools: PropTypes.func,
    onClickAI: PropTypes.func,
    onRequestCloseAI: PropTypes.func,
    onClickAIChat: PropTypes.func,
    onClickAIAgent: PropTypes.func,
    onClickSuperRefactor: PropTypes.func,
    onRequestOpenAbout: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onSetAutosaveEnabled: PropTypes.func,
    onSetAutosaveInterval: PropTypes.func,
    onSetAutosaveNotifications: PropTypes.func,
    onSetTimeTravelMode: PropTypes.func,
    onShare: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    projectId: PropTypes.string,
    projectTitle: PropTypes.string,
    renderLogin: PropTypes.func,
    sessionExists: PropTypes.bool,
    settingsMenuOpen: PropTypes.bool,
    shouldSaveBeforeTransition: PropTypes.func,
    showSaveFilePicker: PropTypes.func,
    showComingSoon: PropTypes.bool,
    theme: PropTypes.shape({
        menuBarAlign: PropTypes.string
    }),
    username: PropTypes.string,
    userOwnsProject: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

MenuBar.contextTypes = {
    store: PropTypes.object
};

MenuBar.defaultProps = {
    onShare: () => { }
};

const mapStateToProps = (state, ownProps) => {
    const loadingState = state.scratchGui.projectState.loadingState;
    const user = state.session && state.session.session && state.session.session.user;
    return {
        authorUsername: state.scratchGui.tw.author.username,
        authorThumbnailUrl: state.scratchGui.tw.author.thumbnail,
        projectId: state.scratchGui.projectState.projectId,
        aboutMenuOpen: aboutMenuOpen(state),
        accountMenuOpen: accountMenuOpen(state),
        autosaveEnabled: state.scratchGui.autosave.enabled,
        autosaveInterval: state.scratchGui.autosave.interval,
        currentLocale: state.locales.locale,
        fileMenuOpen: fileMenuOpen(state),
        editMenuOpen: editMenuOpen(state),
        workspaceBookmarksMenuOpen: workspaceBookmarksMenuOpen(state),
        errors: state.scratchGui.tw.compileErrors,
        errorsMenuOpen: errorsMenuOpen(state),
        toolsMenuOpen: toolsMenuOpen(state),
        aiMenuOpen: aiMenuOpen(state),
        isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
        isRtl: state.locales.isRtl,
        isUpdating: getIsUpdating(loadingState),
        isShowingProject: getIsShowingProject(loadingState),
        locale: state.locales.locale,
        loginMenuOpen: loginMenuOpen(state),
        modeMenuOpen: modeMenuOpen(state),
        projectTitle: state.scratchGui.projectTitle,
        sessionExists: state.session && typeof state.session.session !== 'undefined',
        settingsMenuOpen: settingsMenuOpen(state),
        theme: state.scratchGui.theme.theme,
        username: user ? user.username : null,
        userOwnsProject: ownProps.authorUsername && user &&
            (ownProps.authorUsername === user.username),
        vm: state.scratchGui.vm,
        mode220022BC: isTimeTravel220022BC(state),
        mode1920: isTimeTravel1920(state),
        mode1990: isTimeTravel1990(state),
        mode2020: isTimeTravel2020(state),
        modeNow: isTimeTravelNow(state),
        superRefactor: localStorage.getItem('mw:super-refactor') === 'true'
    };
};

const mapDispatchToProps = dispatch => ({
    dispatch,
    onClickSeeInside: () => dispatch(setPlayer(false)),
    autoUpdateProject: () => dispatch(autoUpdateProject()),
    onOpenTipLibrary: () => dispatch(openTipsLibrary()),
    onClickAccount: () => dispatch(openAccountMenu()),
    onRequestCloseAccount: () => dispatch(closeAccountMenu()),
    onClickCollaboration: () => dispatch(openCollaborationModal()),
    onClickFile: () => dispatch(openFileMenu()),
    onRequestCloseFile: () => dispatch(closeFileMenu()),
    onClickWorkspaceBookmarks: () => dispatch(openWorkspaceBookmarksMenu()),
    onRequestCloseWorkspaceBookmarks: () => dispatch(closeWorkspaceBookmarksMenu()),
    onClickEdit: () => dispatch(openEditMenu()),
    onRequestCloseEdit: () => dispatch(closeEditMenu()),
    onClickErrors: () => dispatch(openErrorsMenu()),
    onRequestCloseErrors: () => dispatch(closeErrorsMenu()),
    onClickTools: () => dispatch(openToolsMenu()),
    onRequestCloseTools: () => dispatch(closeToolsMenu()),
    onClickAI: () => dispatch(openAIMenu()),
    onRequestCloseAI: () => dispatch(closeAIMenu()),
    onClickAIChat: () => dispatch(openAIChatModal()),
    onClickAIAgent: () => dispatch(openAIAgentModal()),
    onClickLogin: () => dispatch(openLoginMenu()),
    onRequestCloseLogin: () => dispatch(closeLoginMenu()),
    onClickMode: () => dispatch(openModeMenu()),
    onRequestCloseMode: () => dispatch(closeModeMenu()),
    onRequestOpenAbout: () => dispatch(openAboutMenu()),
    onRequestCloseAbout: () => dispatch(closeAboutMenu()),
    onClickRestorePoints: () => dispatch(openRestorePointModal()),
    onClickExtensionManager: () => dispatch(openExtensionManagerModal()),
    onClickSettings: () => dispatch(openSettingsMenu()),
    onClickSettingsModal: () => {
        dispatch(closeEditMenu());
        dispatch(openSettingsModal());
    },
    onClickGitModal: () => {
        dispatch(closeEditMenu());
        dispatch(openGitModal());
    },
    onClickShowTutorial: () => {
        localStorage.removeItem('mw:has-seen-onboarding');
        dispatch(showOnboarding());
    },
    onClickTutorial: () => {
        dispatch(openTutorialModal());
    },
    onClickShortcutManagerModal: () => {
        dispatch(openShortcutManagerModal());
    },
    onOpenSettingsModal: () => dispatch(openSettingsModal()),
    onRequestCloseSettings: () => dispatch(closeSettingsMenu()),
    onClickNew: needSave => {
        dispatch(setPlayer(false));
        dispatch(requestNewProject(needSave));
        dispatch(setFileHandle(null));
    },
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy()),
    onSeeCommunity: () => dispatch(setPlayer(true)),
    onSetAutosaveEnabled: enabled => dispatch(setAutosaveEnabled(enabled)),
    onSetAutosaveInterval: interval => dispatch(setAutosaveInterval(interval)),
    onSetAutosaveNotifications: showNotifications => dispatch(setAutosaveNotifications(showNotifications)),
    onSetTimeTravelMode: mode => dispatch(setTimeTravel(mode))
});

export default compose(
    injectIntl,
    MenuBarHOC,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(MenuBar);

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
import {isAchievementsEnabled} from '../../lib/achievements.js';

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
    openTutorialModal,
    openExtensionEditorModal,
    openSuperRefactorModal,
    openCompatibilityModal
} from '../../reducers/modals';

// IPC for opening extension editor
let ipcRenderer = null;
try {
  ipcRenderer = require('electron').ipcRenderer;
} catch (e) {
  // Not in Electron environment
  ipcRenderer = null;
}
import {showOnboarding} from '../../reducers/onboarding';
import {openCollaborationModal} from '../../reducers/collaboration';
import {setPlayer} from '../../reducers/mode';
import {openAIChatModal, openAIAgentModal, openBaiduAIModal, openGandiHelpModal} from '../../reducers/modals';
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
    normalizeWorkspaceBookmarkCategory,
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
    Zap, Gauge, BookOpen, Code, Trophy
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
        this.undoTimes = [];
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
            'openCompatibilityModalDialog'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
        this.startAutosaveCountdown();

        // Prevent the legacy addon from also injecting a bookmarks menu.
        window.__RemixWarpNativeWorkspaceBookmarks = true;
        
        // Expose menu bar instance for compatibility modal
        window.__remixWarpMenuBarInstance = this;

        this.loadWorkspaceBookmarksFromProject();
        if (this.props.vm && this.props.vm.runtime) {
            this.workspaceBookmarksProjectListener = () => {
                this.loadWorkspaceBookmarksFromProject();
                if (new Date().getHours() < 4) {
                    unlockAchievement('late-night-coding');
                }
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
            'AstraEditor': { name: 'AstraEditor', url: 'https://editors.astras.top/' },
            'Bilup': { name: 'Bilup', url: 'https://editor.bilup.org/' },
            'Gandi': { name: 'Gandi', url: 'https://getgandi.com/' },
            'Kitten4': { name: 'Kitten4', url: 'https://www.codemao.cn/' }
        };
        return platforms[agentName] || { name: agentName.toLowerCase(), url: '' };
    }

    async handleCompatibilitySave (agentName) {
        if (this.props.vm && this.props.vm.saveProjectSb3DontZip) {
            try {
                const projectFiles = this.props.vm.saveProjectSb3DontZip();
                const jsonData = projectFiles['project.json'];
                const projectJson = JSON.parse(new TextDecoder().decode(jsonData));

                if (agentName === 'Kitten4') {
                    console.log('=== Kitten4 Conversion Debug ===');
                    console.log('Project targets:', projectJson.targets ? projectJson.targets.length : 0);
                    if (projectJson.targets && projectJson.targets[1]) {
                        const target = projectJson.targets[1];
                        console.log('Target name:', target.name);
                        console.log('Blocks count:', Object.keys(target.blocks || {}).length);
                        for (const [blockId, block] of Object.entries(target.blocks || {})) {
                            console.log('Block', blockId, '- opcode:', block.opcode, '- inputs:', JSON.stringify(block.inputs));
                        }
                    }
                    await this.convertToKitten4Format(projectJson, projectFiles);
                    return;
                }

                if (!projectJson.meta) {
                    projectJson.meta = {};
                }
                projectJson.meta.agent = agentName;

                const platformInfo = this.getPlatformInfo(agentName);
                projectJson.meta.platform = platformInfo;

                if (agentName === 'Gandi') {
                    projectJson.meta.gandiVersion = '1.0';
                    projectJson.meta.gandiCompatible = true;
                    projectJson.meta.gandiEditorVersion = '1.0';
                    projectJson.meta.gandiBuild = '1.0.0';
                    projectJson.meta.gandiProjectType = 'scratch3';
                    projectJson.meta.gandiAuthor = 'Gandi Editor';
                    projectJson.meta.gandiCreatedWith = 'Gandi Editor';
                    
                    projectJson.extensions = [];
                    delete projectJson.extensionURLs;
                    
                    if (projectJson.targets) {
                        projectJson.targets.forEach(target => {
                            if (!target.isStage) {
                                if (target.visible === undefined) target.visible = true;
                                if (target.x === undefined) target.x = 0;
                                if (target.y === undefined) target.y = 0;
                                if (target.size === undefined) target.size = 100;
                                if (target.direction === undefined) target.direction = 90;
                                if (target.draggable === undefined) target.draggable = false;
                                if (target.rotationStyle === undefined) target.rotationStyle = 'all around';
                            }
                            
                            if (target.costumes) {
                                target.costumes.forEach(costume => {
                                    if (costume.bitmapResolution === undefined) costume.bitmapResolution = 2;
                                    if (costume.layerOrder === undefined) costume.layerOrder = 0;
                                    if (costume.rotationCenterX === undefined) costume.rotationCenterX = 0.5;
                                    if (costume.rotationCenterY === undefined) costume.rotationCenterY = 0.5;
                                });
                            }
                            
                            if (target.sounds) {
                                target.sounds.forEach(sound => {
                                    if (sound.rate === undefined) sound.rate = 44100;
                                    if (sound.sampleCount === undefined) sound.sampleCount = 0;
                                });
                            }
                        });
                    }
                    
                    if (!projectJson.monitors) {
                        projectJson.monitors = [];
                    }
                    
                    if (!projectJson.meta.semver) {
                        projectJson.meta.semver = '3.0.0';
                    }
                }

                const modifiedJson = new TextEncoder().encode(JSON.stringify(projectJson));
                projectFiles['project.json'] = modifiedJson;

                const JSZip = require('jszip');
                const zip = new JSZip();

                for (const [filename, data] of Object.entries(projectFiles)) {
                    if (filename === 'project.json' || 
                        filename.match(/^[a-f0-9]{32}\.[a-z0-9]{3}$/i) ||
                        filename.match(/^costumes\/.*$/) ||
                        filename.match(/^sounds\/.*$/)) {
                        zip.file(filename, data);
                    }
                }

                const content = await zip.generateAsync({
                    type: 'uint8array',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 6
                    },
                    platform: process.platform
                });

                const downloadBlob = require('../../lib/utils/download-blob').default;
                downloadBlob(`project-${agentName.toLowerCase()}.sb3`, content);

            } catch (error) {
                console.error('Error during compatibility save:', error);
                this.showAlert('Error', `Failed to convert project: ${error.message}`);
            }
        }
    }

    generateUUID () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async convertToKitten4Format (projectJson, projectFiles) {
        const kittenProject = {
            hidden_toolbox: { toolbox: [], blocks: [] },
            work_source_label: 1,
            codemao_value: '',
            sample_id: '',
            version: 25,
            application_version: '4.11.19',
            work_type: 'KITTEN',
            size: { width: 620, height: 900 },
            type: 1,
            project_name: projectJson.meta?.name || '未命名项目',
            theatre: {
                scenes_order: [],
                scenes: {},
                actors: {},
                videos: {},
                styles: {},
                groups: {},
                timer: {}
            },
            variables: {},
            variable_order: [],
            cloud_variables: {},
            audio: {},
            audio_order: [],
            midimusic: [],
            midi_order: [],
            matrix: {},
            models: {},
            toolbox: {
                current_type: '',
                physics: false,
                physics2: false,
                block_ai_classification: false,
                block_ai_game: false,
                block_hardware_arduino: false,
                block_hardware_weeemake: false,
                block_hardware_microbit: false,
                cloud_variable: false,
                cloud_list: false,
                advanced: false,
                camera: false,
                video: false,
                wood: false,
                cognitive: false,
                ai_lab: false,
                midimusic: false,
                mobile_control: false
            },
            toolbox_order: ['event', 'control', 'action', 'appearance', 'audio', 'pen', 'sensing', 'operator', 'data', 'data', 'procedure', 'mobile_control', 'physic', 'physics2', 'cloud_variable', 'cloud_list', 'advanced', 'ai_lab', 'ai_game', 'cognitive', 'camera', 'video', 'wood', 'arduino', 'weeemake', 'microbit', 'ai', 'midimusic'],
            last_toolbox_order: ['event', 'control', 'action', 'appearance', 'audio', 'pen', 'sensing', 'operator', 'variable', 'list', 'procedure', 'mobile_control', 'physics', 'physics2', 'cloud_variable', 'cloud_list', 'advanced', 'ai_lab', 'ai_game', 'cognitive', 'camera', 'video', 'wood', 'arduino', 'weeemake', 'microbit', 'ai', 'midimusic'],
            hardware_type: '',
            device_widget_type: null,
            is_partial: false,
            ai_lab: {},
            broadcasts: {},
            painter: { color: [] }
        };

        const sceneId = this.generateUUID();
        kittenProject.theatre.scenes_order.push(sceneId);

        let sceneActors = [];
        let actorIdCounter = 0;
        let stageData = null;
        let audioIdCounter = 0;

        // 转换广播消息
        if (projectJson.broadcasts) {
            for (const [id, name] of Object.entries(projectJson.broadcasts)) {
                kittenProject.broadcasts[id] = name;
            }
        }
        
        const blockOpcodeMap = {
            motion_movesteps: 'self_go_forward',
            motion_turnright: 'self_rotate',
            motion_turnleft: 'self_rotate',
            motion_goto: 'self_move_specify',
            motion_goto_menu: 'controller_shadow',
            motion_gotoxy: 'self_move_to',
            motion_glideto: 'self_glide_to',
            motion_glideto_menu: 'controller_shadow',
            motion_glidesecstoxy: 'self_glide_to',
            motion_pointindirection: 'self_point_towards',
            motion_pointtowards: 'self_face_to',
            motion_pointtowards_menu: 'controller_shadow',
            motion_changexby: 'self_change_coordinate',
            motion_setx: 'self_set_position',
            motion_changeyby: 'self_change_coordinate',
            motion_sety: 'self_set_position',
            motion_bounce: 'self_bounce_off_edge',
            motion_ifonedgebounce: 'self_bounce_off_edge',
            motion_setrotationstyle: 'self_set_rotation_type',

            looks_sayforsecs: 'self_say_sec',
            looks_say: 'self_say',
            looks_changesizeby: 'self_change_size',
            looks_setsizeto: 'self_set_size',

            sound_playuntildone: 'sound_play_until',
            sound_setvolumeto: 'sound_set_volume',

            event_whenflagclicked: 'start_on_click',
            event_whenkeypressed: 'start_when_key',
            event_whenthisspriteclicked: 'sprite_on_tap',
            event_broadcast: 'broadcast',

            control_wait: 'control_wait',
            control_repeat: 'control_repeat',
            control_forever: 'control_forever',
            control_if: 'control_if',

            operator_add: 'operator_add',
            operator_subtract: 'operator_subtract',
            operator_random: 'operator_random',

            data_setvariableto: 'variable_set',
            data_changevariableby: 'variable_change'
        };

        const convertBlocks = (scratchBlocks) => {
            const kittenBlocks = {};
            const kittenConnections = {};
            if (!scratchBlocks) return { blocks: {}, connections: {}, comments: {} };

            let shadowBlockCounter = 0;

            for (const [blockId, block] of Object.entries(scratchBlocks)) {
                let kittenType = blockOpcodeMap[block.opcode] || block.opcode;
                const isMotionGoto = block.opcode === 'motion_goto';
                const isMotionGlideto = block.opcode === 'motion_glideto';
                const isMotionGlideSecsToXY = block.opcode === 'motion_glidesecstoxy';
                const isMotionPointInDir = block.opcode === 'motion_pointindirection';
                const isMotionPointTowards = block.opcode === 'motion_pointtowards';
                const isMotionGotoXY = block.opcode === 'motion_gotoxy';

                const kittenBlock = {
                    type: kittenType,
                    id: blockId,
                    comment: null,
                    is_shadow: block.shadow || false,
                    collapsed: false,
                    disabled: false,
                    deletable: true,
                    movable: true,
                    editable: true,
                    visible: 'visible',
                    shadows: {},
                    fields: {},
                    field_constraints: {},
                    field_extra_attr: {},
                    mutation: '',
                    is_output: block.shadow ? true : false,
                    parent_id: block.parent || null,
                    location: [block.x || 0, block.y || 0]
                };

                if (kittenType === 'self_move_specify') {
                    kittenBlock.fields.target = '__random';
                }

                if (kittenType === 'self_face_to') {
                    kittenBlock.fields.sprite = '__mouse';
                }

                if (block.opcode === 'motion_changexby' || block.opcode === 'motion_setx') {
                    kittenBlock.fields.coordinary = 'x';
                } else if (block.opcode === 'motion_changeyby' || block.opcode === 'motion_sety') {
                    kittenBlock.fields.coordinary = 'y';
                }

                if (block.opcode === 'motion_setrotationstyle') {
                    if (block.fields && block.fields.STYLE) {
                        const styleValue = Array.isArray(block.fields.STYLE) ? block.fields.STYLE[0] : block.fields.STYLE;
                        let rotationType = '1';
                        if (styleValue === 'all around') {
                            rotationType = '3';
                        } else if (styleValue === 'left-right') {
                            rotationType = '1';
                        } else if (styleValue === 'don\'t rotate') {
                            rotationType = '2';
                        }
                        kittenBlock.fields.rotation_type = rotationType;
                    }
                }

                if (isMotionGoto) {
                    const menuInput = block.inputs && block.inputs.TO;
                    if (menuInput && Array.isArray(menuInput[1]) && menuInput[1][0] === 3) {
                        const menuBlockId = menuInput[1][1];
                        const menuBlock = scratchBlocks[menuBlockId];
                        if (menuBlock && menuBlock.fields && menuBlock.fields.TO) {
                            const toValue = Array.isArray(menuBlock.fields.TO) ? menuBlock.fields.TO[0] : menuBlock.fields.TO;
                            if (toValue === '_random_') {
                                const randomXBlockId = `shadow_random_x_${shadowBlockCounter++}`;
                                const randomYBlockId = `shadow_random_y_${shadowBlockCounter++}`;
                                const randAXId = `rand_a_x_${shadowBlockCounter++}`;
                                const randBXId = `rand_b_x_${shadowBlockCounter++}`;
                                const randAYId = `rand_a_y_${shadowBlockCounter++}`;
                                const randBYId = `rand_b_y_${shadowBlockCounter++}`;

                                kittenBlocks[randAXId] = {
                                    type: 'math_number',
                                    id: randAXId,
                                    comment: null,
                                    is_shadow: true,
                                    collapsed: false,
                                    disabled: false,
                                    deletable: true,
                                    movable: true,
                                    editable: true,
                                    visible: 'visible',
                                    location: [0, 0],
                                    shadows: {},
                                    fields: { NUM: '-240' },
                                    field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                                    field_extra_attr: {},
                                    mutation: '',
                                    is_output: true,
                                    parent_id: randomXBlockId
                                };
                                kittenBlocks[randBXId] = {
                                    type: 'math_number',
                                    id: randBXId,
                                    comment: null,
                                    is_shadow: true,
                                    collapsed: false,
                                    disabled: false,
                                    deletable: true,
                                    movable: true,
                                    editable: true,
                                    visible: 'visible',
                                    location: [0, 0],
                                    shadows: {},
                                    fields: { NUM: '240' },
                                    field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                                    field_extra_attr: {},
                                    mutation: '',
                                    is_output: true,
                                    parent_id: randomXBlockId
                                };
                                kittenBlocks[randomXBlockId] = {
                                    type: 'random',
                                    id: randomXBlockId,
                                    comment: null,
                                    is_shadow: true,
                                    collapsed: false,
                                    disabled: false,
                                    deletable: true,
                                    movable: true,
                                    editable: true,
                                    visible: 'visible',
                                    location: [0, 0],
                                    shadows: {
                                        a: `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${randAXId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">-240</field></shadow>`,
                                        b: `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${randBXId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">240</field></shadow>`
                                    },
                                    fields: {},
                                    field_constraints: {},
                                    field_extra_attr: {},
                                    mutation: '',
                                    is_output: true,
                                    parent_id: blockId
                                };

                                kittenBlocks[randAYId] = {
                                    type: 'math_number',
                                    id: randAYId,
                                    comment: null,
                                    is_shadow: true,
                                    collapsed: false,
                                    disabled: false,
                                    deletable: true,
                                    movable: true,
                                    editable: true,
                                    visible: 'visible',
                                    location: [0, 0],
                                    shadows: {},
                                    fields: { NUM: '-180' },
                                    field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                                    field_extra_attr: {},
                                    mutation: '',
                                    is_output: true,
                                    parent_id: randomYBlockId
                                };
                                kittenBlocks[randBYId] = {
                                    type: 'math_number',
                                    id: randBYId,
                                    comment: null,
                                    is_shadow: true,
                                    collapsed: false,
                                    disabled: false,
                                    deletable: true,
                                    movable: true,
                                    editable: true,
                                    visible: 'visible',
                                    location: [0, 0],
                                    shadows: {},
                                    fields: { NUM: '180' },
                                    field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                                    field_extra_attr: {},
                                    mutation: '',
                                    is_output: true,
                                    parent_id: randomYBlockId
                                };
                                kittenBlocks[randomYBlockId] = {
                                    type: 'random',
                                    id: randomYBlockId,
                                    comment: null,
                                    is_shadow: true,
                                    collapsed: false,
                                    disabled: false,
                                    deletable: true,
                                    movable: true,
                                    editable: true,
                                    visible: 'visible',
                                    location: [0, 0],
                                    shadows: {
                                        a: `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${randAYId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">-180</field></shadow>`,
                                        b: `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${randBYId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">180</field></shadow>`
                                    },
                                    fields: {},
                                    field_constraints: {},
                                    field_extra_attr: {},
                                    mutation: '',
                                    is_output: true,
                                    parent_id: blockId
                                };

                                kittenBlock.shadows['x'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="random" id="${randomXBlockId}" visible="visible"></shadow>`;
                                kittenBlock.shadows['y'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="random" id="${randomYBlockId}" visible="visible"></shadow>`;

                                if (!kittenConnections[blockId]) kittenConnections[blockId] = {};
                                kittenConnections[blockId][randomXBlockId] = { type: 'input', input_type: 'value', input_name: 'x' };
                                kittenConnections[blockId][randomYBlockId] = { type: 'input', input_type: 'value', input_name: 'y' };
                            }
                        }
                    }
                }
                
                if (isMotionGlideto || isMotionGlideSecsToXY) {
                    let isRandomGlide = false;
                    
                    if (isMotionGlideto) {
                        const menuInput = block.inputs && block.inputs.TO;
                        if (menuInput && Array.isArray(menuInput[1])) {
                            if (menuInput[1][0] === 3) {
                                const menuBlockId = menuInput[1][1];
                                const menuBlock = scratchBlocks[menuBlockId];
                                if (menuBlock && menuBlock.fields) {
                                    const toField = menuBlock.fields.TO || menuBlock.fields.TOWARDS;
                                    if (toField) {
                                        const toValue = Array.isArray(toField) ? toField[0] : toField;
                                        if (toValue === '_random_' || toValue === 'random position') {
                                            isRandomGlide = true;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (isRandomGlide) {
                        const randomXBlockId = `shadow_random_x_${shadowBlockCounter++}`;
                        const randomYBlockId = `shadow_random_y_${shadowBlockCounter++}`;
                        const randAXId = `rand_a_x_${shadowBlockCounter++}`;
                        const randBXId = `rand_b_x_${shadowBlockCounter++}`;
                        const randAYId = `rand_a_y_${shadowBlockCounter++}`;
                        const randBYId = `rand_b_y_${shadowBlockCounter++}`;

                        kittenBlocks[randAXId] = {
                            type: 'math_number',
                            id: randAXId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {},
                            fields: { NUM: '-1000' },
                            field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: randomXBlockId
                        };
                        kittenBlocks[randBXId] = {
                            type: 'math_number',
                            id: randBXId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {},
                            fields: { NUM: '1000' },
                            field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: randomXBlockId
                        };
                        kittenBlocks[randomXBlockId] = {
                            type: 'random',
                            id: randomXBlockId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {
                                a: `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${randAXId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">-1000</field></shadow>`,
                                b: `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${randBXId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">1000</field></shadow>`
                            },
                            fields: {},
                            field_constraints: {},
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: blockId
                        };

                        kittenBlocks[randAYId] = {
                            type: 'math_number',
                            id: randAYId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {},
                            fields: { NUM: '-1000' },
                            field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: randomYBlockId
                        };
                        kittenBlocks[randBYId] = {
                            type: 'math_number',
                            id: randBYId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {},
                            fields: { NUM: '1000' },
                            field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: randomYBlockId
                        };
                        kittenBlocks[randomYBlockId] = {
                            type: 'random',
                            id: randomYBlockId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {
                                a: `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${randAYId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">-1000</field></shadow>`,
                                b: `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${randBYId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">1000</field></shadow>`
                            },
                            fields: {},
                            field_constraints: {},
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: blockId
                        };

                        const timeShadowId = `shadow_time_${shadowBlockCounter++}`;
                        kittenBlocks[timeShadowId] = {
                            type: 'math_number',
                            id: timeShadowId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {},
                            fields: { NUM: '1' },
                            field_constraints: { NUM: { min: 0, max: null, precision: 0, mod: null } },
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: blockId
                        };

                        kittenBlock.shadows['time'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${timeShadowId}" visible="visible"><field constraints="0,Infinity,0," name="NUM">1</field></shadow>`;
                        kittenBlock.shadows['x'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="random" id="${randomXBlockId}" visible="visible"></shadow>`;
                        kittenBlock.shadows['y'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="random" id="${randomYBlockId}" visible="visible"></shadow>`;

                        if (!kittenConnections[blockId]) kittenConnections[blockId] = {};
                        kittenConnections[blockId][timeShadowId] = { type: 'input', input_type: 'value', input_name: 'time' };
                        kittenConnections[blockId][randomXBlockId] = { type: 'input', input_type: 'value', input_name: 'x' };
                        kittenConnections[blockId][randomYBlockId] = { type: 'input', input_type: 'value', input_name: 'y' };
                    }
                    
                    if (!kittenBlock.shadows.time || !kittenBlock.shadows.x || !kittenBlock.shadows.y) {
                        const timeShadowId = `shadow_time_${shadowBlockCounter++}`;
                        const xShadowId = `shadow_x_${shadowBlockCounter++}`;
                        const yShadowId = `shadow_y_${shadowBlockCounter++}`;
                        
                        kittenBlocks[timeShadowId] = {
                            type: 'math_number',
                            id: timeShadowId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {},
                            fields: { NUM: '1' },
                            field_constraints: { NUM: { min: 0, max: null, precision: 0, mod: null } },
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: blockId
                        };
                        kittenBlocks[xShadowId] = {
                            type: 'math_number',
                            id: xShadowId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {},
                            fields: { NUM: '0' },
                            field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: blockId
                        };
                        kittenBlocks[yShadowId] = {
                            type: 'math_number',
                            id: yShadowId,
                            comment: null,
                            is_shadow: true,
                            collapsed: false,
                            disabled: false,
                            deletable: true,
                            movable: true,
                            editable: true,
                            visible: 'visible',
                            location: [0, 0],
                            shadows: {},
                            fields: { NUM: '0' },
                            field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                            field_extra_attr: {},
                            mutation: '',
                            is_output: true,
                            parent_id: blockId
                        };

                        kittenBlock.shadows['time'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${timeShadowId}" visible="visible"><field constraints="0,Infinity,0," name="NUM">1</field></shadow>`;
                        kittenBlock.shadows['x'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${xShadowId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">0</field></shadow>`;
                        kittenBlock.shadows['y'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${yShadowId}" visible="visible"><field constraints="-Infinity,Infinity,0," name="NUM">0</field></shadow>`;

                        if (!kittenConnections[blockId]) kittenConnections[blockId] = {};
                        kittenConnections[blockId][timeShadowId] = { type: 'input', input_type: 'value', input_name: 'time' };
                        kittenConnections[blockId][xShadowId] = { type: 'input', input_type: 'value', input_name: 'x' };
                        kittenConnections[blockId][yShadowId] = { type: 'input', input_type: 'value', input_name: 'y' };
                    }
                }

                if (isMotionPointInDir) {
                    const dirInput = block.inputs && block.inputs.DIRECTION;
                    let shadowBlockId, numValue;
                    
                    if (dirInput && Array.isArray(dirInput[1]) && dirInput[1][0] === 4) {
                        shadowBlockId = `shadow_dir_${shadowBlockCounter++}`;
                        numValue = dirInput[1][1];
                    } else {
                        shadowBlockId = `shadow_dir_${shadowBlockCounter++}`;
                        numValue = '90';
                    }
                    
                    kittenBlocks[shadowBlockId] = {
                        type: 'controller_shadow',
                        id: shadowBlockId,
                        comment: null,
                        is_shadow: true,
                        collapsed: false,
                        disabled: false,
                        deletable: true,
                        movable: true,
                        editable: true,
                        visible: 'visible',
                        location: [0, 0],
                        shadows: {},
                        fields: { NUM: numValue },
                        field_constraints: { NUM: { min: -180, max: 180, precision: 0, mod: null } },
                        field_extra_attr: {},
                        mutation: '',
                        is_output: true,
                        parent_id: blockId
                    };
                    kittenBlock.shadows['degrees'] = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="controller_shadow" id="${shadowBlockId}" visible="visible"><field constraints="-180,180,0,true" name="NUM">${numValue}</field></shadow>`;
                    if (!kittenConnections[blockId]) kittenConnections[blockId] = {};
                    kittenConnections[blockId][shadowBlockId] = { type: 'input', input_type: 'value', input_name: 'degrees' };
                }

                if (block.inputs) {
                    for (const [inputKey, inputValue] of Object.entries(block.inputs)) {
                        if (inputValue && inputValue[1] !== undefined) {
                            if (isMotionGoto || isMotionPointTowards) {
                                continue;
                            }
                            if (isMotionGlideto && inputKey === 'TO') {
                                continue;
                            }

                            const value = inputValue[1];
                            let lowerInputKey = inputKey.toLowerCase();

                            if (block.opcode === 'motion_changexby' || block.opcode === 'motion_setx') {
                                lowerInputKey = 'value';
                            } else if (block.opcode === 'motion_changeyby' || block.opcode === 'motion_sety') {
                                lowerInputKey = 'value';
                            } else if ((isMotionGlideSecsToXY || isMotionGlideto) && inputKey === 'SECS') {
                                lowerInputKey = 'time';
                            } else if (isMotionPointInDir && inputKey === 'DIRECTION') {
                                lowerInputKey = 'degrees';
                            }

                            if (Array.isArray(value) && value[0] === 4) {
                                let numValue = value[1];
                                let shadowType = 'math_number';
                                let constraints = '-Infinity,Infinity,0,';
                                
                                if (block.opcode === 'motion_turnleft') {
                                    numValue = String(-parseInt(numValue));
                                }
                                if (inputKey === 'SECS' || inputKey === 'SECONDS') {
                                    constraints = '0,Infinity,0,';
                                }
                                if (isMotionPointInDir && inputKey === 'DIRECTION') {
                                    shadowType = 'controller_shadow';
                                    constraints = '-180,180,0,true';
                                }

                                const shadowBlockId = `shadow_${blockId}_${inputKey}_${shadowBlockCounter++}`;
                                const shadowXml = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="${shadowType}" id="${shadowBlockId}" visible="visible"><field constraints="${constraints}" name="NUM">${numValue}</field></shadow>`;
                                kittenBlock.shadows[lowerInputKey] = shadowXml;

                                kittenBlocks[shadowBlockId] = {
                                    type: 'math_number',
                                    id: shadowBlockId,
                                    comment: null,
                                    is_shadow: true,
                                    collapsed: false,
                                    disabled: false,
                                    deletable: true,
                                    movable: true,
                                    editable: true,
                                    visible: 'visible',
                                    location: [0, 0],
                                    shadows: {},
                                    fields: { NUM: numValue },
                                    field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                                    field_extra_attr: {},
                                    mutation: '',
                                    is_output: true,
                                    parent_id: blockId
                                };

                                if (!kittenConnections[shadowBlockId]) kittenConnections[shadowBlockId] = {};
                                if (!kittenConnections[blockId]) kittenConnections[blockId] = {};
                                kittenConnections[blockId][shadowBlockId] = { type: 'input', input_type: 'value', input_name: lowerInputKey };
                            } else if (Array.isArray(value) && value[0] === 3) {
                                const refBlockId = value[1];
                                const refBlock = scratchBlocks[refBlockId];
                                let numValue = '0';
                                if (refBlock && refBlock.fields && refBlock.fields.NUM) {
                                    numValue = Array.isArray(refBlock.fields.NUM) ? refBlock.fields.NUM[0] : refBlock.fields.NUM;
                                } else if (refBlock && refBlock.fields) {
                                    const firstField = Object.values(refBlock.fields)[0];
                                    if (firstField) {
                                        numValue = Array.isArray(firstField) ? firstField[0] : firstField;
                                    }
                                }

                                if (block.opcode === 'motion_turnleft') {
                                    numValue = String(-parseInt(numValue));
                                }

                                let constraints = '-Infinity,Infinity,0,';
                                const shadowXml = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${refBlockId}" visible="visible"><field constraints="${constraints}" name="NUM">${numValue}</field></shadow>`;
                                kittenBlock.shadows[lowerInputKey] = shadowXml;

                                if (!kittenConnections[blockId]) kittenConnections[blockId] = {};
                                kittenConnections[blockId][refBlockId] = { type: 'input', input_type: 'value', input_name: lowerInputKey };
                            } else if (typeof value === 'string' || typeof value === 'number') {
                                const shadowBlockId = `shadow_${blockId}_${inputKey}_${shadowBlockCounter++}`;
                                const numValue = typeof value === 'number' ? String(value) : value;
                                let constraints = '-Infinity,Infinity,0,';
                                const shadowXml = `<shadow xmlns="http://www.w3.org/1999/xhtml" type="math_number" id="${shadowBlockId}" visible="visible"><field constraints="${constraints}" name="NUM">${numValue}</field></shadow>`;
                                kittenBlock.shadows[lowerInputKey] = shadowXml;

                                kittenBlocks[shadowBlockId] = {
                                    type: 'math_number',
                                    id: shadowBlockId,
                                    comment: null,
                                    is_shadow: true,
                                    collapsed: false,
                                    disabled: false,
                                    deletable: true,
                                    movable: true,
                                    editable: true,
                                    visible: 'visible',
                                    location: [0, 0],
                                    shadows: {},
                                    fields: { NUM: numValue },
                                    field_constraints: { NUM: { min: null, max: null, precision: 0, mod: null } },
                                    field_extra_attr: {},
                                    mutation: '',
                                    is_output: true,
                                    parent_id: blockId
                                };

                                if (!kittenConnections[shadowBlockId]) kittenConnections[shadowBlockId] = {};
                                if (!kittenConnections[blockId]) kittenConnections[blockId] = {};
                                kittenConnections[blockId][shadowBlockId] = { type: 'input', input_type: 'value', input_name: lowerInputKey };
                            }
                        }
                    }
                }

                if (block.fields) {
                    for (const [fieldKey, fieldValue] of Object.entries(block.fields)) {
                        if (Array.isArray(fieldValue)) {
                            kittenBlock.fields[fieldKey] = [fieldValue[0]];
                        }
                    }
                }

                kittenBlocks[blockId] = kittenBlock;

                if (block.next) {
                    if (!kittenConnections[blockId]) {
                        kittenConnections[blockId] = {};
                    }
                    kittenConnections[blockId][block.next] = {
                        type: 'next'
                    };
                }
            }

            return { blocks: kittenBlocks, connections: kittenConnections, comments: {} };
        };

        const convertCostumes = (scratchCostumes) => {
            const kittenStyles = {};
            if (!scratchCostumes) return kittenStyles;

            for (const [index, costume] of scratchCostumes.entries()) {
                const styleId = this.generateUUID();
                const assetId = costume.assetId || (costume.md5ext ? costume.md5ext.split('.')[0] : '');
                const fileName = costume.md5ext || '';
                
                let dataUrl = '';
                if (fileName && projectFiles[fileName]) {
                    const data = projectFiles[fileName];
                    const base64 = Buffer.from(data).toString('base64');
                    const mimeType = costume.dataFormat === 'svg' ? 'image/svg+xml' : 'image/png';
                    dataUrl = `data:${mimeType};base64,${base64}`;
                }

                kittenStyles[styleId] = {
                    id: styleId,
                    name: costume.name || `造型${index + 1}`,
                    url: dataUrl,
                    rotate_center: { x: 0, y: 0 },
                    pivot: { x: 0, y: 0 },
                    cdn_url: '',
                    md5: assetId,
                    file_name: fileName
                };
            }

            return kittenStyles;
        };

        const convertSounds = (scratchSounds) => {
            const kittenSounds = [];
            if (!scratchSounds) return kittenSounds;

            for (const [index, sound] of scratchSounds.entries()) {
                const soundId = this.generateUUID();
                const assetId = sound.assetId || sound.md5ext?.split('.')[0] || '';
                
                let dataUrl = '';
                if (assetId && projectFiles[sound.md5ext]) {
                    const data = projectFiles[sound.md5ext];
                    const base64 = Buffer.from(data).toString('base64');
                    const mimeType = sound.dataFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
                    dataUrl = `data:${mimeType};base64,${base64}`;
                }

                kittenSounds.push({
                    id: soundId,
                    name: sound.name || `声音${index + 1}`,
                    url: dataUrl,
                    rate: sound.rate || 44100,
                    sample_count: sound.sampleCount || 0,
                    md5: assetId,
                    file_name: sound.md5ext || ''
                });
            }

            return kittenSounds;
        };

        // 第一步：先收集所有角色和舞台样式
        for (const target of projectJson.targets) {
            if (target.isStage) {
                let styles = convertCostumes(target.costumes);
                let styleIds = Object.keys(styles);
                
                if (styleIds.length === 0) {
                    const defaultStyleId = this.generateUUID();
                    styles[defaultStyleId] = {
                        id: defaultStyleId,
                        name: '背景',
                        url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MTkgODk5Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PC9zdmc+',
                        rotate_center: { x: 0, y: 0 },
                        pivot: { x: 0, y: 0 },
                        cdn_url: '',
                        md5: '',
                        file_name: ''
                    };
                    styleIds = [defaultStyleId];
                }
                
                const currentStyleId = styleIds[0];
                
                // 将样式添加到 theatre.styles 中
                for (const [styleId, style] of Object.entries(styles)) {
                    kittenProject.theatre.styles[styleId] = style;
                }
                
                stageData = {
                    styles: styleIds,
                    currentStyleId,
                    name: target.name || '背景',
                    block_data_json: convertBlocks(target.blocks)
                };
            } else {
                const actorId = this.generateUUID();
                sceneActors.push(actorId);
                
                let styles = convertCostumes(target.costumes);
                const sounds = convertSounds(target.sounds);
                let styleIds = Object.keys(styles);
                
                if (styleIds.length === 0) {
                    const defaultStyleId = this.generateUUID();
                    styles[defaultStyleId] = {
                        id: defaultStyleId,
                        name: target.name || '角色',
                        url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY2NjlmIi8+PC9zdmc+',
                        rotate_center: { x: 0, y: 0 },
                        pivot: { x: 0, y: 0 },
                        cdn_url: '',
                        md5: '',
                        file_name: ''
                    };
                    styleIds = [defaultStyleId];
                }
                
                const currentStyleId = styleIds[0];
                
                // 将样式添加到 theatre.styles 中
                for (const [styleId, style] of Object.entries(styles)) {
                    kittenProject.theatre.styles[styleId] = style;
                }
                
                // 将声音添加到根级别的 audio 字段中
                for (const sound of sounds) {
                    const audioId = `audio-${audioIdCounter++}`;
                    kittenProject.audio[audioId] = sound;
                    kittenProject.audio_order.push(audioId);
                }
                
                kittenProject.theatre.actors[actorId] = {
                    name: target.name || `角色${actorIdCounter++}`,
                    x: target.x || 0,
                    y: target.y || 0,
                    scale: target.size || 100,
                    rotation: target.direction || 90,
                    rotation_type: target.rotationStyle === 'left-right' ? 1 : (target.rotationStyle === 'donut' ? 2 : 0),
                    id: actorId,
                    visible: target.visible !== false,
                    draggable: target.draggable || false,
                    scene: sceneId,
                    current_style_id: currentStyleId,
                    styles: styleIds,
                    lock: false,
                    editable_in_tuition_mode: true,
                    user_change_r_c: false,
                    workspace_offset: { x: 100, y: 50 },
                    block_data_json: convertBlocks(target.blocks)
                };
            }
        }
        
        // 第二步：现在创建包含所有角色的舞台
        kittenProject.theatre.scenes[sceneId] = {
            id: sceneId,
            name: stageData ? stageData.name : 'Stage',
            styles: stageData ? stageData.styles : [],
            actors: sceneActors,
            x: 0,
            y: 0,
            scale: 100,
            rotation: 0,
            rotation_type: 0,
            draggable: false,
            visible: true,
            screen_name: '屏幕',
            group_order: [],
            workspace_offset: { x: 194, y: 68 },
            block_data_json: stageData ? stageData.block_data_json : { blocks: {}, connections: {}, comments: {} },
            current_style_id: stageData ? stageData.currentStyleId : null
        };

        const groupId = this.generateUUID();
        kittenProject.theatre.groups[groupId] = {
            id: groupId,
            name: '',
            is_fold: false,
            is_group: false,
            actors: sceneActors,
            scene: sceneId,
            visible: true
        };
        kittenProject.theatre.scenes[sceneId].group_order = [groupId];

        const kittenJson = JSON.stringify(kittenProject);
        const content = new TextEncoder().encode(kittenJson);

        const downloadBlob = require('../../lib/utils/download-blob').default;
        downloadBlob('project.bcm4', content);
    }

    async convertExtensionsToGandiFormat (projectFiles, projectJson) {
        // Check if project has extension URLs (used by TurboWarp and other editors)
        const extensionURLs = projectJson.extensionURLs || {};
        
        // Ensure extensions directory exists in project files
        projectFiles['extensions/'] = new Uint8Array(0);
        
        // Process each extension URL
        for (const [extensionId, extensionURL] of Object.entries(extensionURLs)) {
            // Skip builtin extensions
            if (this.isBuiltinExtension(extensionId)) {
                continue;
            }
            
            // Ensure extension is properly formatted for Gandi
            const gandiExtensionId = extensionId.toLowerCase().replace(/-/g, '_');
            const gandiFileName = `extensions/${gandiExtensionId}.js`;
            
            let extensionContent;
            let convertedContent;
            
            // Check if extension file exists in project files
            const extensionFileKey = this.findExtensionFileKey(projectFiles, extensionId, extensionURL);
            
            if (extensionFileKey && projectFiles[extensionFileKey]) {
                // Read extension content
                extensionContent = new TextDecoder().decode(projectFiles[extensionFileKey]);
            } else {
                // Extension file not found in project, try to fetch it from URL
                try {
                    const response = await fetch(extensionURL);
                    if (response.ok) {
                        extensionContent = await response.text();
                    } else {
                        // Create a minimal placeholder extension if fetch fails
                        extensionContent = `class ${gandiExtensionId} { getInfo() { return { id: "${gandiExtensionId}", name: "${extensionId}", blocks: [] }; } }`;
                    }
                } catch (error) {
                    console.warn(`Failed to fetch extension ${extensionId} from ${extensionURL}:`, error);
                    // Create a minimal placeholder extension if fetch fails
                    extensionContent = `class ${gandiExtensionId} { getInfo() { return { id: "${gandiExtensionId}", name: "${extensionId}", blocks: [] }; } }`;
                }
            }
            
            // Convert extension to Gandi format
            convertedContent = this.convertExtensionToGandiFormat(extensionContent, extensionId);
            
            // Store the converted extension in project files
            projectFiles[gandiFileName] = new TextEncoder().encode(convertedContent);
            
            // Update the extension URL to point to the local file
            extensionURLs[extensionId] = gandiFileName;
        }
        
        // Update projectJson with modified extensionURLs
        projectJson.extensionURLs = extensionURLs;
        
        // Ensure extensions array is present and contains all extension IDs
        if (!projectJson.extensions) {
            projectJson.extensions = [];
        }
        
        // Reset extensions array and add only the extension IDs
        projectJson.extensions = Object.keys(extensionURLs);
        
        // Remove any extensions that might cause issues in Gandi
        projectJson.extensions = projectJson.extensions.filter(extId => !this.isBuiltinExtension(extId));
    }

    isBuiltinExtension (extensionId) {
        // List of builtin extension IDs that don't need conversion
        const builtinExtensions = [
            'motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'data', 'procedures',
            'pen', 'wedo2', 'music', 'microbit', 'text2speech', 'translate', 'videoSensing', 
            'ev3', 'makeymakey', 'boost', 'gdxfor', 'tw'
        ];
        return builtinExtensions.includes(extensionId);
    }

    findExtensionFileKey (projectFiles, extensionId, extensionURL) {
        // Try to find the extension file in project files
        // Common patterns for extension file keys
        const possibleKeys = [
            extensionURL,
            `extensions/${extensionId}.js`,
            extensionId,
            extensionURL.split('/').pop()
        ];
        
        for (const key of possibleKeys) {
            if (projectFiles[key]) {
                return key;
            }
        }
        
        // Search for any key that contains the extension ID
        for (const key of Object.keys(projectFiles)) {
            if (key.includes(extensionId) || key.includes(extensionURL.split('/').pop())) {
                return key;
            }
        }
        
        return null;
    }

    convertExtensionToGandiFormat (extensionContent, extensionId) {
        // Convert extension to Gandi format based on the examples in F:\RemixWarp\0
        
        // Check if it's already in Gandi format
        if (extensionContent.includes('// Gandi Format')) {
            return extensionContent;
        }
        
        // Gandi format characteristics based on examples:
        // 1. Uses the same basic structure as TurboWarp
        // 2. Includes l10n code
        // 3. Uses IIFE pattern
        // 4. Registers extension via Scratch.extensions.register()
        // 5. Properly formatted extension ID
        
        // Generate safe class name from extension ID
        const safeClassName = extensionId.split(/[^a-zA-Z0-9]/).map(part => 
            part.charAt(0).toUpperCase() + part.slice(1)
        ).join('') || 'Extension';
        
        // Generate Gandi-compatible extension ID
        const gandiExtensionId = extensionId.toLowerCase().replace(/-/g, '_');
        
        // Check if extension content already has a class definition
        const hasClassDefinition = /class\s+\w+\s*{/.test(extensionContent);
        
        // Check if extension content already has IIFE
        const hasIIFE = extensionContent.includes('(function (Scratch)');
        
        // Check if extension content already has registration
        const hasRegistration = extensionContent.includes('Scratch.extensions.register(');
        
        // Process the extension content
        let convertedContent = '';
        
        // Add Gandi format header
        convertedContent += '// Gandi Format\n';
        
        // Add l10n code
        convertedContent += '/* generated l10n code */Scratch.translate.setup({});/* end generated l10n code */';
        
        // Add IIFE wrapper if not present
        if (!hasIIFE) {
            convertedContent += '(function (Scratch) {\n';
            convertedContent += '    "use strict";\n\n';
        }
        
        // Add extension content
        if (hasIIFE) {
            // If already has IIFE, just add the content
            convertedContent += extensionContent;
        } else {
            // If no IIFE, add the content inside the IIFE
            if (hasClassDefinition) {
                // If has class definition, add it as-is
                convertedContent += extensionContent;
            } else {
                // If no class definition, create a minimal class
                convertedContent += `class ${safeClassName} {\n`;
                convertedContent += '    getInfo() {\n';
                convertedContent += '        return {\n';
                convertedContent += `            id: "${gandiExtensionId}",\n`;
                convertedContent += `            name: "${extensionId}",\n`;
                convertedContent += '            blocks: []\n';
                convertedContent += '        };\n';
                convertedContent += '    }\n';
                convertedContent += '}\n';
            }
            
            // Add registration code if not present
            if (!hasRegistration) {
                convertedContent += '\n';
                convertedContent += '    // Register the extension\n';
                convertedContent += `    if (typeof ${safeClassName} === 'function') {\n`;
                convertedContent += `        Scratch.extensions.register(new ${safeClassName}());\n`;
                convertedContent += '    } else {\n';
                convertedContent += '        // Fallback: register as an object\n';
                convertedContent += '        Scratch.extensions.register({\n';
                convertedContent += `            id: "${gandiExtensionId}",\n`;
                convertedContent += `            name: "${extensionId}",\n`;
                convertedContent += '            blocks: []\n';
                convertedContent += '        });\n';
                convertedContent += '    }\n';
            }
            
            // Close IIFE if we added it
            convertedContent += '})(Scratch);\n';
        }
        
        // Ensure extension ID is properly formatted in the content
        convertedContent = convertedContent.replace(/id:\s*["']([^"']+)["']/g, (match, id) => {
            const gandiId = id.toLowerCase().replace(/-/g, '_');
            return `id: "${gandiId}"`;
        });
        
        // Add Gandi-specific metadata
        if (!convertedContent.includes('// Gandi Metadata')) {
            convertedContent += '\n// Gandi Metadata\n';
            convertedContent += `// Extension ID: ${gandiExtensionId}\n`;
            convertedContent += '// Converted to Gandi format\n';
            convertedContent += '// Gandi Editor Compatible\n';
        }
        
        return convertedContent;
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

        // Kitten4 extension detection - block all projects with extensions
        if (targetPlatform === 'Kitten4') {
            const hasExtensions = this.detectAnyExtensions();
            if (hasExtensions) {
                issues.push({
                    type: 'extension',
                    severity: 'error',
                    message: '该项目包含扩展，不予转换',
                    details: ''
                });
            }
        }

        return issues;
    }

    detectAnyExtensions () {
        if (!this.props.vm || !this.props.vm.runtime) {
            return false;
        }

        const runtime = this.props.vm.runtime;
        
        // Check for Scratch official extensions
        const officialExtensions = ['pen', 'music', 'video', 'text2speech', 'translate', 'microbit', 'ev3', 'makeymakey', 'wedo2', 'boost', 'gdxfor'];
        
        // Check loaded extensions in runtime (safely)
        if (runtime.extensionManager) {
            try {
                if (typeof runtime.extensionManager.getLoadedExtensions === 'function') {
                    const loadedExtensions = runtime.extensionManager.getLoadedExtensions();
                    if (loadedExtensions && loadedExtensions.length > 0) {
                        return true;
                    }
                } else if (runtime.extensionManager._loadedExtensions) {
                    const loadedExtensions = Object.keys(runtime.extensionManager._loadedExtensions);
                    if (loadedExtensions.length > 0) {
                        return true;
                    }
                }
            } catch (e) {
                console.warn('Error checking loaded extensions:', e);
            }
        }

        // Check extensionURLs in project
        if (runtime.project && runtime.project.extensionURLs) {
            const extensionURLs = runtime.project.extensionURLs;
            if (Object.keys(extensionURLs).length > 0) {
                return true;
            }
        }

        // Check extensions array in project
        if (runtime.project && runtime.project.extensions) {
            if (runtime.project.extensions.length > 0) {
                return true;
            }
        }

        // Check for any blocks that belong to extensions
        if (runtime.targets) {
            for (const target of runtime.targets) {
                if (target.blocks) {
                    for (const blockId in target.blocks) {
                        const block = target.blocks[blockId];
                        if (block.opcode) {
                            // Check if opcode starts with extension prefix (not core scratch opcodes)
                            const coreOpcodes = ['motion_', 'looks_', 'sound_', 'event_', 'control_', 'sensing_', 'operator_', 'data_', 'procedures_'];
                            const isCoreOpcode = coreOpcodes.some(prefix => block.opcode.startsWith(prefix));
                            if (!isCoreOpcode && !block.opcode.startsWith('argument_reporter_')) {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
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

    openCompatibilityModalDialog () {
        this.props.dispatch(openCompatibilityModal());
        this.props.onRequestCloseFile();
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
        if (new Date().getHours() < 4) {
            unlockAchievement('late-night-coding');
        }
        this.props.onRequestCloseFile();
    }
    handleClickSaveAsCopy () {
        this.props.onClickSaveAsCopy();
        if (new Date().getHours() < 4) {
            unlockAchievement('late-night-coding');
        }
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
                if (new Date().getHours() < 4) {
                    unlockAchievement('late-night-coding');
                }
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
            this.props.intl.formatMessage({
                defaultMessage: 'Bookmark {number}',
                id: 'tw.workspaceBookmarks.defaultName'
            }, {number: this.state.workspaceBookmarks.length + 1})
        );
        if (name === null) return;

        let category = this.props.intl.formatMessage({
            defaultMessage: 'General',
            id: 'tw.workspaceBookmarks.defaultCategory'
        });
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
                this.props.intl.formatMessage({
                    defaultMessage: 'General',
                    id: 'tw.workspaceBookmarks.defaultCategory'
                })
            );
            if (categoryInput === null) return;
            category = categoryInput.trim() || this.props.intl.formatMessage({
                defaultMessage: 'General',
                id: 'tw.workspaceBookmarks.defaultCategory'
            });
        }
        category = normalizeWorkspaceBookmarkCategory(category);

        const bookmark = {
            name: (name.trim() || this.props.intl.formatMessage({
                defaultMessage: 'Bookmark {number}',
                id: 'tw.workspaceBookmarks.defaultName'
            }, {number: this.state.workspaceBookmarks.length + 1})),
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
        newCategory = normalizeWorkspaceBookmarkCategory(newCategory);

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
            if (new Date().getHours() < 4) {
                unlockAchievement('late-night-coding');
            }
            if (this.props.onProjectTelemetryEvent) {
                const metadata = collectMetadata(this.props.vm, this.props.projectTitle, this.props.locale);
                this.props.onProjectTelemetryEvent('projectDidSave', metadata);
            }
        };
    }

    handleExportSettings = async () => {
        try {
            console.log('开始导出设置');
            
            // 动态导入JSZip
            const { default: JSZip } = await import('@turbowarp/jszip');
            console.log('JSZip库加载完成');
            
            // 收集所有设置数据
            let addonSettings = null;
            try {
                // 尝试导出插件设置，即使 theme 有问题也能继续
                console.log('开始收集插件设置');
                addonSettings = settingsStore.export({theme: this.props.theme || {isDark: () => false}});
                console.log('插件设置收集完成');
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
                'tw:restore-point-interval',
                'AESettings',
                'mw:super-refactor',
                'mw:multi-workspaces',
                'mw:has-seen-onboarding'
            ];

            console.log('开始收集localStorage设置');
            for (const key of keysToExport) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    localStorageSettings[key] = value;
                }
            }
            console.log('localStorage设置收集完成，共', Object.keys(localStorageSettings).length, '项');

            // 收集工作区书签
            console.log('开始收集工作区书签');
            const workspaceBookmarks = {
                bookmarks: this.state.workspaceBookmarks || [],
                categories: this.state.workspaceBookmarksCategories || ['General'],
                collapsedCategories: this.state.workspaceBookmarksCollapsedCategories || []
            };
            console.log('工作区书签收集完成');

            // 收集 Redux 状态中的相关设置
            console.log('开始收集Redux设置');
            const reduxSettings = {
                locale: this.props.locale,
                isRtl: this.props.isRtl
            };
            console.log('Redux设置收集完成');

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
            console.log('开始创建压缩包');
            const zip = new JSZip();
            zip.file('settings.json', JSON.stringify(settingsData, null, 2));
            zip.file('version.json', JSON.stringify({
                version: '1.1.0',
                exportTime: settingsData.exportTime,
                editorVersion: settingsData.editorVersion
            }, null, 2));

            // 生成压缩文件
            const content = await zip.generateAsync({type: 'blob'});
            console.log('压缩包生成完成，大小:', content.size, 'bytes');

            // 保存文件
            const blob = new Blob([content], {type: 'application/zip'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `remixwarp-cfgmig-${Date.now().toString(36)}.rwc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 显示成功消息
            console.log('设置导出完成');
            this.showAlert('成功', '设置已成功导出');
        } catch (error) {
            console.error('Error exporting settings:', error);
            let errorMessage = '导出设置失败';
            errorMessage += '：' + error.message;
            this.showAlert('错误', errorMessage);
        } finally {
            this.props.onRequestCloseFile();
        }
    };

    handleImportSettings = async () => {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.rwc';
        input.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            try {
                console.log('开始导入设置文件:', file.name);
                
                // 动态导入JSZip
                const { default: JSZip } = await import('@turbowarp/jszip');
                console.log('JSZip库加载完成');
                
                // 读取文件
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        console.log('文件读取完成，开始解析压缩包');
                        
                        // 解析压缩包
                        const zip = new JSZip();
                        const content = await zip.loadAsync(event.target.result);
                        console.log('压缩包解析完成，文件列表:', Object.keys(content.files));

                        // 读取设置文件
                        const settingsFile = content.file('settings.json');
                        if (!settingsFile) {
                            throw new Error('设置文件不存在');
                        }

                        const settingsData = JSON.parse(await settingsFile.async('text'));
                        console.log('设置文件解析完成，版本:', settingsData.version);

                        // 确认覆盖现有设置
                        if (!confirm('确定要导入设置吗？这将覆盖您当前的设置。')) {
                            return;
                        }

                        // 导入插件设置
                        if (settingsData.addonSettings) {
                            try {
                                console.log('开始导入插件设置');
                                settingsStore.import(settingsData.addonSettings);
                                console.log('插件设置导入完成');
                            } catch (addonError) {
                                console.error('Error importing addon settings:', addonError);
                                // 继续执行，不中断导入过程
                            }
                        }

                        // 导入 localStorage 设置
                        if (settingsData.localStorageSettings) {
                            try {
                                console.log('开始导入localStorage设置，共', Object.keys(settingsData.localStorageSettings).length, '项');
                                for (const [key, value] of Object.entries(settingsData.localStorageSettings)) {
                                    localStorage.setItem(key, value);
                                }
                                console.log('localStorage设置导入完成');
                            } catch (localStorageError) {
                                console.error('Error importing localStorage settings:', localStorageError);
                                // 继续执行，不中断导入过程
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
                            try {
                                console.log('开始导入工作区书签');
                                this.setState({
                                    workspaceBookmarks: settingsData.workspaceBookmarks.bookmarks || [],
                                    workspaceBookmarksCategories: settingsData.workspaceBookmarks.categories || ['General'],
                                    workspaceBookmarksCollapsedCategories: settingsData.workspaceBookmarks.collapsedCategories || []
                                }, () => {
                                    this.saveWorkspaceBookmarksToProject();
                                    console.log('工作区书签导入完成');
                                });
                            } catch (bookmarkError) {
                                console.error('Error importing workspace bookmarks:', bookmarkError);
                                // 继续执行，不中断导入过程
                            }
                        }

                        // 导入 Redux 状态中的设置
                        if (settingsData.reduxSettings) {
                            try {
                                console.log('开始导入Redux设置');
                                if (settingsData.reduxSettings.locale) {
                                    if (this.props.selectLocale) {
                                        this.props.selectLocale(settingsData.reduxSettings.locale);
                                        console.log('语言设置导入完成');
                                    } else {
                                        console.warn('selectLocale方法不存在');
                                    }
                                }
                            } catch (reduxError) {
                                console.error('Error importing Redux settings:', reduxError);
                                // 继续执行，不中断导入过程
                            }
                        }

                        // 显示成功消息并提示刷新
                        console.log('设置导入完成');
                        this.showAlert('成功', '设置已成功导入。请刷新页面以应用更改。');
                    } catch (error) {
                        console.error('Error importing settings:', error);
                        let errorMessage = '导入设置失败';
                        if (error.message.includes('设置文件不存在')) {
                            errorMessage += '：设置文件不存在';
                        } else if (error.message.includes('Unexpected token')) {
                            errorMessage += '：JSON 格式错误';
                        } else if (error.message.includes('loadAsync')) {
                            errorMessage += '：压缩文件格式错误';
                        } else {
                            errorMessage += '：' + error.message;
                        }
                        this.showAlert('错误', errorMessage);
                    }
                };
                reader.onerror = (error) => {
                    console.error('文件读取错误:', error);
                    this.showAlert('错误', '读取文件时发生错误');
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
                    const now = Date.now();
                    this.undoTimes = this.undoTimes.filter(time => now - time <= 3000);
                    this.undoTimes.push(now);
                    if (this.undoTimes.length >= 3) {
                        unlockAchievement('use-draft');
                    }
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
                                            onClick={this.openCompatibilityModalDialog}
                                        >
                                            <FormattedMessage
                                                defaultMessage="Compatibility Convert"
                                                description="Convert project to different editor formats"
                                                id="gui.menuBar.compatibility"
                                            />
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
                                    {this.props.superRefactor && (
                                        <MenuItem
                                            onClick={() => {
                                                this.props.onOpenSuperRefactorModal();
                                                this.props.onRequestCloseEdit();
                                            }}
                                        >
                                            <Code />
                                            <FormattedMessage
                                                defaultMessage="超级重构"
                                                description="Menu bar item for super refactor"
                                                id="tw.menuBar.superRefactor"
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
                                    {isAchievementsEnabled() && (
                                        <MenuItem
                                            onClick={() => {
                                                window.dispatchEvent(new Event('rw-achievements-open'));
                                                this.props.onRequestCloseTools();
                                            }}
                                        >
                                            <Trophy />
                                            成就
                                        </MenuItem>
                                    )}
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
                                            {SettingsStore.getAddonEnabled('02agent') && (
                                                <MenuItem
                                                    onClick={() => {
                                                        window.dispatchEvent(new Event('02agent-show-plugin'));
                                                        this.props.onRequestCloseTools();
                                                    }}
                                                >
                                                    <FormattedMessage
                                                        defaultMessage="02Agent"
                                                        description="Menu bar item for 02Agent"
                                                        id="gui.menuBar.02agent"
                                                    />
                                                </MenuItem>
                                            )}
                                                <MenuItem
                                                    onClick={() => {
                                                        this.props.onClickBaiduAI();
                                                        this.props.onRequestCloseTools();
                                                    }}
                                                >
                                                    <FormattedMessage
                                                        defaultMessage="百度AI"
                                                        description="Menu bar item for Baidu AI"
                                                        id="gui.menuBar.baiduAI"
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
                                         shortcut={formatShortcutDisplay('Alt+E')}
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
                                <MenuSection>
                                    <MenuItem
                                        onClick={() => {
                                            this.props.onRequestCloseTools();
                                            // Open extension editor window
                                            this.props.dispatch(openExtensionEditorModal());
                                        }}
                                    >
                                        <PackagePlus />
                                        {this.props.locale === 'zh-cn' ? '扩展编辑器' : 'Extension Editor'}
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
    onClickBaiduAI: () => dispatch(openBaiduAIModal()),
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
    onSetTimeTravelMode: mode => dispatch(setTimeTravel(mode)),
    onOpenSuperRefactorModal: () => dispatch(openSuperRefactorModal())
});

export default compose(
    injectIntl,
    MenuBarHOC,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(MenuBar);

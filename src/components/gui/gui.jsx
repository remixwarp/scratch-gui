import classNames from 'classnames';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo, Suspense} from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';
import MediaQuery from 'react-responsive';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import tabStyles from 'react-tabs/style/react-tabs.css';
import VM from 'scratch-vm';
import {AESettings} from '../../lib/settings.js';
import Blocks from '../../containers/blocks.jsx';
import MultiWorkspaces from '../../components/blocks/multi-workspaces.jsx';
import CostumeTab from '../../containers/costume-tab.jsx';
import SoundTab from '../../containers/sound-tab.jsx';
const ExtensionLibrary = React.lazy(() => import('../../containers/extension-library.jsx'));
import TargetPane from '../../containers/target-pane.jsx';
import StageWrapper from '../../containers/stage-wrapper.jsx';
import Loader from '../loader/loader.jsx';
import Box from '../box/box.jsx';
import MenuBar from '../menu-bar/menu-bar.jsx';
import CostumeLibrary from '../../containers/costume-library.jsx';
import SoundLibrary from '../../containers/sound-library.jsx';
import BackdropLibrary from '../../containers/backdrop-library.jsx';
import Watermark from '../../containers/watermark.jsx';

import Backpack from '../../containers/backpack.jsx';

import BrowserModal from '../browser-modal/browser-modal.jsx';
import TipsLibrary from '../../containers/tips-library.jsx';
import Cards from '../../containers/cards.jsx';
import Alerts from '../../containers/alerts.jsx';
import NotificationsProvider from '../../lib/notifications-provider.jsx';
import DragLayer from '../../containers/drag-layer.jsx';
import ConnectionModal from '../../containers/connection-modal.jsx';
import CollaborationContainer from '../../containers/collaboration-container.jsx';
import CollabLoader from '../collab-loader/collab-loader.jsx';
import TWSecurityManager from '../../containers/tw-security-manager.jsx';
import TWExtensionLoadChoiceModal from '../../containers/tw-extension-load-choice-modal.jsx';
import TWRestorePointManager from '../../containers/tw-restore-point-manager.jsx';
const TWUnknownPlatformModal = React.lazy(() => import('../../containers/tw-unknown-platform-modal.jsx'));
const TWInvalidProjectModal = React.lazy(() => import('../../containers/tw-invalid-project-modal.jsx'));
const TWGitModal = React.lazy(() => import('../../containers/mw-git-modal.jsx'));
const MWExtensionManagerModal = React.lazy(() => import('../../containers/mw-extension-manager-modal.jsx'));
const MWProjectThemeModal = React.lazy(() => import('../../containers/mw-project-theme-modal.jsx'));
import ShortcutManager from '../shortcut-manager/shortcut-manager.jsx';
import AIModal from '../../containers/ai-modal.jsx';
import AIChatModal from '../../containers/ai-chat-modal.jsx';
import AIAgentModal from '../../containers/ai-agent-modal.jsx';
import BaiduAIModal from '../../containers/baidu-ai-modal.jsx';
import ExtensionEditorModal from '../../containers/extension-editor-modal.jsx';
const SuperRefactorModal = React.lazy(() => import('../../containers/super-refactor-modal.jsx'));
const CompatibilityModal = React.lazy(() => import('../../containers/tv-compatibility-modal.jsx'));
import RoturSession from '../../containers/rotur-session.jsx';
import RoturExtensionHost from '../../containers/rotur-extension-host.jsx';
const CustomGalleryModal = React.lazy(() => import('../../containers/custom-gallery-modal.jsx'));
import MWHelpModal from '../../components/mw-help-modal/help-modal.jsx';
import RoturLoginModal from '../mw-rotur-login-modal/rotur-login-modal.jsx';
import Avatar from '../mw-avatar/avatar.jsx';
import {closeRoturLoginModal, openRoturLoginModal} from '../../reducers/modals.js';
import {openAccountMenu} from '../../reducers/menus.js';

import SimpleDialog from '../../containers/simple-dialog.jsx';
const TutorialModal = React.lazy(() => import('../../containers/tutorial-modal.jsx'));
const VideoModal = React.lazy(() => import('../../containers/video-modal.jsx'));
const UpdateLogModal = React.lazy(() => import('../../containers/update-log-modal.jsx'));
const BilmeModal = React.lazy(() => import('../../containers/bl-bilme-modal.jsx'));
const WarpthemeModal = React.lazy(() => import('../../containers/warptheme-modal.jsx'));
import GandiHelp from '../gandi-help/gandi-help.jsx';
import AEReadMe from '../../containers/ae-readme.jsx'
import { loadData } from '../ae-readme/ae-readme.jsx'
const CustomThemeModal = React.lazy(() => import('../../containers/tw-custom-theme-modal.jsx'));
import { openReadme } from '../../reducers/modals.js';

// Heavy modal / panel components that are not shown on the initial editor
// load. Lazy-loading them removes their code (and transitive dependencies)
// from the main bundle, shrinking the first-paint JavaScript payload.
const TWSettingsModal = React.lazy(() => import('../../containers/tw-settings-modal.jsx'));
const TWCustomExtensionModal = React.lazy(() => import('../../containers/tw-custom-extension-modal.jsx'));
const TWFontsModal = React.lazy(() => import('../../containers/tw-fonts-modal.jsx'));
const MWAssetsModal = React.lazy(() => import('../../containers/mw-assets-modal.jsx'));
const MWProjectMetadataModal = React.lazy(() => import('../../containers/mw-project-metadata-modal.jsx'));
const TWDebugger = React.lazy(() => import('../../containers/tw-debugger.jsx'));
const TWUsernameModal = React.lazy(() => import('../../containers/tw-username-modal.jsx'));
const TelemetryModal = React.lazy(() => import('../telemetry-modal/telemetry-modal.jsx'));

const Settings = new AESettings();
import AddonHooks from '../../addons/hooks.js';
import NativeFindBar from '../find-bar/find-bar.jsx';
import Onboarding from '../../containers/onboarding.jsx';
import BlockCounter from '../../components/block-counter/block-counter.jsx';
import StatusBar from '../../components/status-bar/status-bar.jsx';
import {recordSponsorIntent, isAchievementsEnabled} from '../../lib/achievements.js';
import AchievementTracker from '../achievements/achievement-tracker.jsx';
import Achievements from '../achievements/achievements.jsx';

import {STAGE_SIZE_MODES, FIXED_WIDTH, UNCONSTRAINED_NON_STAGE_WIDTH} from '../../lib/constants/layout-constants';
import {resolveStageSize} from '../../lib/utils/screen';
import {Theme} from '../../lib/themes';

import {setStageSize} from '../../reducers/stage-size';
import {showOnboarding} from '../../reducers/onboarding';
import {COSTUMES_TAB_INDEX, SOUNDS_TAB_INDEX} from '../../reducers/editor-tab';
import CommandPalette from '../command-palette/command-palette.jsx';
import {
    openGitModal,
    openAIAgentModal,
    openAssetsModal,
    openHelp,
    openProjectMetadataModal,
    openDebuggerModal,
    closeAssetsModal,
    closeHelpModal,
    closeProjectMetadataModal,
    closeDebuggerModal,
    MODAL_CUSTOM_GALLERY,
    MODAL_ASSETS,
    MODAL_HELP,
    MODAL_DEBUGGER,
    MODAL_PROJECT_METADATA
} from '../../reducers/modals.js';
import {openWorkspaceBookmarksMenu} from '../../reducers/menus.js';
import MWCommandPalette from '../../containers/mw-command-palette.jsx';
import {openCollaborationModal} from '../../reducers/collaboration.js';
import SettingsStore from '../../addons/settings-store-singleton.js';
import {getVisibleOrderedIds as getActivityBarVisibleIds} from '../../lib/mw-activity-bar-layout.js';
import {loadPanelState, savePanelState, setPanelStateEvent} from '../../lib/mw-panels-store.js';
import MWPanelBarContainer from '../../containers/mw-panel-bar.jsx';
import {
    GitBranch,
    ListTodo,
    Handshake,
    Trophy,
    Bookmark,
    PackagePlus,
    Sparkles,
    Settings as SettingsIcon,
    Puzzle,
    LogIn,
    CircleAlert,
    Terminal
} from 'lucide-react';

import {isRendererSupported, isBrowserSupported} from '../../lib/utils/tw-environment-support-prober.js';

import styles from './gui.css';

/* 检测设置 */

if (localStorage.getItem('AESettings') === "undefined" || localStorage.getItem('AESettings') === undefined) {
    Settings.reset()
}
const storedSettings = localStorage.getItem('AESettings');
let initialVSCodeLayout = false;
try {
    initialVSCodeLayout = JSON.parse(storedSettings).EnableVSCodeLayout;
} catch (e) {
    initialVSCodeLayout = false;
}

// Donation modal component
const DonationModal = ({visible, onClose, count}) => {
    if (!visible) return null;
    
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                maxWidth: '450px',
                width: '90%',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                position: 'relative'
            }}>
                {/* Close button (X) in top right */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '15px',
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#666'
                    }}
                >
                    ×
                </button>
                
                <h2 style={{marginTop: 0, color: '#333', textAlign: 'center'}}>感谢使用 RemixWarp！</h2>
                <p style={{color: '#555', lineHeight: '1.5'}}>您已经启动了 <strong>{count}</strong> 次编辑器。</p>
                <p style={{color: '#555', lineHeight: '1.5'}}>如果您喜欢这个编辑器，考虑通过捐款来支持我们的开发工作。</p>
                
                <div style={{margin: '30px 0', textAlign: 'center'}}>
                    <a 
                        href="./donate.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={recordSponsorIntent}
                        style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            backgroundColor: '#75C1C4',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            transition: 'background-color 0.3s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#5a9ea1'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#75C1C4'}
                    >
                        立即捐款
                    </a>
                </div>
                
                <div style={{textAlign: 'center'}}>
                    <button 
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#f5f5f5',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#666',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#e0e0e0';
                            e.target.style.borderColor = '#ccc';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = '#f5f5f5';
                            e.target.style.borderColor = '#ddd';
                        }}
                    >
                        但我不要
                    </button>
                </div>
            </div>
        </div>
    );
};

const messages = defineMessages({
    addExtension: {
        id: 'gui.gui.addExtension',
        description: 'Button to add an extension in the target pane',
        defaultMessage: 'Add Extension'
    }
});

import {
    Blocks as BlocksIcon,
    PaintbrushVertical as CostumesIcon,
    Volume2 as SoundsIcon,
    PackagePlus as ExtensionIcon
} from 'lucide-react';

const getFullscreenBackgroundColor = () => {
    const params = new URLSearchParams(location.search);
    if (params.has('fullscreen-background')) {
        return params.get('fullscreen-background');
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return '#111';
    }
    return 'white';
};

const fullscreenBackgroundColor = getFullscreenBackgroundColor();

const AUTO_SMALL_STAGE_INNER_WIDTH = Math.round(FIXED_WIDTH);
const AUTO_RESTORE_STAGE_INNER_WIDTH = Math.round(FIXED_WIDTH * 0.875);
const MIN_EDITOR_PANE_WIDTH = 598;
const MIN_TARGET_PANE_HEIGHT = 180;
const HIDE_STAGE_DRAG_SLOP = 80;
const STAGE_RESIZER_WIDTH = 6;
const MIN_STAGE_PANEL_WIDTH = (FIXED_WIDTH * 0.5) + 18;

const cachedStyleValues = new WeakMap();

const getCachedBorderWidth = element => {
    if (!element) return 2;
    
    const cached = cachedStyleValues.get(element);
    if (typeof cached !== 'undefined') return cached;
    
    const computedStyle = window.getComputedStyle(element);
    const borderLeft = Number.parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(computedStyle.borderRightWidth) || 0;
    const total = borderLeft + borderRight;
    const result = (!Number.isFinite(total) || total < 0) ? 2 : total;
    
    cachedStyleValues.set(element, result);
    return result;
};

const GUIComponent = props => {
    const [showDonationModal, setShowDonationModal] = useState(false);
    const [donationCount, setDonationCount] = useState(0);
    const [multiWorkspacesEnabled, setMultiWorkspacesEnabled] = useState(() => {
        try {
            const stored = localStorage.getItem('mw:multi-workspaces');
            if (stored === null) {
                // 首次访问，默认启用多工作区
                localStorage.setItem('mw:multi-workspaces', 'true');
                return true;
            }
            return stored === 'true';
        } catch (e) {
            return true;
        }
    });
    
    const [vscodeLayout, setVSCodeLayout] = useState(initialVSCodeLayout);
    // 命令面板开关状态
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    useEffect(() => {
        const handleToggle = () => setCommandPaletteOpen(prev => !prev);
        window.addEventListener('rw-command-palette-toggle', handleToggle);
        return () => window.removeEventListener('rw-command-palette-toggle', handleToggle);
    }, []);
    // 底部面板栏状态（问题/控制台）—— 显隐、当前面板、高度持久化
    const [panelState, setPanelState] = useState(loadPanelState);
    useEffect(() => {
        savePanelState(panelState);
        setPanelStateEvent(panelState);
    }, [panelState]);
    useEffect(() => {
        const handlePanelToggle = e => {
            const panel = e.detail && e.detail.panel;
            setPanelState(prev => {
                if (!panel) {
                    return {...prev, visible: false};
                }
                if (prev.visible && prev.active === panel) {
                    return {...prev, visible: false};
                }
                return {...prev, visible: true, active: panel};
            });
        };
        window.addEventListener('mw-panel-toggle', handlePanelToggle);
        return () => window.removeEventListener('mw-panel-toggle', handlePanelToggle);
    }, []);
    // 活动栏按钮配置变化时触发重渲染（开关/顺序）
    const [_activityBarVersion, setActivityBarVersion] = useState(0);
    useEffect(() => {
        const onChange = () => setActivityBarVersion(v => v + 1);
        window.addEventListener('mw-activity-bar-changed', onChange);
        return () => window.removeEventListener('mw-activity-bar-changed', onChange);
    }, []);
    const [enableBlockCounter, setEnableBlockCounter] = useState(() => {
        try {
            const stored = localStorage.getItem('AESettings');
            return stored ? JSON.parse(stored).EnableBlockCounter : false;
        } catch (e) {
            return false;
        }
    });
    const [enableStatusBar, setEnableStatusBar] = useState(() => {
        try {
            const stored = localStorage.getItem('AESettings');
            return stored ? JSON.parse(stored).EnableStatusBar : false;
        } catch (e) {
            return false;
        }
    });
    const [windowAnimation, setWindowAnimation] = useState(() => {
        try {
            return localStorage.getItem('mw:window-animation') !== 'false';
        } catch (e) {
            return true;
        }
    });
    
    const {
        accountNavOpen,
        activeTabIndex,
        alertsVisible,
        authorId,
        authorThumbnailUrl,
        authorUsername,
        basePath,
        backdropLibraryVisible,
        backpackHost,
        backpackVisible,
        blocksId,
        blocksTabVisible,
        cardsVisible,
        canChangeLanguage,
        canChangeTheme,
        canCreateNew,
        canEditTitle,
        canManageFiles,
        canRemix,
        canSave,
        canCreateCopy,
        canShare,
        canUseCloud,
        children,
        connectionModalVisible,
        costumeLibraryVisible,
        soundLibraryVisible,
        costumesTabVisible,
        customStageSize,
        enableCommunity,
        intl,
        extensionLibraryVisible,
        isCreating,
        isEmbedded,
        isFullScreen,
        isPlayerOnly,
        isRtl,
        isShared,
        isWindowFullScreen,
        isTelemetryEnabled,
        isTotallyNormal,
        loading,
        locale,
        logo,
        renderLogin,
        roturLoginModalVisible,
        roturUsername,
        onRequestCloseRoturLogin,
        onClickAbout,
        onClickAccountNav,
        onCloseAccountNav,
        onClickAddonSettings,
        onClickDesktopSettings,
        onClickNewWindow,
        onClickPackager,
        onLogOut,
        onOpenExtensionLibrary,
        onOpenExtensionManagerModal,
        onOpenRegistration,
        onToggleLoginOpen,
        onActivateCostumesTab,
        onActivateSoundsTab,
        onActivateTab,
        onClickLogo,
        onExtensionButtonClick,
        onOpenCustomExtensionModal,
        onOpenCustomGalleryModal,
        onProjectTelemetryEvent,
        onRequestCloseBackdropLibrary,
        onRequestCloseCostumeLibrary,
        onRequestCloseExtensionLibrary,
        onRequestCloseSoundLibrary,
        onRequestCloseTelemetryModal,
        onSeeCommunity,
        onSetStageSize: _onSetStageSize,
        onSetFullScreen: _onSetFullScreen,
        onShare,
        onShowPrivacyPolicy,
        onStartSelectingFileUpload,
        onTelemetryModalCancel,
        onTelemetryModalOptIn,
        onTelemetryModalOptOut,
        securityManager,
        showComingSoon,
        showOpenFilePicker,
        showSaveFilePicker,
        soundsTabVisible,
        stageSizeMode,
        targetIsStage,
        telemetryModalVisible,
        theme,
        tipsLibraryVisible,
        onOpenOnboarding,
        onboardingVisible,
        usernameModalVisible,
        settingsModalVisible,
        customExtensionModalVisible,
        extensionLoadChoiceModalVisible,
        extensionLoadChoiceData,
        fontsModalVisible,
        unknownPlatformModalVisible,
        invalidProjectModalVisible,
        gitModalVisible,
        customGalleryModalVisible,
        assetsModalVisible,
        helpModalVisible,
        helpEntry,
        projectMetadataModalVisible,
        debuggerModalVisible,
        shortcutManagerModalVisible,
        editingTarget,
        vm,
        // SBFileUploaderHOC props
        requestProjectUpload,
        onLoadingStarted,
        onLoadingFinished,
        onLoadingFailed,
        onSetProjectTitle,
        loadingState,
        // AstraEditor features
        customThemeVisible,
        readmeModalVisible,
        onOpenReadme,
        // Props that should not be passed to Box
        gandiHelpModal,
        onOpenInvalidProjectModal,
        enableStageResize: _enableStageResize,
        onOpenAssetsModal,
        ...componentProps
    } = omit(props, 'dispatch');
    
    // Log all props for debugging
    useEffect(() => {
        console.log('GUIComponent props:', {
            requestProjectUpload: !!requestProjectUpload,
            onLoadingStarted: !!onLoadingStarted,
            onLoadingFinished: !!onLoadingFinished,
            onLoadingFailed: !!onLoadingFailed,
            onSetProjectTitle: !!onSetProjectTitle,
            loadingState: loadingState,
            vm: !!vm,
            onStartSelectingFileUpload: !!onStartSelectingFileUpload
        });
    }, [requestProjectUpload, onLoadingStarted, onLoadingFinished, onLoadingFailed, onSetProjectTitle, loadingState, vm, onStartSelectingFileUpload]);


    
    useEffect(() => {
        const printLogo = () => {
            console.log(`
 ██████╗ ███████╗███╗   ███╗██╗██╗  ██╗    ██╗    ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██╔════╝████╗ ████║██║╚██╗██╔╝    ██║    ██║██╔══██╗██╔══██╗██╔══██╗
 ██████╔╝█████╗  ██╔████╔██║██║ ╚███╔╝     ██║ █╗ ██║███████║██████╔╝██████╔╝
 ██╔══██╗██╔══╝  ██║╚██╔╝██║██║ ██╔██╗     ██║███╗██║██╔══██║██╔══██╗██╔═══╝ 
 ██║  ██║███████╗██║ ╚═╝ ██║██║██╔╝ ██╗    ╚███╔███╔╝██║  ██║██║  ██║██║     
 ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝╚═╝  ╚═╝     ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝      
`);
        };
        
        const timer = setTimeout(printLogo, 5500);
        
        return () => clearTimeout(timer);
    }, []);
    
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'mw:window-animation') {
                setWindowAnimation(e.newValue !== 'false');
            }
        };
        const handleAnimationToggle = (e) => {
            setWindowAnimation(e.detail.enabled);
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('mw:window-animation-change', handleAnimationToggle);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('mw:window-animation-change', handleAnimationToggle);
        };
    }, []);

    useEffect(() => {
        if (windowAnimation) {
            document.documentElement.classList.remove('no-window-animation');
        } else {
            document.documentElement.classList.add('no-window-animation');
        }
    }, [windowAnimation]);
    
    // Handle drag and drop for SB3 files
    const handleDragOver = useCallback(e => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drag over detected');
    }, []);
    
    const handleDrop = useCallback(e => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drop detected');
        
        const files = e.dataTransfer.files;
        console.log('Files dropped:', files);
        
        if (files.length > 0) {
            const file = files[0];
            console.log('File:', file);
            
            // Check if the file is a Scratch project file
            if (file.name.endsWith('.sb3') || file.name.endsWith('.sb2') || file.name.endsWith('.sb') || file.name.endsWith('.html')) {
                console.log('Scratch project file detected:', file.name);
                
                // Directly handle the file upload
                if (requestProjectUpload && onLoadingStarted && onLoadingFinished && onLoadingFailed && onSetProjectTitle && vm) {
                    console.log('Directly handling file upload');
                    
                    // Request project upload to show loading screen
                    requestProjectUpload(loadingState);
                    
                    // Show loading screen
                    onLoadingStarted();
                    
                    // Read the file
                    const reader = new FileReader();
                    reader.onload = () => {
                        console.log('File read successfully');
                        const filename = file.name;
                        let loadingSuccess = false;
                        
                        // Stop current project
                        vm.quit();
                        
                        let projectData = reader.result;

                        if (filename && filename.endsWith('.html')) {
                            console.log('HTML file detected, unpackaging');
                            try {
                                const blob = new Blob([projectData], {type: 'text/html'});
                                import('../../lib/unpackager').then(({default: unpackage}) => {
                                    unpackage(blob).then(unpackaged => {
                                        console.log('HTML file unpackaged successfully');
                                        projectData = unpackaged.data;
                                        loadProjectData();
                                    }).catch(error => {
                                        console.error('Failed to unpackage HTML file:', error);
                                        onLoadingFailed(error);
                                        onLoadingFinished(loadingState, false);
                                    });
                                });
                            } catch (error) {
                                console.error('Failed to unpackage HTML file:', error);
                                onLoadingFailed(error);
                                onLoadingFinished(loadingState, false);
                            }
                        } else {
                            loadProjectData();
                        }

                        function loadProjectData() {
                            console.log('Loading project data');
                            vm.loadProject(projectData)
                                .then(() => {
                                    console.log('Project loaded successfully');
                                    if (filename) {
                                        const uploadedProjectTitle = filename.match(/^(.*)\.(?:sb[23]?|html)$/) ? filename.match(/^(.*)\.(?:sb[23]?|html)$/)[1].substring(0, 100) : '';
                                        onSetProjectTitle(uploadedProjectTitle);
                                        console.log('Project title set to:', uploadedProjectTitle);
                                    }
                                    if (vm.renderer) {
                                        vm.renderer.draw();
                                        console.log('Renderer drawn');
                                    }
                                    loadingSuccess = true;
                                })
                                .catch(error => {
                                    console.error('Failed to load project:', error);
                                    onLoadingFailed(error);
                                })
                                .then(() => {
                                    console.log('Loading finished, success:', loadingSuccess);
                                    onLoadingFinished(loadingState, loadingSuccess);
                                });
                        }
                    };
                    
                    reader.onerror = (error) => {
                        console.error('File reader error:', error);
                        onLoadingFailed(error);
                        onLoadingFinished(loadingState, false);
                    };
                    
                    console.log('Reading file as array buffer');
                    reader.readAsArrayBuffer(file);
                } else {
                    console.error('Missing required props for file upload:', {
                        requestProjectUpload: !!requestProjectUpload,
                        onLoadingStarted: !!onLoadingStarted,
                        onLoadingFinished: !!onLoadingFinished,
                        onLoadingFailed: !!onLoadingFailed,
                        onSetProjectTitle: !!onSetProjectTitle,
                        vm: !!vm
                    });
                }
            } else {
                console.log('Not a Scratch project file:', file.name);
            }
        }
    }, [requestProjectUpload, onLoadingStarted, onLoadingFinished, onLoadingFailed, onSetProjectTitle, vm, loadingState]);
    
    // 监听设置变化，更新vscodeLayout
    useEffect(() => {
        const updateVSCodeLayout = () => {
            const storedSettings = localStorage.getItem('AESettings');
            try {
                const settings = JSON.parse(storedSettings);
                setVSCodeLayout(settings.EnableVSCodeLayout);
            } catch (e) {
                setVSCodeLayout(false);
            }
        };
        
        // 监听storage变化
        window.addEventListener('storage', updateVSCodeLayout);
        
        // 初始更新
        updateVSCodeLayout();
        
        return () => {
            window.removeEventListener('storage', updateVSCodeLayout);
        };
    }, []);

    // 监听积木计数器设置变化
    useEffect(() => {
        const updateBlockCounter = () => {
            const storedSettings = localStorage.getItem('AESettings');
            try {
                const settings = JSON.parse(storedSettings);
                setEnableBlockCounter(settings.EnableBlockCounter);
            } catch (e) {
                setEnableBlockCounter(false);
            }
        };

        window.addEventListener('storage', updateBlockCounter);
        window.addEventListener('ae-settings-changed', updateBlockCounter);

        updateBlockCounter();

        return () => {
            window.removeEventListener('storage', updateBlockCounter);
            window.removeEventListener('ae-settings-changed', updateBlockCounter);
        };
    }, []);

    // 监听状态栏设置变化
    useEffect(() => {
        const updateStatusBar = () => {
            const storedSettings = localStorage.getItem('AESettings');
            try {
                const settings = JSON.parse(storedSettings);
                setEnableStatusBar(settings.EnableStatusBar);
            } catch (e) {
                setEnableStatusBar(false);
            }
        };

        window.addEventListener('storage', updateStatusBar);
        window.addEventListener('ae-settings-changed', updateStatusBar);

        updateStatusBar();

        return () => {
            window.removeEventListener('storage', updateStatusBar);
            window.removeEventListener('ae-settings-changed', updateStatusBar);
        };
    }, []);
    
    // Handle startup count and donation modal
    useEffect(() => {
        // Generate a unique key based on the editor URL
        const editorKey = `editor_startup_count_${window.location.href}`;
        
        // Get current count from localStorage
        let count = parseInt(localStorage.getItem(editorKey) || '0', 10);
        
        // Increment count
        count += 1;
        localStorage.setItem(editorKey, count.toString());
        
        // Check if we should show donation modal
        const donationThresholds = [20, 50, 100, 120, 150, 200, 250, 300];
        if (donationThresholds.includes(count)) {
            setDonationCount(count);
            setShowDonationModal(true);
        }
    }, []);
    
    const handleCloseDonationModal = () => {
        setShowDonationModal(false);
    };

    useEffect(() => {
        const handleSettingsChange = (e) => {
            if (e.detail && e.detail.key === 'multi-workspaces') {
                setMultiWorkspacesEnabled(e.detail.value);
            }
        };

        window.addEventListener('mw-settings-changed', handleSettingsChange);

        return () => {
            window.removeEventListener('mw-settings-changed', handleSettingsChange);
        };
    }, []);


    const handleEnableProcedureReturns = useCallback(() => {
        try {
            const workspace = AddonHooks.blocklyWorkspace;
            
            if (workspace && workspace.enableProcedureReturns) {
                workspace.enableProcedureReturns();
                
                if (workspace.refreshToolboxSelection_) {
                    workspace.refreshToolboxSelection_();
                }
            }
        } catch (error) {
            console.error('Error enabling procedure returns:', error);
        }
    }, []);

    const handleCategorySelected = useCallback((extensionId) => {
        try {
            const workspace = AddonHooks.blocklyWorkspace;
            if (workspace) {
                const toolbox = workspace.getToolbox();
                if (toolbox && toolbox.setSelectedCategoryById) {
                    toolbox.setSelectedCategoryById(extensionId);
                }
            }
        } catch (error) {
            console.error('Error selecting category:', error);
        }
    }, []);

    const [enableStageResize, setEnableStageResize] = useState(() => {
        if (props.enableStageResize !== undefined) {
            return props.enableStageResize;
        }
        try {
            return localStorage.getItem('mw:enable-stage-resize') !== 'false';
        } catch (e) {
            return true;
        }
    });

    useEffect(() => {
        if (props.enableStageResize !== undefined) {
            setEnableStageResize(props.enableStageResize);
        }
    }, [props.enableStageResize]);

    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const newValue = localStorage.getItem('mw:enable-stage-resize') === 'true';
                if (props.enableStageResize === undefined) {
                    setEnableStageResize(newValue);
                }
            } catch (e) {
                // ignore
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [props.enableStageResize]);

    const editorWrapperRef = useRef(null);
    const stageAndTargetWrapperRef = useRef(null);
    const stageResizeRafRef = useRef(null);
    const resizeAfterTransitionRafRef = useRef(null);
    const measureRafRef = useRef(null);
    const syncingModeRef = useRef(false);
    const isFullScreenRef = useRef(props.isFullScreen);
    isFullScreenRef.current = props.isFullScreen;
    const prevStageSizeModeRef = useRef(null);
    const lastSyncedWidthRef = useRef(null);
    const skipNextMeasureRef = useRef(false);
    const lastNonSmallStageSizeModeRef = useRef(STAGE_SIZE_MODES.large);
    const autoSmallStageRequestedRef = useRef(false);
    const autoSmallStageActiveRef = useRef(false);
    const [stagePanelWidth, setStagePanelWidth] = useState(null);
    const [stageContainerWidth, setStageContainerWidth] = useState(null);
    const [isNarrowLayout, setIsNarrowLayout] = useState(false);
    const [stageCanvasMaxHeight, setStageCanvasMaxHeight] = useState(null);

    const isStageHidden = props.stageSizeMode === STAGE_SIZE_MODES.hidden && !props.isFullScreen;
    const preferredPanelWidthRef = useRef(null);
    const isStageHiddenRef = useRef(isStageHidden);
    isStageHiddenRef.current = isStageHidden;
    const isShortLayoutRef = useRef(false);
    const autoHiddenRef = useRef(false);

    const getStageBorderExtraWidth = useCallback(containerEl => {
        if (!containerEl || typeof window === 'undefined') return 0;
        
        const stageEl = containerEl.querySelector('[class*="stage_stage"]');
        if (!stageEl) return 2;
        
        return getCachedBorderWidth(stageEl);
    }, []);

    const handleStagePanelResizeDoubleClick = useCallback(() => {
        preferredPanelWidthRef.current = null;
        setStagePanelWidth(null);
        setStageContainerWidth(null);
        if (isStageHiddenRef.current && typeof props.onSetStageSize === 'function') {
            props.onSetStageSize(STAGE_SIZE_MODES.full);
        }
    }, [props.onSetStageSize]);

    const measureStageContainerWidth = useCallback(() => {
        if (!enableStageResize) return;
        if (isFullScreenRef.current) return;
        if (measureRafRef.current) return;
        if (skipNextMeasureRef.current) {
            skipNextMeasureRef.current = false;
            return;
        }
        
        measureRafRef.current = requestAnimationFrame(() => {
            measureRafRef.current = null;
            
            if (isFullScreenRef.current) return;

            const el = stageAndTargetWrapperRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            if (!Number.isFinite(rect.width)) return;

            const computedStyle = window.getComputedStyle(el);
            const paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0;
            const paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0;
            const borderExtra = getStageBorderExtraWidth(el);

            const innerWidth = Math.max(
                0,
                rect.width - paddingLeft - paddingRight - borderExtra
            );

            setStageContainerWidth(prev => {
                if (typeof prev === 'number' && Math.abs(prev - innerWidth) < 2) {
                    return prev;
                }
                return innerWidth;
            });
        });
    }, [getStageBorderExtraWidth, enableStageResize]);

    const lastResizeWidthRef = useRef(null);
    useEffect(() => {
        if (!enableStageResize) return;
        if (typeof stageContainerWidth !== 'number') return;

        const rounded = Math.round(stageContainerWidth);
        if (lastResizeWidthRef.current === rounded) return;

        lastResizeWidthRef.current = rounded;

        if (stageResizeRafRef.current) return;
        stageResizeRafRef.current = requestAnimationFrame(() => {
            stageResizeRafRef.current = null;
            window.dispatchEvent(new Event('resize'));
        });
    }, [stageContainerWidth, enableStageResize]);

    const setStageWidth = useCallback(contentWidth => {
        skipNextMeasureRef.current = true;
        if (contentWidth === null) {
            setStagePanelWidth(null);
            setStageContainerWidth(null);
            return;
        }
        const el = stageAndTargetWrapperRef.current;
        let paddingLeft = 8;
        let paddingRight = 8;
        let borderExtra = 2;
        if (el) {
            const computedStyle = window.getComputedStyle(el);
            paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0;
            paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0;
            borderExtra = getStageBorderExtraWidth(el);
        }
        let outerWidth = contentWidth + 2 + paddingLeft + paddingRight + borderExtra;
        const editorEl = editorWrapperRef.current;
        const containerEl = editorEl ? editorEl.parentElement : null;
        const containerWidth = containerEl ?
            containerEl.getBoundingClientRect().width :
            window.innerWidth;
        const maxOuterWidth = containerWidth - MIN_EDITOR_PANE_WIDTH - 6;
        if (Number.isFinite(maxOuterWidth) && maxOuterWidth > 0) {
            outerWidth = Math.min(outerWidth, maxOuterWidth);
        }
        setStagePanelWidth(outerWidth);
        setStageContainerWidth(contentWidth + 2);
    }, [getStageBorderExtraWidth]);

    useLayoutEffect(() => {
        if (!enableStageResize) return;
        if (prevStageSizeModeRef.current === null) {
            prevStageSizeModeRef.current = props.stageSizeRequestId;
            return;
        }
        if (prevStageSizeModeRef.current === props.stageSizeRequestId) return;
        prevStageSizeModeRef.current = props.stageSizeRequestId;
        if (props.isFullScreen) return;
        if (syncingModeRef.current) {
            syncingModeRef.current = false;
            return;
        }
        if (props.stageSizeMode === STAGE_SIZE_MODES.hidden) return;
        if (props.stageSizeMode === STAGE_SIZE_MODES.small) {
            setStageWidth(FIXED_WIDTH * 0.5);
        } else if (props.stageSizeMode === STAGE_SIZE_MODES.large) {
            setStageWidth(FIXED_WIDTH);
        } else {
            setStageWidth(null);
        }
    }, [props.stageSizeMode, props.stageSizeRequestId, props.isFullScreen, setStageWidth, enableStageResize]);

    useEffect(() => {
        if (!enableStageResize) return;
        if (stageContainerWidth === lastSyncedWidthRef.current) return;
        lastSyncedWidthRef.current = stageContainerWidth;

        if (props.isFullScreen) return;
        if (props.stageSizeMode === STAGE_SIZE_MODES.hidden) return;
        if (typeof stageContainerWidth !== 'number') return;
        if (typeof props.onSetStageSize !== 'function') return;

        const smallThreshold = Math.min(
            AUTO_SMALL_STAGE_INNER_WIDTH,
            (props.customStageSize && props.customStageSize.width) || FIXED_WIDTH
        );
        const isSmall = stageContainerWidth < smallThreshold;

        if (isSmall && props.stageSizeMode !== STAGE_SIZE_MODES.small) {
            syncingModeRef.current = true;
            props.onSetStageSize(STAGE_SIZE_MODES.small);
        } else if (!isSmall && props.stageSizeMode === STAGE_SIZE_MODES.small) {
            syncingModeRef.current = true;
            props.onSetStageSize(STAGE_SIZE_MODES.full);
        }
    }, [stageContainerWidth, props.isFullScreen, props.onSetStageSize, props.stageSizeMode, props.customStageSize, enableStageResize]);

    useEffect(() => {
        if (props.isFullScreen) return;
        if (typeof stageContainerWidth !== 'number') return;

        if (props.stageSizeMode !== STAGE_SIZE_MODES.small) {
            lastNonSmallStageSizeModeRef.current = props.stageSizeMode;
        }

        if (stageContainerWidth < AUTO_SMALL_STAGE_INNER_WIDTH) {
            if (props.stageSizeMode !== STAGE_SIZE_MODES.small) {
                if (autoSmallStageRequestedRef.current) return;
                autoSmallStageRequestedRef.current = true;
                autoSmallStageActiveRef.current = true;
                if (typeof props.onSetStageSize === 'function') {
                    props.onSetStageSize(STAGE_SIZE_MODES.small);
                }
            }
        } else {
            autoSmallStageRequestedRef.current = false;

            if (autoSmallStageActiveRef.current &&
                props.stageSizeMode === STAGE_SIZE_MODES.small &&
                stageContainerWidth >= AUTO_RESTORE_STAGE_INNER_WIDTH &&
                typeof props.onSetStageSize === 'function') {
                autoSmallStageActiveRef.current = false;
                props.onSetStageSize(lastNonSmallStageSizeModeRef.current);
            }
        }
    }, [stageContainerWidth, props.isFullScreen, props.onSetStageSize, props.stageSizeMode]);

    useEffect(() => {
        measureStageContainerWidth();
        const el = stageAndTargetWrapperRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            measureStageContainerWidth();
        });
        observer.observe(el);
        return () => {
            observer.disconnect();
            if (measureRafRef.current) {
                cancelAnimationFrame(measureRafRef.current);
                measureRafRef.current = null;
            }
        };
    }, [measureStageContainerWidth, enableStageResize]);

    useEffect(() => {
        if (!enableStageResize) return;
        const el = stageAndTargetWrapperRef.current;
        if (!el) return;

        const handleTransitionEnd = e => {
            if (e.target !== el) return;
            const prop = e.propertyName;
            if (prop !== 'width' && prop !== 'flex-basis') return;
            if (resizeAfterTransitionRafRef.current) {
                cancelAnimationFrame(resizeAfterTransitionRafRef.current);
            }
            resizeAfterTransitionRafRef.current = requestAnimationFrame(() => {
                resizeAfterTransitionRafRef.current = null;
                window.dispatchEvent(new Event('resize'));
            });
        };

        el.addEventListener('transitionend', handleTransitionEnd);
        return () => {
            el.removeEventListener('transitionend', handleTransitionEnd);
            if (resizeAfterTransitionRafRef.current) {
                cancelAnimationFrame(resizeAfterTransitionRafRef.current);
                resizeAfterTransitionRafRef.current = null;
            }
        };
    }, [enableStageResize]);

    const handleStagePanelResizePointerDown = useCallback(e => {
        if (!enableStageResize) return;
        if (typeof e.button !== 'undefined' && e.button !== 0) return;
        e.preventDefault();

        const el = stageAndTargetWrapperRef.current;
        if (!el) return;

        el.style.transition = 'none';

        const editorEl = editorWrapperRef.current;
        const startRect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        const paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0;
        const borderExtra = getStageBorderExtraWidth(el);
        const editorRect = editorEl ? editorEl.getBoundingClientRect() : null;
        const startX = (typeof e.clientX === 'number') ? e.clientX : 0;
        const startWidth = startRect.width;
        const startInnerWidth = Math.max(0, startWidth - paddingLeft - paddingRight - borderExtra);

        setStageContainerWidth(Math.round(startInnerWidth));

        if (e.currentTarget &&
            typeof e.currentTarget.setPointerCapture === 'function' &&
            typeof e.pointerId === 'number') {
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {
                // ignore
            }
        }

        const minWidth = Math.max(0, (FIXED_WIDTH * 0.5) + paddingLeft + paddingRight + borderExtra);

        const containerEl = editorEl ? editorEl.parentElement : null;
        const containerRect = containerEl ? containerEl.getBoundingClientRect() : null;
        const containerWidth = (containerRect && Number.isFinite(containerRect.width)) ?
            containerRect.width :
            window.innerWidth;
        const resizerRect = (e.currentTarget && typeof e.currentTarget.getBoundingClientRect === 'function') ?
            e.currentTarget.getBoundingClientRect() : null;
        const resizerWidth = (resizerRect && Number.isFinite(resizerRect.width)) ? resizerRect.width : 6;

        const maxWidthByEditor = Math.max(minWidth, containerWidth - MIN_EDITOR_PANE_WIDTH - resizerWidth);

        let stageWrapperEl = el.querySelector('[class*="stage-wrapper_stage-wrapper"]');
        if (!stageWrapperEl) {
            const candidates = Array.from(el.querySelectorAll('[class*="stage-wrapper"]'));
            stageWrapperEl = candidates.find(candidate => candidate.querySelector('[class*="stage-header"]'));
        }
        const stageCanvasEl = stageWrapperEl ? stageWrapperEl.querySelector('[class*="stage_stage"]') : null;

        const stageWrapperRect = stageWrapperEl ? stageWrapperEl.getBoundingClientRect() : null;
        const stageCanvasRect = stageCanvasEl ? stageCanvasEl.getBoundingClientRect() : null;
        const stageOverheadHeight = (stageWrapperRect && stageCanvasRect && stageCanvasRect.height > 0) ?
            Math.max(0, stageWrapperRect.height - stageCanvasRect.height) :
            88;

        const panelHeight = startRect.height > 0 ?
            startRect.height :
            ((editorRect && editorRect.height > 0) ? editorRect.height : window.innerHeight);

        const maxStageCanvasHeight = Math.max(
            0,
            panelHeight - MIN_TARGET_PANE_HEIGHT - stageOverheadHeight
        );

        const customSize = props.customStageSize;
        const widthPerHeight = (customSize && customSize.height > 0) ?
            (customSize.width / customSize.height) :
            (4 / 3);
        const maxInnerWidthByHeight = (maxStageCanvasHeight * widthPerHeight) + 2;
        const maxWidthByHeight = Math.max(
            minWidth,
            maxInnerWidthByHeight + paddingLeft + paddingRight + borderExtra
        );

        const maxWidth = Math.min(maxWidthByEditor, maxWidthByHeight);

        const stageIsLeft = editorRect ? (startRect.left < editorRect.left) : false;
        const directionFactor = stageIsLeft ? 1 : -1;

        let moveRaf = null;
        const onMove = ev => {
            if (moveRaf) return;
            
            moveRaf = requestAnimationFrame(() => {
                moveRaf = null;
                
                const x = (typeof ev.clientX === 'number') ? ev.clientX : 0;
                const dx = x - startX;
                const rawWidth = startWidth + (dx * directionFactor);

                if (typeof props.onSetStageSize === 'function') {
                    if (rawWidth < minWidth - HIDE_STAGE_DRAG_SLOP) {
                        if (!isStageHiddenRef.current) {
                            isStageHiddenRef.current = true;
                            syncingModeRef.current = true;
                            props.onSetStageSize(STAGE_SIZE_MODES.hidden);
                        }
                        return;
                    }
                    if (isStageHiddenRef.current) {
                        isStageHiddenRef.current = false;
                        autoHiddenRef.current = false;
                        syncingModeRef.current = true;
                        props.onSetStageSize(STAGE_SIZE_MODES.small);
                    }
                }

                const nextWidth = Math.min(maxWidth, Math.max(minWidth, rawWidth));
                const nextInnerWidth = Math.max(0, nextWidth - paddingLeft - paddingRight - borderExtra);
                preferredPanelWidthRef.current = nextWidth;

                setStagePanelWidth(nextWidth);
                setStageContainerWidth(prev => {
                    if (typeof prev === 'number' && Math.abs(prev - nextInnerWidth) < 0.5) {
                        return prev;
                    }
                    return nextInnerWidth;
                });
            });
        };

        const onUp = () => {
            if (moveRaf) {
                cancelAnimationFrame(moveRaf);
                moveRaf = null;
            }
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);

            el.style.transition = '';
            measureStageContainerWidth();

            if (resizeAfterTransitionRafRef.current) {
                cancelAnimationFrame(resizeAfterTransitionRafRef.current);
            }
            resizeAfterTransitionRafRef.current = requestAnimationFrame(() => {
                resizeAfterTransitionRafRef.current = null;
                window.dispatchEvent(new Event('resize'));
            });
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [
        getStageBorderExtraWidth,
        measureStageContainerWidth,
        props.customStageSize,
        enableStageResize
    ]);

    const updateCanShowReadme = () => {
        if (!vm || !vm.editingTarget || !vm.editingTarget.comments) {
            setCanShowReadme(false);
            return;
        }
        const comments = Object.values(vm.editingTarget.comments);
        const readMe = [];
        comments.forEach(comment => {
            if (comment.text && comment.text.slice(0, 7) === "#README") {
                readMe.push(comment.text.slice(8, comment.text.length));
            }
        });
        return readMe.length != 0;
    };
    
    const [canShowReadme, setCanShowReadme] = useState(false);
    if (children) {
        return <Box {...componentProps}>{children}</Box>;
    }

    useEffect(() => {
        if (isEmbedded || isPlayerOnly) return;
        const experience = localStorage.getItem('rw:achievement-experience');
        const hasSeenOnboarding = localStorage.getItem('mw:has-seen-onboarding');
        if (experience === 'sc-newbie' && !hasSeenOnboarding && typeof onOpenOnboarding === 'function') {
            const timer = setTimeout(() => {
                onOpenOnboarding();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isEmbedded, isPlayerOnly, onOpenOnboarding]);

    useEffect(() => {
        const handleShowOnboarding = () => {
            if (typeof onOpenOnboarding === 'function') {
                onOpenOnboarding();
            }
        };
        
        window.addEventListener('show-onboarding', handleShowOnboarding);
        
        return () => {
            window.removeEventListener('show-onboarding', handleShowOnboarding);
        };
    }, [onOpenOnboarding]);

    useEffect(() => {
        if (!vm) return;

        const handleCommentEvent = (e) => {
            setCanShowReadme(updateCanShowReadme());
        };
        const showReadmeDefault = (e) => {
            if (!Settings.get('enableREADMEAutoDisplay')) return
            for (const target of vm.runtime.targets) {
                if (target.sprite && target.sprite.name === "README") {
                    loadData(target.comments);
                    props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'readme'});
                    break
                }
            }
        }

        vm.runtime.on('PROJECT_CHANGED', handleCommentEvent);
        vm.runtime.on('PROJECT_LOADED', handleCommentEvent);
        vm.runtime.on('PROJECT_LOADED', showReadmeDefault);
        return () => {
            vm.runtime.off('PROJECT_CHANGED', handleCommentEvent);
            vm.runtime.off('PROJECT_LOADED', handleCommentEvent);
            vm.runtime.off('PROJECT_LOADED', showReadmeDefault);
        };
    }, [vm, props.dispatch]);

    useEffect(() => {
        // Initialize shortcut system
        const {initialize: initShortcuts, updateCallbacks: updateShortcutsCallbacks} = require('../../lib/shortcuts/event-router.js');
        
        // Create dispatch wrapper with available actions
        const dispatchWrapper = {
            manualUpdateProject: () => props.dispatch && props.dispatch({type: 'scratch-gui/project-state/MANUAL_UPDATE_PROJECT'}),
            saveProjectAsCopy: () => props.dispatch && props.dispatch({type: 'scratch-gui/project-state/SAVE_PROJECT_AS_COPY'}),
            requestNewProject: (loadingState) => props.dispatch && props.dispatch({type: 'scratch-gui/project-state/START_FETCHING_NEW', loadingState}),
            openSettingsModal: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'settingsModal'}),
            openRestorePointModal: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'restorePointModal'}),
            openSpriteLibrary: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'spriteLibrary'}),
            openCostumeLibrary: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'costumeLibrary'}),
            openSoundLibrary: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'soundLibrary'}),
            openExtensionLibrary: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'extensionLibrary'}),
            openExtensionManagerModal: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'extensionManagerModal'}),
            openAIChatModal: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'aiChatModal'}),
            openAIAgentModal: () => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'aiAgentModal'}),
            activateTab: (tabIndex) => props.dispatch && props.dispatch({type: 'scratch-gui/navigation/ACTIVATE_TAB', activeTabIndex: tabIndex})
        };
        
        // Create callbacks
        const callbacks = {};
        if (onStartSelectingFileUpload) {
            callbacks.loadFromComputer = onStartSelectingFileUpload;
        }
        if (onClickPackager) {
            callbacks.openPackager = onClickPackager;
        }
        callbacks.toggleBackpack = () => props.dispatch && props.dispatch({type: 'scratch-gui/backpack/TOGGLE_BACKPACK'});
        callbacks.toggleStageSize = () => props.dispatch && props.dispatch({type: 'scratch-gui/stage-size/TOGGLE_STAGE_SIZE'});
        callbacks.setFullScreen = (isFullScreen) => props.dispatch && props.dispatch({type: 'scratch-gui/mode/SET_FULL_SCREEN', isFullScreen});
        callbacks.toggleCommandPalette = () => window.dispatchEvent(new Event('rw-command-palette-toggle'));
        callbacks.toggleProblems = () => window.dispatchEvent(new CustomEvent('mw-panel-toggle', {
            detail: {panel: 'problems'}
        }));
        callbacks.toggleConsole = () => window.dispatchEvent(new CustomEvent('mw-panel-toggle', {
            detail: {panel: 'console'}
        }));
        
        // Initialize shortcuts with dispatch, vm, and callbacks
        initShortcuts(dispatchWrapper, vm, callbacks);
        updateShortcutsCallbacks(callbacks);
        
        // Cleanup on unmount
        return () => {
            const {dispose: disposeShortcuts} = require('../../lib/shortcuts/event-router.js');
            disposeShortcuts();
        };
    }, [onStartSelectingFileUpload, onClickPackager, vm, props.dispatch]);

    const tabClassNames = useMemo(() => ({
        tabs: styles.tabs,
        tab: classNames(tabStyles.reactTabsTab, styles.tab),
        tabList: classNames(tabStyles.reactTabsTabList, styles.tabList),
        tabPanel: classNames(tabStyles.reactTabsTabPanel, styles.tabPanel),
        tabPanelSelected: classNames(tabStyles.reactTabsTabPanelSelected, styles.isSelected),
        tabSelected: classNames(tabStyles.reactTabsTabSelected, styles.isSelected),
        vscode: classNames(tabStyles.reactTabsTabList, styles.vscode),
        vscodeList: classNames(tabStyles.reactTabs, styles.vscodeList)
    }), []);

    const unconstrainedWidth = useMemo(() => (
        UNCONSTRAINED_NON_STAGE_WIDTH +
        FIXED_WIDTH +
        Math.max(0, customStageSize.width - FIXED_WIDTH)
    ), [customStageSize.width]);

    const alwaysEnabledModals = useMemo(() => (
        <React.Suspense fallback={null}>
        <React.Fragment>
            <RoturSession />
            {!isEmbedded && <RoturExtensionHost />}
            {commandPaletteOpen ? (
                <CommandPalette
                    vm={vm}
                    dispatch={props.dispatch}
                    onClose={() => setCommandPaletteOpen(false)}
                />
            ) : null}
            <AchievementTracker vm={vm} />
            <Achievements />
            <NotificationsProvider />
            <TWSecurityManager securityManager={securityManager} />
            <TWRestorePointManager />
            <MWExtensionManagerModal />
            <MWProjectThemeModal />
            <ShortcutManager visible={shortcutManagerModalVisible} />
            {usernameModalVisible && (
                <React.Suspense fallback={null}>
                    <TWUsernameModal visible={usernameModalVisible} />
                </React.Suspense>
            )}
            {settingsModalVisible && (
                <React.Suspense fallback={null}>
                    <TWSettingsModal
                        isRtl={isRtl}
                        visible={settingsModalVisible}
                    />
                </React.Suspense>
            )}
            {customExtensionModalVisible && (
                <React.Suspense fallback={null}>
                    <TWCustomExtensionModal />
                </React.Suspense>
            )}
            {extensionLoadChoiceModalVisible && extensionLoadChoiceData && (
                <TWExtensionLoadChoiceModal
                    extensionId={extensionLoadChoiceData.extensionId}
                    extensionName={extensionLoadChoiceData.extensionName}
                    localURL={extensionLoadChoiceData.localURL}
                    onlineURL={extensionLoadChoiceData.onlineURL}
                    onCategorySelected={handleCategorySelected}
                />
            )}
            {fontsModalVisible && (
                <React.Suspense fallback={null}>
                    <TWFontsModal />
                </React.Suspense>
            )}
            {unknownPlatformModalVisible && <TWUnknownPlatformModal />}
            {invalidProjectModalVisible && <TWInvalidProjectModal />}
            {gitModalVisible && <TWGitModal />}
            {customGalleryModalVisible && <CustomGalleryModal />}
            {assetsModalVisible && (
                <React.Suspense fallback={null}>
                    <MWAssetsModal isRtl={isRtl} />
                </React.Suspense>
            )}
            {helpModalVisible && <MWHelpModal isRtl={isRtl} entryId={helpEntry} />}
            {projectMetadataModalVisible && (
                <React.Suspense fallback={null}>
                    <MWProjectMetadataModal isRtl={isRtl} />
                </React.Suspense>
            )}
            {debuggerModalVisible && (
                <React.Suspense fallback={null}>
                    <TWDebugger isRtl={isRtl} />
                </React.Suspense>
            )}
            <AIModal />
            <AIChatModal />
            <AIAgentModal />
            <BaiduAIModal />
            <ExtensionEditorModal />
            <SuperRefactorModal />
            <CompatibilityModal />
            <SimpleDialog />
            <TutorialModal />
            <VideoModal />
            <UpdateLogModal />
            <BilmeModal />
            <WarpthemeModal />
            {onboardingVisible && <Onboarding />}
            {props.gandiHelpModal && <GandiHelp onClose={() => props.dispatch && props.dispatch({type: 'scratch-gui/modals/CLOSE_MODAL', modal: 'gandiHelpModal'})} />}
            {customThemeVisible && <CustomThemeModal />}
            {readmeModalVisible && <AEReadMe />}
            {roturLoginModalVisible && (
                <RoturLoginModal onRequestClose={onRequestCloseRoturLogin} />
            )}
        </React.Fragment>
        </React.Suspense>
    ), [
        securityManager,
        usernameModalVisible,
        settingsModalVisible,
        isRtl,
        customExtensionModalVisible,
        extensionLoadChoiceModalVisible,
        extensionLoadChoiceData,
        fontsModalVisible,
        unknownPlatformModalVisible,
        invalidProjectModalVisible,
        gitModalVisible,
        customGalleryModalVisible,
        assetsModalVisible,
        helpModalVisible,
        helpEntry,
        projectMetadataModalVisible,
        debuggerModalVisible,
        shortcutManagerModalVisible,
        onboardingVisible,
        props.gandiHelpModal,
        customThemeVisible,
        readmeModalVisible,
        roturLoginModalVisible,
        onRequestCloseRoturLogin,
        isEmbedded,
        vm,
        commandPaletteOpen
    ]);

    const minDimensions = useMemo(() => ({
        minWidth: typeof stagePanelWidth === 'number' ?
            MIN_EDITOR_PANE_WIDTH + stagePanelWidth + 6 + 16 :
            1024 + Math.max(0, customStageSize.width - 480),
        minHeight: 640 + Math.max(0, customStageSize.height - 360)
    }), [customStageSize.width, customStageSize.height, stagePanelWidth]);

    const stagePanelStyle = useMemo(() => {
        if (!stagePanelWidth) return null;
        return {
            width: `${stagePanelWidth}px`,
            flexBasis: `${stagePanelWidth}px`,
            flexShrink: 0
        };
    }, [stagePanelWidth]);

    // 活动栏工具按钮定义（顺序/显示由高级设置中的活动栏配置控制）
    const handlePanelToggle = panel => {
        setPanelState(prev => {
            if (prev.visible && prev.active === panel) {
                return {...prev, visible: false};
            }
            return {...prev, visible: true, active: panel};
        });
    };
    const handlePanelSelect = panel => {
        setPanelState(prev => ({...prev, visible: true, active: panel}));
    };
    const handlePanelClose = () => {
        setPanelState(prev => ({...prev, visible: false}));
    };
    const handlePanelResize = height => {
        setPanelState(prev => ({...prev, height: Math.max(100, Math.min(600, height))}));
    };
    const activityBarDefs = {
        addonSettings: {
            title: intl.formatMessage({defaultMessage: '插件设置', id: 'tw.addonSettings.title'}),
            onClick: onClickAddonSettings,
            icon: <Puzzle size={20} />
        },
        addExtension: {
            title: intl.formatMessage(messages.addExtension),
            onClick: onExtensionButtonClick,
            icon: <PackagePlus size={20} />
        },
        collaboration: {
            title: intl.formatMessage({defaultMessage: 'Live Collaboration', id: 'tw.menuBar.collaboration'}),
            onClick: () => props.dispatch(openCollaborationModal()),
            icon: <Handshake size={20} />
        },
        todo: {
            condition: SettingsStore.getAddonEnabled('todo-list'),
            title: intl.formatMessage({defaultMessage: 'Todo', id: 'gui.menuBar.todo'}),
            onClick: () => window.dispatchEvent(new Event('rw-todo-open')),
            icon: <ListTodo size={20} />
        },
        git: {
            title: intl.formatMessage({defaultMessage: 'Git', id: 'mw.menuBar.git'}),
            onClick: () => props.dispatch(openGitModal()),
            icon: <GitBranch size={20} />
        },
        bookmarks: {
            title: intl.formatMessage({defaultMessage: 'Bookmarks', id: 'tw.workspaceBookmarks.menuLabel'}),
            onClick: () => props.dispatch(openWorkspaceBookmarksMenu()),
            icon: <Bookmark size={20} />
        },
        aiAgent: {
            title: intl.formatMessage({defaultMessage: 'AI Agent', id: 'gui.menuBar.aiAgent'}),
            onClick: () => props.dispatch(openAIAgentModal()),
            icon: <Sparkles size={20} />
        },
        achievements: {
            condition: isAchievementsEnabled(),
            title: locale === 'zh-cn' ? '成就' : 'Achievements',
            onClick: () => window.dispatchEvent(new Event('rw-achievements-open')),
            icon: <Trophy size={20} />
        },
        problems: {
            title: intl.formatMessage({defaultMessage: '问题', id: 'mw.panel.problems'}),
            onClick: () => handlePanelToggle('problems'),
            icon: <CircleAlert size={20} />,
            active: panelState.visible && panelState.active === 'problems'
        },
        console: {
            title: intl.formatMessage({defaultMessage: '控制台', id: 'mw.panel.console'}),
            onClick: () => handlePanelToggle('console'),
            icon: <Terminal size={20} />,
            active: panelState.visible && panelState.active === 'console'
        }
    };

    // 依据设置中的顺序/开关过滤出要渲染的活动栏按钮
    const activityBarItems = getActivityBarVisibleIds()
        .map(id => ({id, def: activityBarDefs[id]}))
        .filter(item => item.def && item.def.condition !== false)
        .map((item, i, arr) => ({
            ...item,
            active: !!item.def.active,
            separatorAfter: item.id === 'addExtension' && i < arr.length - 1
        }));

    return (<MediaQuery minWidth={unconstrainedWidth}>{isUnconstrained => {
        const stageSize = resolveStageSize(stageSizeMode, isUnconstrained);

        return isPlayerOnly ? (
            <React.Fragment>
                {isWindowFullScreen ? (
                    <div
                        className={styles.fullscreenBackground}
                        style={{
                            backgroundColor: fullscreenBackgroundColor
                        }}
                    />
                ) : null}
                <StageWrapper
                    isFullScreen={isFullScreen}
                    isEmbedded={isEmbedded}
                    isRendererSupported={isRendererSupported()}
                    isRtl={isRtl}
                    loading={loading}
                    stageSize={STAGE_SIZE_MODES.full}
                    vm={vm}
                >
                    {alertsVisible ? (
                        <Alerts className={styles.alertsContainer} />
                    ) : null}
                </StageWrapper>
                {alwaysEnabledModals}
            </React.Fragment>
        ) : (
            <Box
                className={styles.pageWrapper}
                dir={isRtl ? 'rtl' : 'ltr'}
                style={minDimensions}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                {...componentProps}
            >
                {alwaysEnabledModals}
                <MWCommandPalette />
                {telemetryModalVisible ? (
                    <React.Suspense fallback={null}>
                        <TelemetryModal
                            isRtl={isRtl}
                            isTelemetryEnabled={isTelemetryEnabled}
                            onCancel={onTelemetryModalCancel}
                            onOptIn={onTelemetryModalOptIn}
                            onOptOut={onTelemetryModalOptOut}
                            onRequestClose={onRequestCloseTelemetryModal}
                            onShowPrivacyPolicy={onShowPrivacyPolicy}
                        />
                    </React.Suspense>
                ) : null}
                {loading ? (
                    <Loader isFullScreen />
                ) : null}
                {isCreating ? (
                    <Loader
                        isFullScreen
                        messageId="gui.loader.creating"
                    />
                ) : null}
                <CollabLoader />
                {isBrowserSupported() ? null : (
                    <BrowserModal
                        isRtl={isRtl}
                        onClickDesktopSettings={onClickDesktopSettings}
                    />
                )}
                {tipsLibraryVisible ? (
                    <TipsLibrary />
                ) : null}
                {cardsVisible ? (
                    <Cards />
                ) : null}
                {alertsVisible ? (
                    <Alerts className={styles.alertsContainer} />
                ) : null}
                {connectionModalVisible ? (
                    <ConnectionModal
                        vm={vm}
                    />
                ) : null}
                <CollaborationContainer />
                {costumeLibraryVisible ? (
                    <CostumeLibrary
                        vm={vm}
                        onRequestClose={onRequestCloseCostumeLibrary}
                    />
                ) : null}
                {backdropLibraryVisible ? (
                    <BackdropLibrary
                        vm={vm}
                        onRequestClose={onRequestCloseBackdropLibrary}
                    />
                ) : null}
                {soundLibraryVisible ? (
                    <SoundLibrary
                        vm={vm}
                        onRequestClose={onRequestCloseSoundLibrary}
                    />
                ) : null}
                <MenuBar
                    accountNavOpen={accountNavOpen}
                    authorId={authorId}
                    authorThumbnailUrl={authorThumbnailUrl}
                    authorUsername={authorUsername}
                    canChangeLanguage={canChangeLanguage}
                    canChangeTheme={canChangeTheme}
                    canCreateCopy={canCreateCopy}
                    canCreateNew={canCreateNew}
                    canEditTitle={canEditTitle}
                    canManageFiles={canManageFiles}
                    canRemix={canRemix}
                    canSave={canSave}
                    canShare={canShare}
                    className={classNames(
                        styles.menuBarPosition,
                        {
                            [styles.menuBarHidden]: isFullScreen
                        }
                    )}
                    enableCommunity={enableCommunity}
                    isShared={isShared}
                    isTotallyNormal={isTotallyNormal}
                    logo={logo}
                    renderLogin={renderLogin}
                    showComingSoon={showComingSoon}
                    showOpenFilePicker={showOpenFilePicker}
                    showSaveFilePicker={showSaveFilePicker}
                    onClickAbout={onClickAbout}
                    onClickAccountNav={onClickAccountNav}
                    onClickAddonSettings={onClickAddonSettings}
                    onClickDesktopSettings={onClickDesktopSettings}
                    onClickNewWindow={onClickNewWindow}
                    onClickPackager={onClickPackager}
                    onClickLogo={onClickLogo}
                    onCloseAccountNav={onCloseAccountNav}
                    onLogOut={onLogOut}
                    onOpenExtensionLibrary={onOpenExtensionLibrary}
                    onOpenExtensionManagerModal={onOpenExtensionManagerModal}
                    onOpenRegistration={onOpenRegistration}
                    onProjectTelemetryEvent={onProjectTelemetryEvent}
                    onSeeCommunity={onSeeCommunity}
                    onShare={onShare}
                    onStartSelectingFileUpload={onStartSelectingFileUpload}
                    onToggleLoginOpen={onToggleLoginOpen}
                />
                <Box className={styles.bodyWrapper}>
                    <Box className={styles.flexWrapper} style={AESettings.get('EnableMobileLayout') ? {
                        flexDirection: 'column'
                    } : {}}>
                        <Box
                            className={classNames(styles.editorWrapper, {
                                [styles.vscodeLayout]: vscodeLayout
                            })}
                            ref={editorWrapperRef}
                        >
                            <NativeFindBar
                                activeTabIndex={activeTabIndex}
                                isPlayerOnly={isPlayerOnly}
                                locale={locale}
                                vm={vm}
                            />
                            <Tabs
                                forceRenderTabPanel
                                className={
                                    vscodeLayout
                                        ? `${tabClassNames.vscodeList}`
                                        : tabClassNames.tabs
                                }
                                selectedIndex={activeTabIndex}
                                selectedTabClassName={tabClassNames.tabSelected}
                                selectedTabPanelClassName={tabClassNames.tabPanelSelected}
                                onSelect={onActivateTab}
                            >
                                <TabList className={
                                    vscodeLayout ?
                                        `${tabClassNames.vscode}` :
                                        tabClassNames.tabList
                                } style={{display: 'flex', alignItems: 'center', flexWrap: 'nowrap'}}>
                                    <Tab className={tabClassNames.tab}>
                                        <BlocksIcon size={20} />
                                        {!vscodeLayout && (
                                            <FormattedMessage
                                                defaultMessage="Code"
                                                description="Button to get to the code panel"
                                                id="gui.gui.codeTab"
                                            />
                                        )}
                                    </Tab>
                                    <Tab
                                        className={tabClassNames.tab}
                                        onClick={onActivateCostumesTab}
                                    >
                                        <CostumesIcon size={20} />
                                        {!vscodeLayout && (targetIsStage ? (
                                            <FormattedMessage
                                                defaultMessage="Backdrops"
                                                description="Button to get to the backdrops panel"
                                                id="gui.gui.backdropsTab"
                                            />
                                        ) : (
                                            <FormattedMessage
                                                defaultMessage="Costumes"
                                                description="Button to get to the costumes panel"
                                                id="gui.gui.costumesTab"
                                            />
                                        ))}
                                    </Tab>
                                    <Tab
                                        className={tabClassNames.tab}
                                        onClick={onActivateSoundsTab}
                                    >
                                        <SoundsIcon size={20} />
                                        {!vscodeLayout && (
                                            <FormattedMessage
                                                defaultMessage="Sounds"
                                                description="Button to get to the sounds panel"
                                                id="gui.gui.soundsTab"
                                            />
                                        )}
                                    </Tab>
                                    {canShowReadme &&
                                        <button
                                            className={styles.readmeButton}
                                            style={!vscodeLayout ? {
                                                marginLeft: "130px",
                                                flexShrink: 0,
                                                whiteSpace: 'nowrap'
                                            } : {}}
                                            onClick={() => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'readme'})}
                                        >
                                            {vscodeLayout ? (
                                                <img src="https://raw.githubusercontent.com/astraeditor/astraeditor-scratch-gui/main/src/components/gui/readme.svg" draggable={false} alt="readme" style={{
                                                    width: "30px",
                                                    filter: 'grayscale(100%)'
                                                }} />
                                            ) : (
                                                "README"
                                            )}
                                        </button>}
                                    {vscodeLayout && (
                                        <>
                                            <div className={styles.activityBarSeparator} />
                                            {activityBarItems.map(item => (
                                                <React.Fragment key={item.id}>
                                                    <button
                                                        className={classNames(styles.activityBarButton, {
                                                            [styles.activityBarButtonActive]: item.active
                                                        })}
                                                        title={item.def.title}
                                                        onClick={item.def.onClick}
                                                    >
                                                        {item.def.icon}
                                                    </button>
                                                    {item.separatorAfter && <div className={styles.activityBarSeparator} />}
                                                </React.Fragment>
                                            ))}
                                            <div className={styles.activityBarBottom}>
                                                {roturUsername ? (
                                                    <button
                                                        className={classNames(styles.activityBarButton, styles.activityBarAvatarButton)}
                                                        title={roturUsername}
                                                        onClick={() => props.dispatch && props.dispatch(openAccountMenu())}
                                                    >
                                                        <Avatar username={roturUsername} size={28} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={styles.activityBarButton}
                                                        title={intl.formatMessage({defaultMessage: '登录', id: 'tw.login.button'})}
                                                        onClick={() => props.dispatch && props.dispatch(openRoturLoginModal())}
                                                    >
                                                        <LogIn size={20} />
                                                    </button>
                                                )}
                                                <div className={styles.activityBarBottomGap} />
                                                <button
                                                    className={styles.activityBarButton}
                                                    title={intl.formatMessage({defaultMessage: '高级设置', id: 'gui.menuBar.settings'})}
                                                    onClick={() => props.dispatch && props.dispatch({type: 'scratch-gui/modals/OPEN_MODAL', modal: 'settingsModal'})}
                                                >
                                                    <SettingsIcon size={20} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </TabList>
                                <TabPanel className={tabClassNames.tabPanel}>
                                    <Box className={styles.blocksWrapper}>
                                        {multiWorkspacesEnabled ? (
                                            <MultiWorkspaces
                                                canUseCloud={canUseCloud}
                                                stageSize={stageSize}
                                                onOpenCustomExtensionModal={onOpenCustomExtensionModal}
                                                theme={theme}
                                                vm={vm}
                                                editingTarget={editingTarget}
                                            />
                                        ) : (
                                            <Blocks
                                                key={`${blocksId}/${theme.id}`}
                                                canUseCloud={canUseCloud}
                                                grow={1}
                                                isVisible={blocksTabVisible}
                                                options={{
                                                    media: `${basePath}static/${theme.getBlocksMediaFolder()}/`
                                                }}
                                                stageSize={stageSize}
                                                onOpenCustomExtensionModal={onOpenCustomExtensionModal}
                                                theme={theme}
                                                vm={vm}
                                            />
                                        )}
                                    </Box>
                                    <Box className={styles.extensionButtonContainer}>
                                        <button
                                            className={styles.extensionButton}
                                            title={intl.formatMessage(messages.addExtension)}
                                            onClick={onExtensionButtonClick}
                                        >
                                            <ExtensionIcon
                                                className={styles.extensionButtonIcon}
                                                draggable={false}
                                            />
                                        </button>
                                    </Box>
                                    <Box className={styles.watermark}>
                                        <Watermark />
                                    </Box>
                                </TabPanel>
                                <TabPanel className={tabClassNames.tabPanel}>
                                    {costumesTabVisible ? <CostumeTab
                                        vm={vm}
                                    /> : null}
                                </TabPanel>
                                <TabPanel className={tabClassNames.tabPanel}>
                                    {soundsTabVisible ? <SoundTab vm={vm} /> : null}
                                </TabPanel>
                            </Tabs>
                            {backpackVisible && activeTabIndex !== COSTUMES_TAB_INDEX && activeTabIndex !== SOUNDS_TAB_INDEX ? (
                                vscodeLayout ? (
                                    <Box className={styles.vscodeBackpackHost}>
                                        <Backpack host={backpackHost} />
                                    </Box>
                                ) : (
                                    <Backpack host={backpackHost} />
                                )
                            ) : null}
                            {panelState.visible && (
                                <MWPanelBarContainer
                                    visible={panelState.visible}
                                    active={panelState.active}
                                    height={panelState.height}
                                    locale={locale}
                                    vscodeLayout={vscodeLayout}
                                    onSelect={handlePanelSelect}
                                    onClose={handlePanelClose}
                                    onResize={handlePanelResize}
                                />
                            )}
                        </Box>

                        <Box
                            className={styles.stagePaneResizer}
                            onPointerDown={enableStageResize ? handleStagePanelResizePointerDown : undefined}
                            onDoubleClick={enableStageResize ? handleStagePanelResizeDoubleClick : undefined}
                            role="separator"
                            aria-orientation="vertical"
                            tabIndex={-1}
                        />

                        <Box
                            className={classNames(styles.stageAndTargetWrapper, styles[stageSize])}
                            ref={stageAndTargetWrapperRef}
                            style={enableStageResize ? stagePanelStyle : undefined}
                        >
                            <StageWrapper
                                isFullScreen={isFullScreen}
                                isRendererSupported={isRendererSupported()}
                                isRtl={isRtl}
                                stageSize={stageSize}
                                stageContainerWidth={
                                    typeof stageContainerWidth === 'number' ? stageContainerWidth : null
                                }
                                vm={vm}
                            />
                            <Box className={styles.targetWrapper}>
                                <TargetPane
                                    stageSize={stageSize}
                                    vm={vm}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>
                {enableStatusBar && <StatusBar vm={vm} />}
                {extensionLibraryVisible ? (
                    <Suspense fallback={<Loader />}>
                        <ExtensionLibrary
                            vm={vm}
                            visible={extensionLibraryVisible}
                            onRequestClose={onRequestCloseExtensionLibrary}
                            onOpenCustomExtensionModal={onOpenCustomExtensionModal}
                            onOpenCustomGalleryModal={onOpenCustomGalleryModal}
                            onEnableProcedureReturns={handleEnableProcedureReturns}
                            onActivateBlocksTab={() => {}}
                            onCategorySelected={handleCategorySelected}
                        />
                    </Suspense>
                ) : null}
            <DragLayer />
            <DonationModal 
                visible={showDonationModal} 
                onClose={handleCloseDonationModal} 
                count={donationCount} 
            />
            {enableBlockCounter && <BlockCounter theme={theme} />}

        </Box>
        );
    }}</MediaQuery>);
};

GUIComponent.propTypes = {
    accountNavOpen: PropTypes.bool,
    activeTabIndex: PropTypes.number,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    backdropLibraryVisible: PropTypes.bool,
    backpackHost: PropTypes.string,
    backpackVisible: PropTypes.bool,
    basePath: PropTypes.string,
    blocksTabVisible: PropTypes.bool,
    blocksId: PropTypes.string,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    canUseCloud: PropTypes.bool,
    cardsVisible: PropTypes.bool,
    children: PropTypes.node,
    costumeLibraryVisible: PropTypes.bool,
    soundLibraryVisible: PropTypes.bool,
    costumesTabVisible: PropTypes.bool,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    enableStageResize: PropTypes.bool,
    enableCommunity: PropTypes.bool,
    extensionLibraryVisible: PropTypes.bool,
    intl: intlShape.isRequired,
    isCreating: PropTypes.bool,
    isEmbedded: PropTypes.bool,
    isFullScreen: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isWindowFullScreen: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    loading: PropTypes.bool,
    logo: PropTypes.string,
    onActivateCostumesTab: PropTypes.func,
    onActivateSoundsTab: PropTypes.func,
    onActivateTab: PropTypes.func,
    onClickAccountNav: PropTypes.func,
    onClickAddonSettings: PropTypes.func,
    onClickDesktopSettings: PropTypes.func,
    onClickPackager: PropTypes.func,
    onClickNewWindow: PropTypes.func,
    onClickLogo: PropTypes.func,
    onCloseAccountNav: PropTypes.func,
    onExtensionButtonClick: PropTypes.func,
    onOpenCustomExtensionModal: PropTypes.func,
    onOpenCustomGalleryModal: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenExtensionLibrary: PropTypes.func,
    onOpenExtensionManagerModal: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onRequestCloseBackdropLibrary: PropTypes.func,
    onRequestCloseCostumeLibrary: PropTypes.func,
    onRequestCloseSoundLibrary: PropTypes.func,
    onRequestCloseExtensionLibrary: PropTypes.func,
    onRequestCloseTelemetryModal: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onShare: PropTypes.func,
    onShowPrivacyPolicy: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onTabSelect: PropTypes.func,
    onTelemetryModalCancel: PropTypes.func,
    onTelemetryModalOptIn: PropTypes.func,
    onTelemetryModalOptOut: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    onSetStageSize: PropTypes.func,
    onSetFullScreen: PropTypes.func,
    renderLogin: PropTypes.func,
    roturLoginModalVisible: PropTypes.bool,
    onRequestCloseRoturLogin: PropTypes.func,
    securityManager: PropTypes.shape({}),
    showComingSoon: PropTypes.bool,
    showOpenFilePicker: PropTypes.func,
    showSaveFilePicker: PropTypes.func,
    soundsTabVisible: PropTypes.bool,
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
    targetIsStage: PropTypes.bool,
    telemetryModalVisible: PropTypes.bool,
    theme: PropTypes.instanceOf(Theme),
    tipsLibraryVisible: PropTypes.bool,
    onOpenOnboarding: PropTypes.func,
    onboardingVisible: PropTypes.bool,
    usernameModalVisible: PropTypes.bool,
    settingsModalVisible: PropTypes.bool,
    shortcutManagerModalVisible: PropTypes.bool,
    customExtensionModalVisible: PropTypes.bool,
    extensionLoadChoiceModalVisible: PropTypes.bool,
    extensionLoadChoiceData: PropTypes.shape({
        extensionId: PropTypes.string,
        extensionName: PropTypes.string,
        defaultURL: PropTypes.string
    }),
    fontsModalVisible: PropTypes.bool,
    unknownPlatformModalVisible: PropTypes.bool,
    invalidProjectModalVisible: PropTypes.bool,
    gitModalVisible: PropTypes.bool,
    customGalleryModalVisible: PropTypes.bool,
    assetsModalVisible: PropTypes.bool,
    helpModalVisible: PropTypes.bool,
    helpEntry: PropTypes.string,
    projectMetadataModalVisible: PropTypes.bool,
    debuggerModalVisible: PropTypes.bool,
    gandiHelpModal: PropTypes.bool,
    // AstraEditor features
    customThemeVisible: PropTypes.bool,
    readmeModalVisible: PropTypes.bool,
    onOpenReadme: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};
GUIComponent.defaultProps = {
    backpackHost: null,
    backpackVisible: false,
    basePath: './',
    blocksId: 'original',
    canChangeLanguage: true,
    canChangeTheme: true,
    canCreateNew: false,
    canEditTitle: false,
    canManageFiles: true,
    canRemix: false,
    canSave: false,
    canCreateCopy: false,
    canShare: false,
    canUseCloud: false,
    enableCommunity: false,
    isCreating: false,
    isShared: false,
    isTotallyNormal: false,
    loading: false,
    showComingSoon: false,
    stageSizeMode: STAGE_SIZE_MODES.large
};

const mapStateToProps = state => ({
    customStageSize: state.scratchGui.customStageSize,
    isWindowFullScreen: state.scratchGui.tw.isWindowFullScreen,
    isFullScreen: state.scratchGui.mode.isFullScreen || state.scratchGui.mode.isEmbedded,
    blocksId: state.scratchGui.timeTravel.year.toString(),
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    theme: state.scratchGui.theme.theme,
    locale: state.locales.locale,
    onboardingVisible: state.scratchGui.onboarding.visible,
    shortcutManagerModalVisible: state.scratchGui.modals.shortcutManagerModal,
    extensionLoadChoiceModalVisible: state.scratchGui.modals.extensionLoadChoiceModal,
    extensionLoadChoiceData: state.scratchGui.modals.extensionLoadChoiceData,
    gandiHelpModal: state.scratchGui.modals.gandiHelpModal,
    editingTarget: state.scratchGui.targets && state.scratchGui.targets.editingTarget,
    // AstraEditor features
    customThemeVisible: state.scratchGui.modals.customtheme,
    readmeModalVisible: state.scratchGui.modals.readme,
    roturUsername: state.scratchGui.rotur ? state.scratchGui.rotur.username : null,
    // MistWarp feature modals
    gitModalVisible: state.scratchGui.modals.gitModal,
    customGalleryModalVisible: state.scratchGui.modals.customGalleryModal,
    assetsModalVisible: state.scratchGui.modals.assetsModal,
    helpModalVisible: state.scratchGui.modals.helpModal,
    projectMetadataModalVisible: state.scratchGui.modals.projectMetadataModal,
    debuggerModalVisible: state.scratchGui.modals.debuggerModal
});

const mapDispatchToProps = dispatch => ({
    dispatch: dispatch,
    onSetStageSize: stageSize => dispatch(setStageSize(stageSize)),
    onOpenOnboarding: () => dispatch(showOnboarding()),
    onOpenReadme: () => dispatch(openReadme())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(GUIComponent));

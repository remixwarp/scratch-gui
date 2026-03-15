import classNames from 'classnames';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';
import MediaQuery from 'react-responsive';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import tabStyles from 'react-tabs/style/react-tabs.css';
import VM from 'scratch-vm';

import Blocks from '../../containers/blocks.jsx';
import CostumeTab from '../../containers/costume-tab.jsx';
import SoundTab from '../../containers/sound-tab.jsx';
import ExtensionLibrary from '../../containers/extension-library.jsx';
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
import TelemetryModal from '../telemetry-modal/telemetry-modal.jsx';
import TWUsernameModal from '../../containers/tw-username-modal.jsx';
import TWSettingsModal from '../../containers/tw-settings-modal.jsx';
import TWSecurityManager from '../../containers/tw-security-manager.jsx';
import TWCustomExtensionModal from '../../containers/tw-custom-extension-modal.jsx';
import TWExtensionLoadChoiceModal from '../../containers/tw-extension-load-choice-modal.jsx';
import TWRestorePointManager from '../../containers/tw-restore-point-manager.jsx';
import TWFontsModal from '../../containers/tw-fonts-modal.jsx';
import TWUnknownPlatformModal from '../../containers/tw-unknown-platform-modal.jsx';
import TWInvalidProjectModal from '../../containers/tw-invalid-project-modal.jsx';
import TWGitModal from '../../containers/mw-git-modal.jsx';
import MWExtensionManagerModal from '../../containers/mw-extension-manager-modal.jsx';
import MWProjectThemeModal from '../../containers/mw-project-theme-modal.jsx';
import ShortcutManager from '../shortcut-manager/shortcut-manager.jsx';
import AIModal from '../../containers/ai-modal.jsx';
import AIChatModal from '../../containers/ai-chat-modal.jsx';
import AIAgentModal from '../../containers/ai-agent-modal.jsx';
import SimpleDialog from '../../containers/simple-dialog.jsx';
import AddonHooks from '../../addons/hooks.js';
import NativeFindBar from '../find-bar/find-bar.jsx';
import Onboarding from '../../containers/onboarding.jsx';

import {STAGE_SIZE_MODES, FIXED_WIDTH, UNCONSTRAINED_NON_STAGE_WIDTH} from '../../lib/constants/layout-constants';
import {resolveStageSize} from '../../lib/utils/screen';
import {Theme} from '../../lib/themes';

import {setStageSize} from '../../reducers/stage-size';
import {showOnboarding} from '../../reducers/onboarding';

import {isRendererSupported, isBrowserSupported} from '../../lib/utils/tw-environment-support-prober.js';

import styles from './gui.css';

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

    const editorWrapperRef = useRef(null);
    const stageAndTargetWrapperRef = useRef(null);
    const stageResizeRafRef = useRef(null);
    const measureRafRef = useRef(null);
    const autoSmallStageRequestedRef = useRef(false);
    const autoSmallStageActiveRef = useRef(false);
    const lastNonSmallStageSizeModeRef = useRef(STAGE_SIZE_MODES.large);
    const [stagePanelWidth, setStagePanelWidth] = useState(null);
    const [stageContainerWidth, setStageContainerWidth] = useState(null);

    const handleStagePanelResizeDoubleClick = useCallback(() => {
        setStagePanelWidth(null);
    }, []);

    const getStageBorderExtraWidth = useCallback(containerEl => {
        if (!containerEl || typeof window === 'undefined') return 0;
        
        const stageEl = containerEl.querySelector('[class*="stage_stage"]');
        if (!stageEl) return 2;
        
        return getCachedBorderWidth(stageEl);
    }, []);

    const measureStageContainerWidth = useCallback(() => {
        if (measureRafRef.current) return;
        
        measureRafRef.current = requestAnimationFrame(() => {
            measureRafRef.current = null;
            
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
    }, [getStageBorderExtraWidth]);

    const lastResizeWidthRef = useRef(null);
    useEffect(() => {
        if (typeof stageContainerWidth !== 'number') return;

        const rounded = Math.round(stageContainerWidth);
        if (lastResizeWidthRef.current === rounded) return;

        lastResizeWidthRef.current = rounded;

        if (stageResizeRafRef.current) return;
        stageResizeRafRef.current = requestAnimationFrame(() => {
            stageResizeRafRef.current = null;
            window.dispatchEvent(new Event('resize'));
        });
    }, [stageContainerWidth]);

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
    }, [measureStageContainerWidth]);

    const handleStagePanelResizePointerDown = useCallback(e => {
        if (typeof e.button !== 'undefined' && e.button !== 0) return;
        e.preventDefault();

        const el = stageAndTargetWrapperRef.current;
        if (!el) return;
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
        const stageOverheadHeight = (stageWrapperRect && stageCanvasRect) ?
            Math.max(0, stageWrapperRect.height - stageCanvasRect.height) :
            88;

        const maxStageCanvasHeight = Math.max(
            0,
            startRect.height - MIN_TARGET_PANE_HEIGHT - stageOverheadHeight
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
                const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + (dx * directionFactor)));
                const nextInnerWidth = Math.max(0, nextWidth - paddingLeft - paddingRight - borderExtra);
                
                setStagePanelWidth(nextWidth);
                setStageContainerWidth(prev => {
                    if (typeof prev === 'number' && Math.abs(prev - nextInnerWidth) < 0.5) {
                        return prev;
                    }
                    return nextInnerWidth;
                });

                if (!props.isFullScreen &&
                    props.stageSizeMode !== STAGE_SIZE_MODES.small &&
                    typeof props.onSetStageSize === 'function' &&
                    nextInnerWidth < AUTO_SMALL_STAGE_INNER_WIDTH) {
                    autoSmallStageActiveRef.current = true;
                    props.onSetStageSize(STAGE_SIZE_MODES.small);
                }
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
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [
        getStageBorderExtraWidth,
        props.customStageSize,
        props.isFullScreen,
        props.onSetStageSize,
        props.stageSizeMode
    ]);

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
        shortcutManagerModalVisible,
        vm,
        ...componentProps
    } = omit(props, 'dispatch');
    if (children) {
        return <Box {...componentProps}>{children}</Box>;
    }

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('mw:has-seen-onboarding');
        if (!hasSeenOnboarding && !isEmbedded && !isPlayerOnly && typeof onOpenOnboarding === 'function') {
            const timer = setTimeout(() => {
                onOpenOnboarding();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isEmbedded, isPlayerOnly, onOpenOnboarding]);

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
        tabSelected: classNames(tabStyles.reactTabsTabSelected, styles.isSelected)
    }), []);

    const unconstrainedWidth = useMemo(() => (
        UNCONSTRAINED_NON_STAGE_WIDTH +
        FIXED_WIDTH +
        Math.max(0, customStageSize.width - FIXED_WIDTH)
    ), [customStageSize.width]);

    const alwaysEnabledModals = useMemo(() => (
        <React.Fragment>
            <NotificationsProvider />
            <TWSecurityManager securityManager={securityManager} />
            <TWRestorePointManager />
            <MWExtensionManagerModal />
            <MWProjectThemeModal />
            <ShortcutManager visible={shortcutManagerModalVisible} />
            {usernameModalVisible && <TWUsernameModal visible={usernameModalVisible} />}
            {settingsModalVisible && (
                <TWSettingsModal
                    isRtl={isRtl}
                    visible={settingsModalVisible}
                />
            )}
            {customExtensionModalVisible && <TWCustomExtensionModal />}
            {extensionLoadChoiceModalVisible && extensionLoadChoiceData && (
                <TWExtensionLoadChoiceModal
                    extensionId={extensionLoadChoiceData.extensionId}
                    extensionName={extensionLoadChoiceData.extensionName}
                    localURL={extensionLoadChoiceData.localURL}
                    onlineURL={extensionLoadChoiceData.onlineURL}
                    onCategorySelected={handleCategorySelected}
                />
            )}
            {fontsModalVisible && <TWFontsModal />}
            {unknownPlatformModalVisible && <TWUnknownPlatformModal />}
            {invalidProjectModalVisible && <TWInvalidProjectModal />}
            {gitModalVisible && <TWGitModal />}
            <AIModal />
            <AIChatModal />
            <AIAgentModal />
            <SimpleDialog />
            {onboardingVisible && <Onboarding />}
        </React.Fragment>
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
        shortcutManagerModalVisible,
        onboardingVisible
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
                {...componentProps}
            >
                {alwaysEnabledModals}
                {telemetryModalVisible ? (
                    <TelemetryModal
                        isRtl={isRtl}
                        isTelemetryEnabled={isTelemetryEnabled}
                        onCancel={onTelemetryModalCancel}
                        onOptIn={onTelemetryModalOptIn}
                        onOptOut={onTelemetryModalOptOut}
                        onRequestClose={onRequestCloseTelemetryModal}
                        onShowPrivacyPolicy={onShowPrivacyPolicy}
                    />
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
                    className={styles.menuBarPosition}
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
                    <Box className={styles.flexWrapper}>
                        <Box
                            className={styles.editorWrapper}
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
                                className={tabClassNames.tabs}
                                selectedIndex={activeTabIndex}
                                selectedTabClassName={tabClassNames.tabSelected}
                                selectedTabPanelClassName={tabClassNames.tabPanelSelected}
                                onSelect={onActivateTab}
                            >
                                <TabList className={tabClassNames.tabList}>
                                    <Tab className={tabClassNames.tab}>
                                        <BlocksIcon size={20} />
                                        <FormattedMessage
                                            defaultMessage="Code"
                                            description="Button to get to the code panel"
                                            id="gui.gui.codeTab"
                                        />
                                    </Tab>
                                    <Tab
                                        className={tabClassNames.tab}
                                        onClick={onActivateCostumesTab}
                                    >
                                        <CostumesIcon size={20} />
                                        {targetIsStage ? (
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
                                        )}
                                    </Tab>
                                    <Tab
                                        className={tabClassNames.tab}
                                        onClick={onActivateSoundsTab}
                                    >
                                        <SoundsIcon size={20} />
                                        <FormattedMessage
                                            defaultMessage="Sounds"
                                            description="Button to get to the sounds panel"
                                            id="gui.gui.soundsTab"
                                        />
                                    </Tab>
                                </TabList>
                                <TabPanel className={tabClassNames.tabPanel}>
                                    <Box className={styles.blocksWrapper}>
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
                            {backpackVisible ? (
                                <Backpack host={backpackHost} />
                            ) : null}
                        </Box>

                        <Box
                            className={styles.stagePaneResizer}
                            onPointerDown={handleStagePanelResizePointerDown}
                            onDoubleClick={handleStagePanelResizeDoubleClick}
                            role="separator"
                            aria-orientation="vertical"
                            tabIndex={-1}
                        />

                        <Box
                            className={classNames(styles.stageAndTargetWrapper, styles[stageSize])}
                            ref={stageAndTargetWrapperRef}
                            style={stagePanelStyle}
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
                {extensionLibraryVisible ? (
                    <ExtensionLibrary
                        vm={vm}
                        visible={extensionLibraryVisible}
                        onRequestClose={onRequestCloseExtensionLibrary}
                        onOpenCustomExtensionModal={onOpenCustomExtensionModal}
                        onEnableProcedureReturns={handleEnableProcedureReturns}
                        onActivateBlocksTab={() => {}}
                        onCategorySelected={handleCategorySelected}
                    />
                ) : null}
            <DragLayer />
            <DonationModal 
                visible={showDonationModal} 
                onClose={handleCloseDonationModal} 
                count={donationCount} 
            />
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
    extensionLoadChoiceData: state.scratchGui.modals.extensionLoadChoiceData
});

const mapDispatchToProps = dispatch => ({
    dispatch: dispatch,
    onSetStageSize: stageSize => dispatch(setStageSize(stageSize)),
    onOpenOnboarding: () => dispatch(showOnboarding())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(GUIComponent));

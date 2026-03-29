const OPEN_MODAL = 'scratch-gui/modals/OPEN_MODAL';
const CLOSE_MODAL = 'scratch-gui/modals/CLOSE_MODAL';

const MODAL_BACKDROP_LIBRARY = 'backdropLibrary';
const MODAL_COSTUME_LIBRARY = 'costumeLibrary';
const MODAL_EXTENSION_LIBRARY = 'extensionLibrary';
const MODAL_LOADING_PROJECT = 'loadingProject';
const MODAL_TELEMETRY = 'telemetryModal';
const MODAL_SOUND_LIBRARY = 'soundLibrary';
const MODAL_SPRITE_LIBRARY = 'spriteLibrary';
const MODAL_SOUND_RECORDER = 'soundRecorder';
const MODAL_CONNECTION = 'connectionModal';
const MODAL_TIPS_LIBRARY = 'tipsLibrary';
const MODAL_USERNAME = 'usernameModal';
const MODAL_SETTINGS = 'settingsModal';
const MODAL_CUSTOM_EXTENSION = 'customExtensionModal';
const MODAL_RESTORE_POINTS = 'restorePointModal';
const MODAL_FONTS = 'fontsModal';
const MODAL_UNKNOWN_PLATFORM = 'unknownPlatformModal';
const MODAL_INVALID_PROJECT = 'invalidProjectModal';
const MODAL_EXTENSION_MANAGER = 'extensionManagerModal';
const MODAL_GIT = 'gitModal';
const MODAL_PREFERENCES = 'preferencesModal';
const MODAL_SIMPLE_DIALOG = 'simpleDialog';
const MODAL_ONBOARDING = 'onboardingModal';
const MODAL_SHORTCUT_MANAGER = 'shortcutManagerModal';
const MODAL_AI = 'aiModal';
const MODAL_AI_CHAT = 'aiChatModal';
const MODAL_AI_AGENT = 'aiAgentModal';
const MODAL_EXTENSION_LOAD_CHOICE = 'extensionLoadChoiceModal';
const MODAL_WARPTHEME = 'bilmeModal';
const MODAL_SUPER_REFACTOR = 'superRefactorModal';
const MODAL_TUTORIAL = 'tutorialModal';
const MODAL_VIDEO = 'videoModal';

const initialState = {
    [MODAL_BACKDROP_LIBRARY]: false,
    [MODAL_COSTUME_LIBRARY]: false,
    [MODAL_EXTENSION_LIBRARY]: false,
    [MODAL_LOADING_PROJECT]: false,
    [MODAL_TELEMETRY]: false,
    [MODAL_SOUND_LIBRARY]: false,
    [MODAL_SPRITE_LIBRARY]: false,
    [MODAL_SOUND_RECORDER]: false,
    [MODAL_CONNECTION]: false,
    [MODAL_TIPS_LIBRARY]: false,
    [MODAL_USERNAME]: false,
    [MODAL_SETTINGS]: false,
    [MODAL_CUSTOM_EXTENSION]: false,
    [MODAL_RESTORE_POINTS]: false,
    [MODAL_FONTS]: false,
    [MODAL_UNKNOWN_PLATFORM]: false,
    [MODAL_INVALID_PROJECT]: false,
    [MODAL_EXTENSION_MANAGER]: false,
    [MODAL_GIT]: false,
    [MODAL_PREFERENCES]: false,
    [MODAL_SIMPLE_DIALOG]: false,
    [MODAL_ONBOARDING]: false,
    [MODAL_SHORTCUT_MANAGER]: false,
    [MODAL_AI]: false,
    [MODAL_AI_CHAT]: false,
    [MODAL_AI_AGENT]: false,
    [MODAL_EXTENSION_LOAD_CHOICE]: false,
    [MODAL_WARPTHEME]: false,
    [MODAL_SUPER_REFACTOR]: false,
    [MODAL_TUTORIAL]: false,
    [MODAL_VIDEO]: false,
    extensionLoadChoiceData: null,
    superRefactorCode: '{}',
    superRefactorOnSave: null,
    videoModalData: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case OPEN_MODAL:
        return Object.assign({}, state, {
            [action.modal]: true,
            extensionLoadChoiceData: action.extensionLoadChoiceData || state.extensionLoadChoiceData,
            superRefactorCode: action.superRefactorCode || state.superRefactorCode,
            superRefactorOnSave: action.superRefactorOnSave || state.superRefactorOnSave,
            videoModalData: action.tutorial || state.videoModalData
        });
    case CLOSE_MODAL:
        return Object.assign({}, state, {
            [action.modal]: false,
            simpleDialogConfig: null,
            extensionLoadChoiceData: action.modal === MODAL_EXTENSION_LOAD_CHOICE ? null : state.extensionLoadChoiceData,
            videoModalData: action.modal === MODAL_VIDEO ? null : state.videoModalData
        });
    case 'scratch-gui/modals/SHOW_SIMPLE_DIALOG':
        return Object.assign({}, state, {
            [MODAL_SIMPLE_DIALOG]: true,
            simpleDialogConfig: action.dialogConfig
        });
    default:
        return state;
    }
};
const openModal = function (modal, data) {
    return {
        type: OPEN_MODAL,
        modal: modal,
        ...data
    };
};
const closeModal = function (modal) {
    return {
        type: CLOSE_MODAL,
        modal: modal
    };
};
const openBackdropLibrary = function () {
    return openModal(MODAL_BACKDROP_LIBRARY);
};
const openCostumeLibrary = function () {
    return openModal(MODAL_COSTUME_LIBRARY);
};
const openExtensionLibrary = function () {
    return openModal(MODAL_EXTENSION_LIBRARY);
};
const openLoadingProject = function () {
    return openModal(MODAL_LOADING_PROJECT);
};
const openTelemetryModal = function () {
    return openModal(MODAL_TELEMETRY);
};
const openSoundLibrary = function () {
    return openModal(MODAL_SOUND_LIBRARY);
};
const openSpriteLibrary = function () {
    return openModal(MODAL_SPRITE_LIBRARY);
};
const openSoundRecorder = function () {
    return openModal(MODAL_SOUND_RECORDER);
};
const openConnectionModal = function () {
    return openModal(MODAL_CONNECTION);
};
const openTipsLibrary = function () {
    return openModal(MODAL_TIPS_LIBRARY);
};
const openUsernameModal = function () {
    return openModal(MODAL_USERNAME);
};
const openSettingsModal = function () {
    return openModal(MODAL_SETTINGS);
};
const openCustomExtensionModal = function () {
    return openModal(MODAL_CUSTOM_EXTENSION);
};
const openRestorePointModal = function () {
    return openModal(MODAL_RESTORE_POINTS);
};
const openFontsModal = function () {
    return openModal(MODAL_FONTS);
};
const openUnknownPlatformModal = function () {
    return openModal(MODAL_UNKNOWN_PLATFORM);
};
const openInvalidProjectModal = function () {
    return openModal(MODAL_INVALID_PROJECT);
};
const openExtensionManagerModal = function () {
    return openModal(MODAL_EXTENSION_MANAGER);
};
const openGitModal = function () {
    return openModal(MODAL_GIT);
};
const openPreferencesModal = function () {
    return openModal(MODAL_PREFERENCES);
};
const openOnboardingModal = function () {
    return openModal(MODAL_ONBOARDING);
};
const openShortcutManagerModal = function () {
    return openModal(MODAL_SHORTCUT_MANAGER);
};
const openAIModal = function (config) {
    return {
        type: OPEN_MODAL,
        modal: MODAL_AI,
        aiConfig: config
    };
};
const closeAIModal = function () {
    return closeModal(MODAL_AI);
};
const openAIChatModal = function (config) {
    return {
        type: OPEN_MODAL,
        modal: MODAL_AI_CHAT,
        aiConfig: config
    };
};
const closeAIChatModal = function () {
    return closeModal(MODAL_AI_CHAT);
};
const openAIAgentModal = function (config) {
    return {
        type: OPEN_MODAL,
        modal: MODAL_AI_AGENT,
        aiConfig: config
    };
};
const closeAIAgentModal = function () {
    return closeModal(MODAL_AI_AGENT);
};
const openSuperRefactorModal = function (code, onSave) {
    return {
        type: OPEN_MODAL,
        modal: MODAL_SUPER_REFACTOR,
        superRefactorCode: code,
        superRefactorOnSave: onSave
    };
};
const closeSuperRefactorModal = function () {
    return closeModal(MODAL_SUPER_REFACTOR);
};
const openSimpleDialog = function (dialogConfig) {
    return {
        type: 'scratch-gui/modals/SHOW_SIMPLE_DIALOG',
        dialogConfig
    };
};
const closeBackdropLibrary = function () {
    return closeModal(MODAL_BACKDROP_LIBRARY);
};
const closeCostumeLibrary = function () {
    return closeModal(MODAL_COSTUME_LIBRARY);
};
const closeExtensionLibrary = function () {
    return closeModal(MODAL_EXTENSION_LIBRARY);
};
const closeLoadingProject = function () {
    return closeModal(MODAL_LOADING_PROJECT);
};
const closeTelemetryModal = function () {
    return closeModal(MODAL_TELEMETRY);
};
const closeSpriteLibrary = function () {
    return closeModal(MODAL_SPRITE_LIBRARY);
};
const closeSoundLibrary = function () {
    return closeModal(MODAL_SOUND_LIBRARY);
};
const closeSoundRecorder = function () {
    return closeModal(MODAL_SOUND_RECORDER);
};
const closeTipsLibrary = function () {
    return closeModal(MODAL_TIPS_LIBRARY);
};
const closeConnectionModal = function () {
    return closeModal(MODAL_CONNECTION);
};
const closeUsernameModal = function () {
    return closeModal(MODAL_USERNAME);
};
const closeSettingsModal = function () {
    return closeModal(MODAL_SETTINGS);
};
const closeCustomExtensionModal = function () {
    return closeModal(MODAL_CUSTOM_EXTENSION);
};
const closeRestorePointModal = function () {
    return closeModal(MODAL_RESTORE_POINTS);
};
const closeFontsModal = function () {
    return closeModal(MODAL_FONTS);
};
const closeUnknownPlatformModal = function () {
    return closeModal(MODAL_UNKNOWN_PLATFORM);
};
const closeInvalidProjectModal = function () {
    return closeModal(MODAL_INVALID_PROJECT);
};
const closeExtensionManagerModal = function () {
    return closeModal(MODAL_EXTENSION_MANAGER);
};
const closeGitModal = function () {
    return closeModal(MODAL_GIT);
};
const closePreferencesModal = function () {
    return closeModal(MODAL_PREFERENCES);
};
const closeOnboardingModal = function () {
    return closeModal(MODAL_ONBOARDING);
};
const closeShortcutManagerModal = function () {
    return closeModal(MODAL_SHORTCUT_MANAGER);
};
const openExtensionLoadChoiceModal = function (extensionId, extensionName, localURL, onlineURL) {
    return {
        type: OPEN_MODAL,
        modal: MODAL_EXTENSION_LOAD_CHOICE,
        extensionLoadChoiceData: {
            extensionId,
            extensionName,
            localURL,
            onlineURL
        }
    };
};
const closeExtensionLoadChoiceModal = function () {
    return {
        type: CLOSE_MODAL,
        modal: MODAL_EXTENSION_LOAD_CHOICE
    };
};
const openBilmeModal = function () {
    return openModal(MODAL_WARPTHEME);
};
const closeBilmeModal = function () {
    return closeModal(MODAL_WARPTHEME);
};
const openTutorialModal = function () {
    return openModal(MODAL_TUTORIAL);
};
const closeTutorialModal = function () {
    return closeModal(MODAL_TUTORIAL);
};
const openVideoModal = function (tutorial) {
    return openModal(MODAL_VIDEO, { tutorial });
};
const closeVideoModal = function () {
    return Object.assign({}, closeModal(MODAL_VIDEO), {
        videoModalData: null
    });
};
export {
    reducer as default,
    initialState as modalsInitialState,
    closeModal,
    openBackdropLibrary,
    openCostumeLibrary,
    openExtensionLibrary,
    openLoadingProject,
    openSoundLibrary,
    openSpriteLibrary,
    openSoundRecorder,
    openTelemetryModal,
    openTipsLibrary,
    openConnectionModal,
    openUsernameModal,
    openSettingsModal,
    openCustomExtensionModal,
    openRestorePointModal,
    openFontsModal,
    openUnknownPlatformModal,
    openInvalidProjectModal,
    openExtensionManagerModal,
    openGitModal,
    openPreferencesModal,
    openOnboardingModal,
    openShortcutManagerModal,
    openAIModal,
    closeAIModal,
    openAIChatModal,
    closeAIChatModal,
    openAIAgentModal,
    closeAIAgentModal,
    openSuperRefactorModal,
    closeSuperRefactorModal,
    openSimpleDialog,
    closeBackdropLibrary,
    closeCostumeLibrary,
    closeExtensionLibrary,
    closeLoadingProject,
    closeSpriteLibrary,
    closeSoundLibrary,
    closeSoundRecorder,
    closeTelemetryModal,
    closeTipsLibrary,
    closeConnectionModal,
    closeUsernameModal,
    closeSettingsModal,
    closeCustomExtensionModal,
    closeRestorePointModal,
    closeFontsModal,
    closeUnknownPlatformModal,
    closeInvalidProjectModal,
    closeExtensionManagerModal,
    closeGitModal,
    closePreferencesModal,
    closeOnboardingModal,
    closeShortcutManagerModal,
    openExtensionLoadChoiceModal,
    closeExtensionLoadChoiceModal,
    openBilmeModal,
    closeBilmeModal,
    openTutorialModal,
    closeTutorialModal,
    openVideoModal,
    closeVideoModal,
    MODAL_WARPTHEME
};

const OPEN_PROJECT_THEME_PROMPT = 'mw/project-theme/OPEN_PROJECT_THEME_PROMPT';
const CLOSE_PROJECT_THEME_PROMPT = 'mw/project-theme/CLOSE_PROJECT_THEME_PROMPT';
const SET_PROJECT_THEME_DONT_ASK_AGAIN = 'mw/project-theme/SET_PROJECT_THEME_DONT_ASK_AGAIN';

const initialState = {
    visible: false,
    bilupTheme: null,
    promptKey: null,
    dontAskAgain: false
};

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case OPEN_PROJECT_THEME_PROMPT:
        return {
            visible: true,
            bilupTheme: action.bilupTheme,
            promptKey: action.promptKey,
            dontAskAgain: false
        };
    case CLOSE_PROJECT_THEME_PROMPT:
        return {
            ...state,
            visible: false,
            bilupTheme: null,
            promptKey: null,
            dontAskAgain: false
        };
    case SET_PROJECT_THEME_DONT_ASK_AGAIN:
        return {
            ...state,
            dontAskAgain: action.value
        };
    default:
        return state;
    }
};

const openProjectThemePrompt = (bilupTheme, promptKey) => ({
    type: OPEN_PROJECT_THEME_PROMPT,
    bilupTheme,
    promptKey
});

const closeProjectThemePrompt = () => ({
    type: CLOSE_PROJECT_THEME_PROMPT
});

const setProjectThemeDontAskAgain = value => ({
    type: SET_PROJECT_THEME_DONT_ASK_AGAIN,
    value
});

export {
    reducer as default,
    initialState as mwProjectThemeInitialState,
    openProjectThemePrompt,
    closeProjectThemePrompt,
    setProjectThemeDontAskAgain
};

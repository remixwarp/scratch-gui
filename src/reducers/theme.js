import {detectTheme} from '../lib/themes/themePersistance';
import {applyGuiColors} from '../lib/themes/guiHelpers';

const SET_THEME = 'scratch-gui/theme/SET_THEME';

const initialState = {
    theme: detectTheme()
};

// Apply GUI colors after DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                applyGuiColors(initialState.theme);
            } catch (e) {
                console.error('Failed to apply initial GUI colors for theme:', e);
            }
        });
    } else {
        try {
            applyGuiColors(initialState.theme);
        } catch (e) {
            console.error('Failed to apply initial GUI colors for theme:', e);
        }
    }
}

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case SET_THEME:
        return {...state, theme: action.theme};
    default:
        return state;
    }
};

const setTheme = theme => {
    console.log('setTheme', theme);
    // Apply GUI colors when theme changes
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                try {
                    applyGuiColors(theme);
                } catch (e) {
                    console.error('Failed to apply GUI colors for theme:', e);
                }
            });
        } else {
            try {
                applyGuiColors(theme);
            } catch (e) {
                console.error('Failed to apply GUI colors for theme:', e);
            }
        }
    }
    return {
        type: SET_THEME,
        theme
    };
};

export {
    reducer as default,
    initialState as themeInitialState,
    setTheme
};

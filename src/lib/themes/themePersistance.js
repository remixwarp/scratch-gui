import {BLOCKS_CUSTOM, Theme, ACCENT_DEFAULT, GUI_DEFAULT, BLOCKS_THREE} from './index.js';
import {customThemeManager, CustomTheme} from './custom-themes.js';
import {applyGuiColors} from './guiHelpers.js';

const matchMedia = query => (window.matchMedia ? window.matchMedia(query) : null);
const PREFERS_HIGH_CONTRAST_QUERY = matchMedia('(prefers-contrast: more)');
const PREFERS_DARK_QUERY = matchMedia('(prefers-color-scheme: dark)');

const STORAGE_KEY = 'tw:theme';

/**
 * @returns {Theme} detected theme
 */
const systemPreferencesTheme = () => {
    // Use Theme class static properties instead of Theme.defaults
    if (PREFERS_HIGH_CONTRAST_QUERY && PREFERS_HIGH_CONTRAST_QUERY.matches) {
        return Theme.highContrast;
    }
    if (PREFERS_DARK_QUERY && PREFERS_DARK_QUERY.matches) {
        return Theme.dark;
    }
    return Theme.light;
};

/**
 * @param {function} onChange callback; no guarantees about arguments
 * @returns {function} call to remove event listeners to prevent memory leak
 */
const onSystemPreferenceChange = onChange => {
    if (
        !PREFERS_HIGH_CONTRAST_QUERY ||
        !PREFERS_DARK_QUERY ||
        // Some old browsers don't support addEventListener on media queries
        !PREFERS_HIGH_CONTRAST_QUERY.addEventListener ||
        !PREFERS_DARK_QUERY.addEventListener
    ) {
        return () => {};
    }

    PREFERS_HIGH_CONTRAST_QUERY.addEventListener('change', onChange);
    PREFERS_DARK_QUERY.addEventListener('change', onChange);

    return () => {
        PREFERS_HIGH_CONTRAST_QUERY.removeEventListener('change', onChange);
        PREFERS_DARK_QUERY.removeEventListener('change', onChange);
    };
};

/**
 * @returns {Theme} the theme
 */
const detectTheme = () => {
    const systemPreferences = systemPreferencesTheme();

    try {
        const local = localStorage.getItem(STORAGE_KEY);

        // Migrate legacy preferences
        if (local === 'dark') {
            return Theme.dark;
        }
        if (local === 'light') {
            return Theme.light;
        }

        const parsed = JSON.parse(local);
        
        // Check if this is a custom theme
        if (parsed.isCustom && parsed.customThemeUuid) {
            const customTheme = customThemeManager.getTheme(parsed.customThemeUuid);
            if (customTheme) {
                return customTheme;
            }
            // Fall back to system preferences if custom theme not found
            console.warn(`Custom theme ${parsed.customThemeUuid} not found, falling back to system preferences`);
        }

        if (parsed.inlineCustomTheme && typeof parsed.inlineCustomTheme === 'object') {
            try {
                return CustomTheme.import(parsed.inlineCustomTheme);
            } catch (e) {
                console.warn('Failed to import inline custom theme, falling back to system preferences', e);
            }
        }
        
        // Any invalid values in storage will be handled by Theme itself
        const wallpaper = parsed.wallpaper || {url: '', opacity: 0.3, darkness: 0, gridVisible: true, history: []};
        
        // Add backward compatibility for gridVisible
        if (typeof wallpaper.gridVisible === 'undefined') {
            wallpaper.gridVisible = true;
        }

        return new Theme(
            parsed.accent || systemPreferences.accent,
            parsed.gui || systemPreferences.gui,
            parsed.blocks || systemPreferences.blocks,
            parsed.menuBarAlign || systemPreferences.menuBarAlign,
            wallpaper,
            parsed.fonts || {system: [], google: [], history: []}
        );
    } catch (e) {
        // ignore
    }

    return systemPreferences;
};

/**
 * @param {Theme} theme the theme
 */
const persistTheme = theme => {
    // When RWC applies a config it writes the exported theme snapshot
    // directly to localStorage. If this runs during the brief window
    // before page reload, it would overwrite the just-written value with
    // the stale Redux theme. The flag is set by applyConfigFromUrl() and
    // disappears on reload.
    if (window._rwcSkipPersist) return;

    const systemPreferences = systemPreferencesTheme();
    const nonDefaultSettings = {};

    // Handle custom themes differently
    if (theme instanceof CustomTheme) {
        const isSavedCustomTheme = !!customThemeManager.getTheme(theme.uuid);
        if (isSavedCustomTheme) {
            nonDefaultSettings.customThemeUuid = theme.uuid;
            nonDefaultSettings.isCustom = true;
        } else {
            // Modified/unselected custom theme: persist inline so it can be restored.
            nonDefaultSettings.inlineCustomTheme = theme.export();
        }
    } else {
        if (theme.accent !== systemPreferences.accent) {
            nonDefaultSettings.accent = theme.accent;
        }
        if (theme.gui !== systemPreferences.gui) {
            nonDefaultSettings.gui = theme.gui;
        }
        // custom blocks are managed by addon at runtime, don't save here
        if (theme.blocks !== systemPreferences.blocks && theme.blocks !== BLOCKS_CUSTOM) {
            nonDefaultSettings.blocks = theme.blocks;
        }
        if (theme.menuBarAlign !== systemPreferences.menuBarAlign) {
            nonDefaultSettings.menuBarAlign = theme.menuBarAlign;
        }
        // Always save wallpaper settings if they exist
        if (theme.wallpaper && (theme.wallpaper.url || (theme.wallpaper.history && theme.wallpaper.history.length > 0))) {
            nonDefaultSettings.wallpaper = theme.wallpaper;
        }

        // Always save fonts settings if they exist
        if (theme.fonts &&
            ((theme.fonts.system && theme.fonts.system.length > 0) ||
             (theme.fonts && theme.fonts.google && theme.fonts.google.length > 0) ||
             (theme.fonts && theme.fonts.history && theme.fonts.history.length > 0))) {
            nonDefaultSettings.fonts = theme.fonts;
        }
    }

    if (Object.keys(nonDefaultSettings).length === 0) {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // ignore
        }
    } else {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nonDefaultSettings));
        } catch (e) {
            // ignore
        }
    }
};

/**
 * Apply a theme to the GUI pipeline and persist settings.
 * This centralizes application so loading and manual changes behave the same.
 * @param {Theme} theme the theme
 * @param {boolean} delayPersist 是否延迟持久化到 localStorage（初始化加载时用）
 */
const applyTheme = (theme, delayPersist = false) => {
    try {
        applyGuiColors(theme);
    } catch (e) {
        // Don't let GUI application failures block persistence
        console.error('Failed to apply GUI colors for theme:', e);
    }

    // 初始化加载阶段：先让项目尽快加载，持久化在空闲时执行
    // 避免 localStorage 写入 + JSON 序列化阻塞启动关键路径
    if (delayPersist) {
        const scheduleIdle = typeof requestIdleCallback !== 'undefined'
            ? requestIdleCallback
            : cb => setTimeout(cb, 0);
        scheduleIdle(() => persistTheme(theme), {timeout: 3000});
    } else {
        persistTheme(theme);
    }
};

// 模块加载时只应用 CSS 颜色变量（避免闪烁），持久化延迟到浏览器空闲
// 减少启动关键路径上的同步开销（localStorage 读写、JSON 序列化等）
try {
    const initialTheme = detectTheme();
    try {
        applyGuiColors(initialTheme);
    } catch (e) {
        console.error('Failed to apply GUI colors for theme:', e);
    }
    const scheduleIdle = typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback
        : cb => setTimeout(cb, 0);
    scheduleIdle(() => persistTheme(initialTheme), {timeout: 3000});
} catch (e) {
    console.error('Failed to apply theme:', e);
}

export {
    onSystemPreferenceChange,
    detectTheme,
    persistTheme,
    applyTheme
};
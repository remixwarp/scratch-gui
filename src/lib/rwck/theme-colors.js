/**
 * 从 scratch-gui 运行时读取编辑器主题的强调色（accent color）。
 *
 * 优先级（从最可信到兜底）：
 *   1. Redux store 的 state.scratchGui.theme.theme.accent.ui-primary
 *   2. CSS 变量 --ui-primary（从 <html> 读，可能是空 / "var(...)" 嵌套）
 *   3. Redux 顶层 theme.color 字段（老版本 scratch-gui）
 *   4. localStorage.scratchTheme?.ui-primary（某些 mod 会把偏好存这儿）
 *   5. 固定兜底 #4c97ff / #333
 *
 * 在发布窗口里，所有带颜色的按钮 / 边框 / 标题栏都会用它。
 * 返回值结构：{ primary, secondary }，一定是十六进制字符串。
 */

const DEFAULT_PRIMARY   = '#4c97ff';
const DEFAULT_SECONDARY = '#333';

/** 把字符串里的 hex 色（#rgb / #rrggbb）抠出来。 */
function _normalizeHex (v) {
    if (typeof v !== 'string' || !v) return '';
    const m = v.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/);
    if (m) {
        let h = m[1];
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        return '#' + h.toLowerCase();
    }
    return '';
}

function _getReduxThemeColor () {
    try {
        const store = window.ReduxStore;
        if (!store || !store.getState) return null;
        const s = store.getState();

        // 新版 scratch-gui (PenguinMod / remixwarp fork):
        // state.scratchGui.theme.theme.accent = { 'ui-primary': '#xxxxxx', 'ui-secondary': '#xxxxxx' }
        const theme = s && s.scratchGui && s.scratchGui.theme && s.scratchGui.theme.theme;
        if (theme) {
            const accent = theme.accent;
            if (accent && typeof accent === 'object') {
                const p = _normalizeHex(accent['ui-primary']);
                const q = _normalizeHex(accent['ui-secondary']);
                if (p || q) return { primary: p || DEFAULT_PRIMARY, secondary: q || DEFAULT_SECONDARY };
            }
            if (accent && typeof accent === 'string') {
                const p = _normalizeHex(accent);
                if (p) return { primary: p, secondary: DEFAULT_SECONDARY };
            }
            // 老结构：state.theme.color 直接是主色
            if (theme.color) {
                const p = _normalizeHex(theme.color);
                if (p) return { primary: p, secondary: DEFAULT_SECONDARY };
            }
        }

        // 顶层兜底：state.theme / state.scratchGui.theme.color
        const top = s && (s.theme || (s.scratchGui && s.scratchGui.theme));
        if (top && top.color) {
            const p = _normalizeHex(top.color);
            if (p) return { primary: p, secondary: DEFAULT_SECONDARY };
        }
    } catch (_) { /* ignore store shape 变化 */ }
    return null;
}

function _getCssVarColor () {
    try {
        const root = document.documentElement;
        const get = name => {
            const v = (root.style.getPropertyValue(name) ||
                       getComputedStyle(root).getPropertyValue(name) ||
                       '').trim();
            return v;
        };
        let primary   = get('--ui-primary');
        let secondary = get('--ui-secondary');

        // 嵌套 var(...) 永远展开不了，放弃
        if (primary && primary.startsWith('var('))   primary   = '';
        if (secondary && secondary.startsWith('var(')) secondary = '';

        primary   = _normalizeHex(primary);
        secondary = _normalizeHex(secondary);
        if (primary || secondary) return {
            primary:   primary   || DEFAULT_PRIMARY,
            secondary: secondary || DEFAULT_SECONDARY
        };
    } catch (_) { /* SSR 或无 DOM */ }
    return null;
}

function _getLocalStorageThemeColor () {
    try {
        let raw = null;
        try { raw = window.localStorage && window.localStorage.getItem('scratchTheme'); } catch (_) {}
        if (!raw) raw = window.__THEME__;
        if (!raw) return null;
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!obj || typeof obj !== 'object') return null;
        const p = _normalizeHex(obj['ui-primary'] || obj.primary || obj.accent);
        if (p) return { primary: p, secondary: DEFAULT_SECONDARY };
    } catch (_) { /* parse 失败 */ }
    return null;
}

/**
 * 每次调用都会按优先级读一遍，**不缓存**。
 * 这样父组件或子组件在用户切主题时只需要重新 render，就能拿到新色。
 */
export default function getEditorColors () {
    return _getReduxThemeColor()
        || _getCssVarColor()
        || _getLocalStorageThemeColor()
        || { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };
}

export const DEFAULT_COLORS = { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };

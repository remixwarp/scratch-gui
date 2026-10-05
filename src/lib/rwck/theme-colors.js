/**
 * 从 scratch-gui 运行时读取编辑器主题的强调色（accent color）。
 * 优先顺序：Redux store 的 state.scratchGui.theme.theme.accent
 *         → 读 CSS var(--ui-primary) / --ui-secondary
 *         → 兜底 #4c97ff / #333
 *
 * 在发布窗口里，所有带颜色的按钮 / 边框 / 标题栏都会用它，做到
 * 和编辑器当前主题一致。
 */

const DEFAULT_PRIMARY   = '#4c97ff';
const DEFAULT_SECONDARY = '#333';

function _getReduxThemeColor() {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const s = store.getState();
            const theme = s && s.scratchGui && s.scratchGui.theme && s.scratchGui.theme.theme;
            if (theme && theme.accent && typeof theme.accent === 'object') {
                const uiP = theme.accent['ui-primary'];
                const uiS = theme.accent['ui-secondary'];
                if (uiP || uiS) return {
                    primary:   uiP || DEFAULT_PRIMARY,
                    secondary: uiS || DEFAULT_SECONDARY
                };
            }
            if (theme && theme.accent && typeof theme.accent === 'string') {
                return {primary: theme.accent, secondary: DEFAULT_SECONDARY};
            }
        }
    } catch (_) {}
    return null;
}

function _getCssVarColor() {
    const root = document.documentElement;
    const get = name => {
        const v = root.style.getPropertyValue(name) || getComputedStyle(root).getPropertyValue(name);
        return v && v.trim();
    };
    let primary   = get('--ui-primary');
    let secondary = get('--ui-secondary');
    if (primary && primary.startsWith('var(')) primary = '';      // 嵌套 var 无法展开
    if (secondary && secondary.startsWith('var(')) secondary = '';
    if (primary || secondary) return {
        primary:   primary   || DEFAULT_PRIMARY,
        secondary: secondary || DEFAULT_SECONDARY
    };
    return null;
}

export default function getEditorColors() {
    return _getReduxThemeColor() || _getCssVarColor() || {primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY};
}

export const DEFAULT_COLORS = {primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY};

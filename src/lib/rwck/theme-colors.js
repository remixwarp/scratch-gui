/**
 * 发布窗口主题取色 —— 新逻辑（整窗配色全部来自编辑器当前主题）。
 *
 * 旧逻辑只从 --ui-primary 里抠一个十六进制色，其余文字 / 背景 / 边框全是写死的
 * 浅色（#fff / #e5e7eb / #64748b / #94a3b8 …），所以暗色主题下窗口依然是白底黑字。
 *
 * 新逻辑：
 *   1. 直接取 Redux 里当前的 Theme 实例（state.scratchGui.theme.theme），
 *      调 Theme.getGuiColors() 拿到「accent → gui → light」合并后的完整调色板，
 *      也就是编辑器此刻真正在用的那一套颜色（含用户自定义 accent / 自定义主题）。
 *   2. 明暗判定用 Theme.isDark()（本质是 guiColors['color-scheme'] === 'dark'），
 *      拿不到时退回用背景色相对亮度算，保证自定义主题也能判对。
 *   3. 所有派生色（文字层级 / 边框 / 输入框 / 状态条 / 阴影 / 按钮前景）都由基础色
 *      按亮度关系推导，并做对比度兜底，不再写死任何浅色。
 *   4. 拿不到 Redux 时退回读 <html> 上的 CSS 变量（applyGuiColors 一定会写这一整套）。
 *   5. subscribeThemeChange(cb)：用户切换主题 / 强调色时回调，窗口可以重渲染。
 */

const WHITE = {r: 255, g: 255, b: 255, a: 1};
const BLACK = {r: 0, g: 0, b: 0, a: 1};
const TRANSPARENT = {r: 0, g: 0, b: 0, a: 0};

// 从 CSS 变量读不到时的兜底（对应 scratch-gui 的 light / dark 两套 gui 色）
const FALLBACK_LIGHT = {
    'color-scheme': 'light',
    'ui-primary': 'hsla(215, 100%, 95%, 1)',
    'ui-secondary': 'hsla(215, 75%, 95%, 1)',
    'ui-tertiary': 'hsla(215, 50%, 90%, 1)',
    'ui-white': '#ffffff',
    'ui-black-transparent': 'hsla(0, 0%, 0%, 0.15)',
    'text-primary': 'hsla(225, 15%, 30%, 1)',
    'ui-modal-background': '#ffffff',
    'ui-modal-foreground': 'hsla(225, 15%, 40%, 1)',
    'input-background': '#ffffff',
    'link-color': '#2255dd',
    'looks-secondary': 'hsla(215, 100%, 65%, 1)',
    'extensions-primary': 'hsla(163, 85%, 40%, 1)',
    'red-primary': 'hsla(20, 100%, 55%, 1)',
    'error-primary': 'hsla(30, 100%, 55%, 1)'
};
const FALLBACK_DARK = {
    'color-scheme': 'dark',
    'ui-primary': '#111111',
    'ui-secondary': '#1e1e1e',
    'ui-tertiary': '#2e2e2e',
    'ui-white': '#111111',
    'ui-black-transparent': '#ffffff26',
    'text-primary': '#eeeeee',
    'ui-modal-background': '#111111',
    'ui-modal-foreground': '#eeeeee',
    'input-background': '#1e1e1e',
    'link-color': '#44aaff',
    'looks-secondary': 'hsla(215, 100%, 65%, 1)',
    'extensions-primary': 'hsla(163, 85%, 40%, 1)',
    'red-primary': 'hsla(20, 100%, 55%, 1)',
    'error-primary': 'hsla(30, 100%, 55%, 1)'
};

// 需要从 CSS 变量兜底读取的键
const CSS_VAR_KEYS = Object.keys(FALLBACK_LIGHT);

/* ============================ 颜色工具 ============================ */

/** 把任意 CSS 颜色（hex / rgb / rgba / hsl / hsla）解析成 {r,g,b,a}。var() 返回 null。 */
function parseColor (value) {
    if (typeof value !== 'string') return null;
    const v = value.trim();
    if (!v || v.startsWith('var(')) return null;

    if (v.charAt(0) === '#') {
        const hex = v.slice(1);
        let r;
        let g;
        let b;
        let a = 1;
        if (/^[0-9a-fA-F]{3}$/.test(hex)) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
            a = parseInt(hex[3] + hex[3], 16) / 255;
        } else if (/^[0-9a-fA-F]{6}$/.test(hex)) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else if (/^[0-9a-fA-F]{8}$/.test(hex)) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
            a = parseInt(hex.slice(6, 8), 16) / 255;
        } else {
            return null;
        }
        return {r, g, b, a};
    }

    const fn = v.match(/^(rgba?|hsla?)\(([^)]*)\)$/i);
    if (!fn) return null;
    const raw = fn[2].split(/[,\s/]+/).filter(Boolean);
    if (raw.length < 3) return null;
    // 注意 hsl() 里带百分号（85%），必须用 parseFloat 而不是 Number
    const nums = raw.map(s => parseFloat(String(s).replace('%', '')));
    if (nums.slice(0, 3).some(n => isNaN(n))) return null;
    const alpha = nums.length > 3 && !isNaN(nums[3]) ? nums[3] : 1;

    if (fn[1].toLowerCase().indexOf('hsl') === 0) {
        const rgb = hslToRgb(nums[0], nums[1] / 100, nums[2] / 100);
        return {r: rgb.r, g: rgb.g, b: rgb.b, a: alpha};
    }
    return {r: nums[0], g: nums[1], b: nums[2], a: alpha};
}

function hslToRgb (h, s, l) {
    const hue = ((h % 360) + 360) % 360 / 360;
    if (s === 0) {
        const v = Math.round(l * 255);
        return {r: v, g: v, b: v};
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = t => {
        let x = t;
        if (x < 0) x += 1;
        if (x > 1) x -= 1;
        if (x < 1 / 6) return p + (q - p) * 6 * x;
        if (x < 1 / 2) return q;
        if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
        return p;
    };
    return {
        r: Math.round(hue2rgb(hue + 1 / 3) * 255),
        g: Math.round(hue2rgb(hue) * 255),
        b: Math.round(hue2rgb(hue - 1 / 3) * 255)
    };
}

const clampByte = n => Math.max(0, Math.min(255, Math.round(n)));
const toRgb = c => `rgb(${clampByte(c.r)}, ${clampByte(c.g)}, ${clampByte(c.b)})`;
const toRgba = (c, a) => `rgba(${clampByte(c.r)}, ${clampByte(c.g)}, ${clampByte(c.b)}, ${a})`;

/** 两个颜色按 t（0→a，1→b）混合，结果不透明。 */
function mix (a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    return {
        r: a.r + (b.r - a.r) * k,
        g: a.g + (b.g - a.g) * k,
        b: a.b + (b.b - a.b) * k,
        a: 1
    };
}

/** 相对亮度（WCAG）。 */
function luminance (c) {
    const f = x => {
        const v = x / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/** 对比度（WCAG），1 ~ 21。 */
function contrast (a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
}

/** 在 bg 上更清楚的前景（黑或白）。 */
function readableOn (bg) {
    const base = bg || WHITE;
    return contrast(WHITE, base) >= contrast(BLACK, base) ? WHITE : BLACK;
}

/**
 * 保证 fg 在 bg 上至少有 min 的对比度：不够就把 fg 往「远离 bg」的方向推。
 * 用于在纯黑 accent 这类极端主题下，依然看得见强调色。
 */
function ensureContrast (fg, bg, min = 3) {
    if (!fg || !bg) return readableOn(bg || WHITE);
    if (contrast(fg, bg) >= min) return fg;
    const target = luminance(bg) < 0.5 ? WHITE : BLACK;
    let cur = fg;
    for (let i = 0; i < 24; i++) {
        cur = mix(cur, target, 0.12);
        if (contrast(cur, bg) >= min) return cur;
    }
    return readableOn(bg);
}

/* ============================ 取主题 ============================ */

function getThemeInstance () {
    try {
        const store = typeof window !== 'undefined' ? window.ReduxStore : null;
        if (!store || typeof store.getState !== 'function') return null;
        const state = store.getState();
        const themeState = state && state.scratchGui && state.scratchGui.theme;
        return (themeState && themeState.theme) || null;
    } catch (_) {
        return null;
    }
}

/** 优先从 Theme 实例取整套 guiColors（accent → gui → light 已合并）。 */
function readFromTheme () {
    const theme = getThemeInstance();
    if (!theme) return null;

    let gui = null;
    if (typeof theme.getGuiColors === 'function') {
        try {
            gui = theme.getGuiColors();
        } catch (_) { /* ignore */ }
    }
    if (!gui && typeof theme.guiColors === 'object') gui = theme.guiColors;
    if (!gui || typeof gui !== 'object') return null;

    let isDark = null;
    if (typeof theme.isDark === 'function') {
        try {
            isDark = !!theme.isDark();
        } catch (_) { /* ignore */ }
    }
    return {gui, isDark};
}

/** 兜底：读 <html> 上的 CSS 变量（applyGuiColors 每次切主题都会重写）。 */
function readFromCssVars () {
    if (typeof document === 'undefined' || !document.documentElement) return null;
    const root = document.documentElement;
    const computed = typeof getComputedStyle === 'function' ? getComputedStyle(root) : null;
    const read = name => {
        const inline = root.style ? root.style.getPropertyValue(name) : '';
        const resolved = computed ? computed.getPropertyValue(name) : '';
        const v = (inline || resolved || '').trim();
        return v && !v.startsWith('var(') ? v : '';
    };

    const scheme = read('--color-scheme');
    const isDark = scheme ? scheme === 'dark' : null;
    const base = isDark ? FALLBACK_DARK : FALLBACK_LIGHT;

    const gui = {};
    for (const key of CSS_VAR_KEYS) {
        const value = read(`--${key}`);
        if (value) gui[key] = value;
        else if (base[key]) gui[key] = base[key];
    }
    return {gui, isDark};
}

/* ============================ 组色板 ============================ */

function buildPalette (gui, isDarkHint) {
    const pick = (...names) => {
        for (const name of names) {
            const c = parseColor(gui[name]);
            if (c && c.a > 0.05) return {r: c.r, g: c.g, b: c.b, a: 1};
        }
        return null;
    };

    const scheme = typeof gui['color-scheme'] === 'string' ? gui['color-scheme'] : '';
    let isDark = scheme ? scheme === 'dark' : isDarkHint;

    const surfaceBase = pick('ui-modal-background', 'ui-white', 'page-background');
    if (isDark === null || isDark === undefined) {
        isDark = surfaceBase ? luminance(surfaceBase) < 0.4 : false;
    }

    const fallback = isDark ? FALLBACK_DARK : FALLBACK_LIGHT;
    const surface = surfaceBase || parseColor(fallback['ui-modal-background']);
    const surfaceRaised = pick('ui-white', 'popover-background') || surface;
    const surfaceSunken = pick('ui-secondary') || mix(surface, isDark ? BLACK : WHITE, 0.04);
    const surfaceAlt = pick('ui-tertiary') || mix(surface, isDark ? WHITE : BLACK, 0.08);

    const text = pick('text-primary', 'ui-modal-foreground', 'page-foreground') ||
        parseColor(fallback['text-primary']);
    const textMuted = mix(text, surface, 0.34);
    const textSubtle = mix(text, surface, 0.55);

    const borderRaw = parseColor(gui['ui-black-transparent'] || fallback['ui-black-transparent']);
    const border = borderRaw && borderRaw.a > 0 ? toRgba(borderRaw, borderRaw.a) : toRgba(text, 0.18);
    const borderStrong = toRgba(mix(surface, isDark ? WHITE : BLACK, 0.34), 0.85);

    // 强调色：编辑器菜单栏 / 弹窗标题栏用的那个（accent 会覆盖 looks-secondary）
    const accentRaw = pick('looks-secondary', 'drop-highlight', 'ui-modal-header-background', 'link-color') ||
        parseColor(fallback['looks-secondary']);
    const accent = ensureContrast(accentRaw, surface, isDark ? 2.4 : 2.2);
    // 编辑器自己在菜单栏上用的前景色（一般是白色），优先沿用，保证观感一致
    const accentTextRaw = pick('menu-bar-foreground', 'ui-modal-header-foreground');
    const accentText = (accentTextRaw && contrast(accentTextRaw, accent) >= 1.8) ?
        accentTextRaw : readableOn(accent);
    const accentSoft = toRgba(accent, isDark ? 0.24 : 0.13);
    const accentBorder = toRgba(accent, isDark ? 0.45 : 0.32);

    const link = pick('link-color') || accent;

    const success = ensureContrast(pick('extensions-primary', 'pen-primary') || parseColor(fallback['extensions-primary']), surface, 3);
    const danger = ensureContrast(pick('red-primary', 'error-primary') || parseColor(fallback['red-primary']), surface, 3);
    const warning = ensureContrast(pick('error-primary', 'control-primary') || parseColor(fallback['error-primary']), surface, 3);

    const inputBackground = pick('input-background') || surfaceRaised;

    return {
        isDark,
        // 面
        surface: toRgb(surface),
        surfaceRaised: toRgb(surfaceRaised),
        surfaceSunken: toRgb(surfaceSunken),
        surfaceAlt: toRgb(surfaceAlt),
        // 字
        text: toRgb(text),
        textMuted: toRgb(textMuted),
        textSubtle: toRgb(textSubtle),
        textOnAccent: toRgb(accentText),
        // 线
        border,
        borderStrong,
        // 强调
        accent: toRgb(accent),
        accentText: toRgb(accentText),
        accentSoft,
        accentBorder,
        link: toRgb(link),
        // 状态
        success: toRgb(success),
        danger: toRgb(danger),
        warning: toRgb(warning),
        successText: toRgb(readableOn(success)),
        dangerText: toRgb(readableOn(danger)),
        successSoft: toRgba(success, 0.16),
        successBorder: toRgba(success, 0.4),
        dangerSoft: toRgba(danger, 0.16),
        dangerBorder: toRgba(danger, 0.4),
        warningSoft: toRgba(warning, 0.16),
        // 输入
        inputBackground: toRgb(inputBackground),
        // 阴影
        shadowSm: isDark ? '0 1px 2px rgba(0, 0, 0, 0.5)' : '0 1px 2px rgba(15, 23, 42, 0.06)',
        shadowMd: isDark ? '0 2px 8px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.3)' :
            '0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
        shadowLg: isDark ? '0 8px 24px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35)' :
            '0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)',
        scrollbarThumb: toRgba(mix(surface, isDark ? WHITE : BLACK, 0.45), 0.6),
        // 弹窗遮罩：从当前主题背景推出来的半透明黑
        overlay: toRgba(mix(surface, BLACK, 0.8), isDark ? 0.66 : 0.5),
        // 兼容旧字段
        primary: toRgb(accent),
        secondary: toRgb(textMuted)
    };
}

/** 每次调用都重新读一遍（不缓存），切主题后重新 render 即可拿到新色。 */
export default function getEditorTheme () {
    const fromTheme = readFromTheme();
    if (fromTheme) return buildPalette(fromTheme.gui, fromTheme.isDark);
    const fromCss = readFromCssVars();
    if (fromCss) return buildPalette(fromCss.gui, fromCss.isDark);
    return buildPalette(FALLBACK_LIGHT, false);
}

/** 兼容旧调用名。 */
export const getEditorColors = getEditorTheme;

/* ============================ 主题变化订阅 ============================ */

const paletteKey = p => JSON.stringify(p);

/**
 * 主题（gui / accent / 自定义主题）变化时回调。
 * 同时监听 Redux store 和 <html style>（applyGuiColors 写 CSS 变量的地方）。
 * @param {function} callback 收到新的色板
 * @returns {function} 取消订阅
 */
export function subscribeThemeChange (callback) {
    const noop = () => {};
    if (typeof window === 'undefined' || typeof callback !== 'function') return noop;

    const cleanups = [];
    let timer = null;
    let lastKey = null;

    const fire = () => {
        timer = null;
        const next = getEditorTheme();
        const key = paletteKey(next);
        if (key === lastKey) return;
        lastKey = key;
        try {
            callback(next);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[rwck] theme change handler failed:', e);
        }
    };
    const schedule = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fire, 60);
    };

    lastKey = paletteKey(getEditorTheme());

    const store = window.ReduxStore;
    if (store && typeof store.subscribe === 'function') {
        let lastTheme = getThemeInstance();
        const unsubscribe = store.subscribe(() => {
            const current = getThemeInstance();
            if (current !== lastTheme) {
                lastTheme = current;
                schedule();
            }
        });
        cleanups.push(() => {
            try {
                unsubscribe();
            } catch (_) { /* ignore */ }
        });
    }

    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.attributeName === 'style') {
                    schedule();
                    return;
                }
            }
        });
        try {
            observer.observe(document.documentElement, {attributes: true, attributeFilter: ['style']});
            cleanups.push(() => observer.disconnect());
        } catch (_) { /* ignore */ }
    }

    return () => {
        if (timer) clearTimeout(timer);
        for (const fn of cleanups) {
            try {
                fn();
            } catch (_) { /* ignore */ }
        }
    };
}

export {WHITE, BLACK, TRANSPARENT};

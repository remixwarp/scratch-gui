import icon from '!!raw-loader!../icons/neumorphism-light.svg';

/**
 * 新拟物浅 (Neumorphism Light) GUI 主题
 * 依据新拟物设计风格：同色系浅灰背景 + 双重柔和阴影（左上亮、右下暗）。
 */

const name = {
    defaultMessage: '新拟物浅',
    description: 'Label for the neumorphism light GUI theme',
    id: 'tw.theme.gui.neumorphism-light'
};

// 新拟物设计令牌
const NEU_BG = '#e0e5ec';            // 主背景 / 同色系表面
const NEU_BG_SECONDARY = '#f0f0f3';  // 次级背景
const NEU_BG_TERTIARY = '#e6ebf2';   // 三级背景
const NEU_SHADOW_DARK = '#b8bcc2';   // 暗部阴影（右下）
const NEU_SHADOW_LIGHT = '#ffffff';  // 亮部高光（左上）
const NEU_TEXT = '#4b5563';          // 正文（gray-600）
const NEU_TEXT_STRONG = '#374151';   // 较强文本（gray-700）
const NEU_TEXT_HEADING = '#1f2937';  // 标题（gray-800）
const NEU_ACCENT = '#6d5dfc';        // 主强调色（紫）
const NEU_ACCENT_DARK = '#5a4bd6';   // 强调色暗部

const guiColors = {
    'color-scheme': 'light',

    'ui-primary': NEU_BG,
    'ui-secondary': NEU_BG,
    'ui-tertiary': NEU_BG_TERTIARY,

    'ui-modal-overlay': 'rgba(184, 188, 194, 0.55)',
    'ui-modal-background': NEU_BG,
    'ui-modal-foreground': NEU_TEXT,
    'ui-modal-header-background': NEU_BG,
    'ui-modal-header-foreground': NEU_TEXT_HEADING,

    'ui-white': NEU_SHADOW_LIGHT,
    'ui-white-dim': 'rgba(255, 255, 255, 0.75)',
    'ui-white-transparent': 'rgba(255, 255, 255, 0.25)',
    'ui-transparent': 'rgba(255, 255, 255, 0)',

    'ui-black-transparent': 'rgba(0, 0, 0, 0.12)',

    'text-primary': NEU_TEXT,
    'text-primary-transparent': 'rgba(75, 85, 99, 0.75)',

    'motion-primary': 'hsla(215, 100%, 75%, 1)',
    'motion-primary-transparent': 'hsla(215, 100%, 75%, 0.9)',
    'motion-tertiary': 'hsla(215, 60%, 65%, 1)',

    'looks-secondary': NEU_ACCENT,
    'looks-transparent': 'rgba(109, 93, 252, 0.35)',
    'looks-light-transparent': 'rgba(109, 93, 252, 0.15)',
    'looks-secondary-dark': NEU_ACCENT_DARK,

    'red-primary': 'hsla(20, 100%, 65%, 1)',
    'red-tertiary': 'hsla(20, 100%, 55%, 1)',

    'sound-primary': 'hsla(300, 53%, 72%, 1)',
    'sound-tertiary': 'hsla(300, 48%, 62%, 1)',

    'control-primary': 'hsla(38, 100%, 72%, 1)',

    'data-primary': 'hsla(30, 100%, 70%, 1)',

    'pen-primary': 'hsla(163, 85%, 68%, 1)',
    'pen-transparent': 'hsla(163, 85%, 68%, 0.25)',
    'pen-tertiary': 'hsla(163, 86%, 58%, 1)',

    'error-primary': 'hsla(30, 100%, 68%, 1)',
    'error-light': 'hsla(30, 100%, 78%, 1)',
    'error-transparent': 'hsla(30, 100%, 68%, 0.25)',

    'extensions-primary': 'hsla(163, 85%, 68%, 1)',
    'extensions-tertiary': 'hsla(163, 85%, 58%, 1)',
    'extensions-transparent': 'hsla(163, 85%, 68%, 0.35)',
    'extensions-light': 'hsla(163, 57%, 85%, 1)',

    'drop-highlight': 'hsla(215, 100%, 85%, 1)',

    'menu-bar-background': NEU_BG,
    'menu-bar-background-image': 'none',
    'icon-style': 'brightness(0.35)',
    'menu-bar-feedback': NEU_TEXT_STRONG,
    'menu-bar-foreground': NEU_TEXT,

    'assets-background': NEU_BG,

    'input-background': NEU_BG,

    'popover-background': NEU_BG,

    'shadow': 'rgba(184, 188, 194, 0.6)',

    'badge-background': NEU_BG,
    'badge-border': NEU_SHADOW_DARK,

    'fullscreen-background': NEU_BG,
    'fullscreen-accent': NEU_BG_TERTIARY,

    'page-background': NEU_BG,
    'page-foreground': NEU_TEXT_HEADING,

    'project-title-inactive': 'rgba(75, 85, 99, 0.45)',
    'project-title-hover': 'rgba(75, 85, 99, 0.75)',

    'link-color': NEU_ACCENT_DARK,

    'filter-icon-black': 'none',
    'filter-icon-gray': 'grayscale(100%)',
    'filter-icon-white': 'none',

    'paint-ui-pane-border': 'rgba(184, 188, 194, 0.9)',
    'paint-text-primary': 'var(--text-primary)',
    'paint-form-border': 'rgba(184, 188, 194, 0.9)',
    'paint-looks-secondary': 'var(--looks-secondary)',
    'paint-looks-transparent': 'var(--looks-transparent)',
    'paint-input-background': 'var(--input-background)',
    'paint-popover-background': 'var(--popover-background)',
    'paint-filter-icon-gray': 'none'
};

const blockColors = {
    workspace: NEU_BG,
    toolbox: NEU_BG,
    flyout: NEU_BG,
    // 积木文字保持白色，但在新拟物浅背景下输入字段使用深色文字
    text: '#FFFFFF',
    toolboxText: NEU_TEXT,
    blackText: NEU_TEXT,
    textFieldText: NEU_TEXT,
    flyoutLabelColor: NEU_TEXT
};

export {
    name,
    icon,
    guiColors,
    blockColors
};

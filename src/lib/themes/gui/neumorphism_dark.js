import icon from '!!raw-loader!../icons/neumorphism-dark.svg';

/**
 * 新拟物深 (Neumorphism Dark) GUI 主题
 * 依据新拟物设计风格（深色变体）：同色系深灰蓝背景 + 双重柔和阴影
 * （左上亮、右下暗），光源固定左上，凸起用外阴影、凹陷用内阴影。
 */

const name = {
    defaultMessage: '新拟物深',
    description: 'Label for the neumorphism dark GUI theme',
    id: 'tw.theme.gui.neumorphism-dark'
};

// 新拟物深设计令牌（同色系深灰蓝表面）
const NEU_BG = '#2b2f36';            // 主背景 / 同色系表面
const NEU_BG_SECONDARY = '#343a42';  // 次级背景（亮表面）
const NEU_BG_TERTIARY = '#2e333b';   // 三级背景
const NEU_SHADOW_DARK = '#1b1e23';   // 暗部阴影（右下，比背景更暗）
const NEU_SHADOW_LIGHT = '#3b424c';  // 亮部高光（左上，比背景更亮）
const NEU_TEXT = '#c2c7cf';          // 正文（浅灰）
const NEU_TEXT_STRONG = '#d8dce3';   // 较强文本
const NEU_TEXT_HEADING = '#eef1f6';  // 标题（近白）
const NEU_ACCENT = '#7c6dff';        // 主强调色（亮紫）
const NEU_ACCENT_DARK = '#6a5af0';   // 强调色暗部

const guiColors = {
    'color-scheme': 'dark',

    'ui-primary': NEU_BG,
    'ui-secondary': NEU_BG,
    'ui-tertiary': NEU_BG_TERTIARY,

    'ui-modal-overlay': 'rgba(10, 12, 14, 0.6)',
    'ui-modal-background': NEU_BG,
    'ui-modal-foreground': NEU_TEXT,
    'ui-modal-header-background': NEU_BG,
    'ui-modal-header-foreground': NEU_TEXT_HEADING,

    'ui-white': NEU_BG_SECONDARY,
    'ui-white-dim': 'rgba(255, 255, 255, 0.7)',
    'ui-white-transparent': 'rgba(255, 255, 255, 0.2)',
    'ui-transparent': 'rgba(255, 255, 255, 0)',

    'ui-black-transparent': 'rgba(255, 255, 255, 0.08)',

    'text-primary': NEU_TEXT,
    'text-primary-transparent': 'rgba(194, 199, 207, 0.75)',

    'motion-primary': 'hsla(215, 100%, 78%, 1)',
    'motion-primary-transparent': 'hsla(215, 100%, 78%, 0.9)',
    'motion-tertiary': 'hsla(215, 60%, 68%, 1)',

    'looks-secondary': NEU_ACCENT,
    'looks-transparent': 'rgba(124, 109, 255, 0.35)',
    'looks-light-transparent': 'rgba(124, 109, 255, 0.15)',
    'looks-secondary-dark': NEU_ACCENT_DARK,

    'red-primary': 'hsla(20, 100%, 68%, 1)',
    'red-tertiary': 'hsla(20, 100%, 58%, 1)',

    'sound-primary': 'hsla(300, 53%, 75%, 1)',
    'sound-tertiary': 'hsla(300, 48%, 65%, 1)',

    'control-primary': 'hsla(38, 100%, 75%, 1)',

    'data-primary': 'hsla(30, 100%, 73%, 1)',

    'pen-primary': 'hsla(163, 85%, 70%, 1)',
    'pen-transparent': 'hsla(163, 85%, 70%, 0.25)',
    'pen-tertiary': 'hsla(163, 86%, 60%, 1)',

    'error-primary': 'hsla(30, 100%, 70%, 1)',
    'error-light': 'hsla(30, 100%, 80%, 1)',
    'error-transparent': 'hsla(30, 100%, 70%, 0.25)',

    'extensions-primary': 'hsla(163, 85%, 70%, 1)',
    'extensions-tertiary': 'hsla(163, 85%, 60%, 1)',
    'extensions-transparent': 'hsla(163, 85%, 70%, 0.35)',
    'extensions-light': 'hsla(163, 57%, 85%, 1)',

    'drop-highlight': 'hsla(215, 100%, 85%, 1)',

    'menu-bar-background': NEU_BG,
    'menu-bar-background-image': 'none',
    'icon-style': 'brightness(0) invert(0.9)',
    'menu-bar-feedback': NEU_TEXT_STRONG,
    'menu-bar-foreground': NEU_TEXT,

    'assets-background': NEU_BG,

    'input-background': NEU_BG,

    'popover-background': NEU_BG,

    'shadow': 'rgba(10, 12, 14, 0.55)',

    'badge-background': NEU_BG,
    'badge-border': NEU_SHADOW_DARK,

    'fullscreen-background': NEU_BG,
    'fullscreen-accent': NEU_BG_TERTIARY,

    'page-background': NEU_BG,
    'page-foreground': NEU_TEXT_HEADING,

    'project-title-inactive': 'rgba(194, 199, 207, 0.4)',
    'project-title-hover': 'rgba(194, 199, 207, 0.75)',

    'link-color': NEU_ACCENT_DARK,

    'filter-icon-black': 'invert(100%)',
    'filter-icon-gray': 'grayscale(100%) brightness(1.7)',
    'filter-icon-white': 'brightness(0) invert(100%)',

    'paint-ui-pane-border': 'rgba(255, 255, 255, 0.12)',
    'paint-text-primary': 'var(--text-primary)',
    'paint-form-border': 'rgba(255, 255, 255, 0.12)',
    'paint-looks-secondary': 'var(--looks-secondary)',
    'paint-looks-transparent': 'var(--looks-transparent)',
    'paint-input-background': 'var(--input-background)',
    'paint-popover-background': 'var(--popover-background)',
    'paint-filter-icon-gray': 'brightness(1.7)'
};

const blockColors = {
    workspace: NEU_BG,
    toolbox: NEU_BG,
    flyout: NEU_BG,
    // 积木文字保持白色，但在新拟物深背景下输入字段使用浅色文字
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

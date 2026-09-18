// 纯黑主题色 —— 整个 UI 全部换成黑/白两色.
// 用户切换到色盲主题(gui 是 colorblind-dark / colorblind-light)时
// 自动锁死 accent='black', 而 black accent 就是让所有强调元素
// 统一成黑色的最终落点.
//
// defaultsDeep 合并优先级:
//   getGuiColors = accent → GUI → light
//   getBlockColors = accent → GUI.blocks → three.js
// 所以只要 black.js 覆盖了足够多的属性, 整个 UI 就是纯黑的.

const guiColors = {
    'color-scheme': 'dark',

    // 所有 motion/looks/extensions/pen/drop-highlight 等 accent 变量统一成黑
    'motion-primary': '#000000',
    'motion-primary-transparent': 'rgba(0, 0, 0, 0.9)',
    'motion-secondary': '#000000',
    'motion-tertiary': '#000000',

    'looks-secondary': '#000000',
    'looks-tertiary': '#000000',
    'looks-transparent': 'rgba(0, 0, 0, 0.35)',
    'looks-light-transparent': 'rgba(0, 0, 0, 0.15)',
    'looks-secondary-dark': '#111111',

    'extensions-primary': '#000000',
    'extensions-secondary': '#000000',
    'extensions-tertiary': '#000000',
    'extensions-transparent': 'rgba(0, 0, 0, 0.35)',
    'extensions-light': '#111111',

    'drop-highlight': '#000000',

    // UI 背景全部纯黑
    'ui-primary': '#000000',
    'ui-secondary': '#000000',
    'ui-tertiary': '#000000',

    'ui-modal-overlay': '#000000',
    'ui-modal-background': '#000000',
    'ui-modal-foreground': '#ffffff',
    'ui-modal-header-background': '#000000',
    'ui-modal-header-foreground': '#ffffff',

    'ui-white': '#000000',
    'ui-white-dim': 'rgba(0, 0, 0, 0.75)',
    'ui-white-transparent': 'rgba(0, 0, 0, 0.25)',
    'ui-transparent': 'rgba(0, 0, 0, 0)',

    'ui-black-transparent': 'rgba(255, 255, 255, 0.15)',

    'text-primary': '#ffffff',
    'text-primary-transparent': 'rgba(255, 255, 255, 0.75)',

    // 菜单栏
    'menu-bar-background': '#000000',
    'menu-bar-background-image': 'none',
    'menu-bar-foreground': '#ffffff',

    // 其他 UI 元素
    'assets-background': '#000000',
    'input-background': '#000000',
    'popover-background': '#000000',
    'shadow': 'rgba(0, 0, 0, 0)',
    'badge-background': '#000000',
    'badge-border': '#000000',

    'fullscreen-background': '#000000',
    'fullscreen-accent': '#000000',

    'page-background': '#000000',
    'page-foreground': '#ffffff',

    'project-title-inactive': 'rgba(255, 255, 255, 0.25)',
    'project-title-hover': 'rgba(255, 255, 255, 0.15)',

    'link-color': '#ffffff',

    // Paint 相关
    'paint-ui-pane-border': '#000000',
    'paint-text-primary': '#ffffff',
    'paint-form-border': '#000000',
    'paint-looks-secondary': '#000000',
    'paint-looks-transparent': 'rgba(0, 0, 0, 0.25)',
    'paint-input-background': '#000000',
    'paint-popover-background': '#000000',
    'paint-filter-icon-gray': 'brightness(1.7)',

    // 红色/紫色等错误或特殊元素也统一掉
    'red-primary': '#000000',
    'red-tertiary': '#000000',
    'error-primary': '#000000',
    'error-light': '#111111',
    'error-transparent': 'rgba(0, 0, 0, 0.25)',
    'pen-primary': '#000000',
    'pen-tertiary': '#000000',
    'pen-transparent': 'rgba(0, 0, 0, 0.25)',
    'sound-primary': '#000000',
    'sound-tertiary': '#000000',
    'control-primary': '#000000',
    'data-primary': '#000000',

    // 图标过滤 — 反转白底图标, 让它们在黑底上变成白底黑图
    'filter-icon-black': 'invert(100%)',
    'filter-icon-gray': 'grayscale(100%) brightness(1.7)',
    'filter-icon-white': 'brightness(0) invert(100%)'
};

// 积木分类颜色全部统一成纯黑
const makeAllBlack = {
    primary: '#000000',
    secondary: '#000000',
    tertiary: '#000000',
    quaternary: '#000000'
};

const blockColors = {
    motion:     makeAllBlack,
    looks:      makeAllBlack,
    sounds:     makeAllBlack,
    event:      makeAllBlack,
    control:    makeAllBlack,
    sensing:    makeAllBlack,
    pen:        makeAllBlack,
    operators:  makeAllBlack,
    data:       makeAllBlack,
    data_lists: makeAllBlack,
    more:       makeAllBlack,
    addons:     makeAllBlack,
    patch:      makeAllBlack,
    strings:    makeAllBlack,
    assets:     makeAllBlack,

    // 积木文字白色, 在黑积木上清晰可读
    text: '#FFFFFF',
    blackText: '#575E75',
    textFieldText: '#575E75',

    // Blockly 容器背景统一成深灰/纯黑保持对比
    workspace: '#000000',
    toolbox: '#000000',
    toolboxSelected: '#000000',
    toolboxText: '#ffffff',
    flyout: '#000000',
    insertionMarker: '#cccccc',
    scrollbar: '#444444',
    scrollbarHover: '#444444',
    valueReportBackground: '#000000',
    valueReportBorder: '#222222',
    valueReportForeground: '#ffffff',
    contextMenuBackground: '#000000',
    contextMenuBorder: '#ffffff26',
    contextMenuForeground: '#ffffff',
    contextMenuActiveBackground: '#1a1a1a',
    contextMenuDisabledForeground: '#666666',
    flyoutLabelColor: '#cccccc',
    checkboxInactiveBackground: '#111111',
    checkboxInactiveBorder: '#c8c8c8',
    checkboxActiveBackground: '#000000',
    checkboxActiveBorder: '#222222',
    checkboxCheck: '#ffffff',
    buttonBorder: '#444444',
    buttonActiveBackground: '#000000',
    buttonForeground: '#ffffff',
    zoomIconFilter: 'invert(100%)',
    gridColor: '#222222',
    fieldShadow: 'rgba(0,0,0,0.3)',
    numPadBackground: '#111111',
    numPadBorder: '#222222',
    numPadActiveBackground: '#222222',
    numPadText: '#ffffff'
};

export {
    guiColors,
    blockColors
};

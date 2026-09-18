import icon from '!!raw-loader!../icons/colorblind-dark.svg';

const name = {
    defaultMessage: 'Colorblind Dark',
    description: 'Dark theme (Midnight-like) with pure black menu bar for color blindness accessibility',
    id: 'tw.theme.gui.colorblind-dark'
};

const guiColors = {
    'color-scheme': 'dark',

    // === Same as Midnight theme base, but with pure black menu bar ===
    'ui-primary': '#000000',
    'ui-secondary': '#0a0a0a',
    'ui-tertiary': '#151515',

    'ui-modal-overlay': '#000000aa',
    'ui-modal-background': '#000000',
    'ui-modal-foreground': '#eeeeee',
    'ui-modal-header-background': '#000000',
    'ui-modal-header-foreground': '#ffffff',

    'ui-white': '#000000',

    'ui-black-transparent': '#ffffff26',

    'text-primary': '#eeeeee',

    // === Pure Black menu bar ===
    'menu-bar-background': '#000000',
    'menu-bar-background-image': 'none',
    'menu-bar-foreground': '#ffffff',

    'assets-background': '#000000',

    'input-background': '#0a0a0a',

    'popover-background': '#0a0a0a',

    'badge-background': '#101820',
    'badge-border': '#152638',

    'fullscreen-background': '#000000',
    'fullscreen-accent': '#000000',

    'page-background': '#000000',
    'page-foreground': '#eeeeee',

    'project-title-inactive': 'var(--ui-secondary)',
    'project-title-hover': '#ffffff3f',

    'link-color': '#ffffff',

    'filter-icon-black': 'invert(100%)',
    'filter-icon-gray': 'grayscale(100%) brightness(1.7)',
    'filter-icon-white': 'brightness(0) invert(100%)',

    'paint-filter-icon-gray': 'brightness(1.7)'
};

// 色盲色弱深主题: 按用户指定顺序 1黑 2白 3黑 4白 ... 奇偶交替
//
// 用户指定顺序:
//   1 运动 motion      -> 奇 -> BLACK
//   2 外观 looks       -> 偶 -> LIGHT
//   3 声音 sounds      -> 奇 -> BLACK
//   4 事件 event       -> 偶 -> LIGHT
//   5 控制 control     -> 奇 -> BLACK
//   6 侦测 sensing     -> 偶 -> LIGHT
//   7 运算 operators   -> 奇 -> BLACK
//   8 字符串 strings   -> 偶 -> LIGHT
//   9 素材 assets      -> 奇 -> BLACK
//   10 变量 data       -> 偶 -> LIGHT
//   11 函数 more       -> 奇 -> BLACK
//
// pen / data_lists / addons / patch 不在用户列表, 就近对齐:
//   pen        -> 7 奇 -> BLACK (sensing 后紧邻 operators)
//   data_lists -> 10 偶 -> LIGHT (跟 data 一起)
//   addons     -> 11 奇 -> BLACK (more 附近)
//   patch      -> 11 奇 -> BLACK
//
// 注意: Blockly 的积木文字颜色是全局单一值 (blockColors.text),
// 不能按分类设置不同颜色. 所以这里"白色"不用纯 #FFFFFF, 而是
// 很浅的浅灰 #E8E8E8, 让全局白字 (#FFFFFF) 在浅灰积木上还能看清.
// 黑色积木保持纯黑 #000000, 白字在纯黑上完美可读.

const BLACK = '#000000';
const LIGHT = '#E8E8E8';
const makeMono = c => ({
    primary: c,
    secondary: c,
    tertiary: c,
    quaternary: c
});

const blockColors = {
    motion:       makeMono(BLACK),   // 1  奇
    looks:        makeMono(LIGHT),   // 2  偶
    sounds:       makeMono(BLACK),   // 3  奇
    event:        makeMono(LIGHT),   // 4  偶
    control:      makeMono(BLACK),   // 5  奇
    sensing:      makeMono(LIGHT),   // 6  偶
    pen:          makeMono(BLACK),   // 7  奇 (就近)
    operators:    makeMono(BLACK),   // 7  奇
    data:         makeMono(LIGHT),   // 10 偶
    data_lists:   makeMono(LIGHT),   // 10 偶 (就近)
    more:         makeMono(BLACK),   // 11 奇
    addons:       makeMono(BLACK),   // 11 奇 (就近)
    patch:        makeMono(BLACK),   // 11 奇 (就近)
    strings:      makeMono(LIGHT),   // 8  偶
    assets:       makeMono(BLACK),   // 9  奇

    insertionMarker: '#cccccc',
    workspace: '#0a0a0a',
    toolboxSelected: '#0a0a0a',
    toolboxText: '#cccccc',
    toolbox: '#000000',
    flyout: '#000000',
    scrollbar: '#555555',
    valueReportBackground: '#0a0a0a',
    valueReportBorder: '#222222',
    valueReportForeground: '#eeeeee',
    contextMenuBackground: '#000000',
    contextMenuBorder: '#ffffff26',
    contextMenuForeground: '#eeeeee',
    contextMenuActiveBackground: '#1a1a1a',
    contextMenuDisabledForeground: '#666666',
    flyoutLabelColor: '#cccccc',
    checkboxInactiveBackground: '#111111',
    checkboxInactiveBorder: '#c8c8c8',
    buttonBorder: '#c6c6c6',
    buttonActiveBackground: '#111111',
    buttonForeground: '#cccccc',
    zoomIconFilter: 'invert(100%)',
    gridColor: '#383838',
    text: '#FFFFFF',
    blackText: '#575E75',
    textFieldText: '#575E75'
};


export {
    name,
    icon,
    guiColors,
    blockColors
};

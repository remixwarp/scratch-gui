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

// 色盲色弱深主题 — 所有工具盒分类圆圈在黑色背景上按白/黑交替排列，
// 让每个分类都在纯黑背景上保持清晰对比，同时用单色块本体保持分类可辨。
// 每个分类的 primary / secondary / tertiary / quaternary 全部一致，
// 这样圆圈、积木填充、积木边框都统一成纯白或纯黑两色。
const WHITE = '#FFFFFF';
const BLACK = '#000000';
const makeMono = c => ({
    primary: c,
    secondary: c,
    tertiary: c,
    quaternary: c
});

// 分类顺序与 src/lib/themes/blocks/three.js 里保持一致，
// 深色背景上从白色开始（首格必须有对比度），然后黑白交替。
const blockColors = {
    motion:       makeMono(WHITE),
    looks:        makeMono(BLACK),
    sounds:       makeMono(WHITE),
    control:      makeMono(BLACK),
    event:        makeMono(WHITE),
    sensing:      makeMono(BLACK),
    pen:          makeMono(WHITE),
    operators:    makeMono(BLACK),
    data:         makeMono(WHITE),
    data_lists:   makeMono(BLACK),
    more:         makeMono(WHITE),
    addons:       makeMono(BLACK),
    patch:        makeMono(WHITE),
    strings:      makeMono(BLACK),
    assets:       makeMono(WHITE),

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

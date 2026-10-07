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

// 所有积木分类统一纯黑（由本 GUI 主题自身的 blockColors 决定，不依赖 black 强调色）
const BLACK_BODY_WHITE_BORDER = { primary: '#000000', secondary: '#000000', tertiary: '#FFFFFF', quaternary: '#000000' };
const blockColors = {
    motion:       BLACK_BODY_WHITE_BORDER,
    looks:        BLACK_BODY_WHITE_BORDER,
    sounds:       BLACK_BODY_WHITE_BORDER,
    event:        BLACK_BODY_WHITE_BORDER,
    control:      BLACK_BODY_WHITE_BORDER,
    sensing:      BLACK_BODY_WHITE_BORDER,
    pen:          BLACK_BODY_WHITE_BORDER,
    operators:    BLACK_BODY_WHITE_BORDER,
    data:         BLACK_BODY_WHITE_BORDER,
    data_lists:   BLACK_BODY_WHITE_BORDER,
    more:         BLACK_BODY_WHITE_BORDER,
    addons:       BLACK_BODY_WHITE_BORDER,
    patch:        BLACK_BODY_WHITE_BORDER,
    strings:      BLACK_BODY_WHITE_BORDER,
    assets:       BLACK_BODY_WHITE_BORDER,

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
    textFieldText: '#FFFFFF',
    textField: '#000000',
    blackText: '#575E75'
};


export {
    name,
    icon,
    guiColors,
    blockColors
};

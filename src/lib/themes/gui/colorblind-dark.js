import icon from '!!raw-loader!../icons/colorblind-dark.svg';

const name = {
    defaultMessage: 'Colorblind Dark',
    description: 'Dark theme with pure black menu bar and white text for color blindness accessibility',
    id: 'tw.theme.gui.colorblind-dark'
};

const guiColors = {
    'color-scheme': 'dark',

    'ui-primary': '#0a0a0a',
    'ui-secondary': '#141414',
    'ui-tertiary': '#1f1f1f',

    'ui-modal-overlay': 'rgba(0, 0, 0, 0.7)',
    'ui-modal-background': '#0a0a0a',
    'ui-modal-foreground': '#ffffff',
    'ui-modal-header-background': '#000000',
    'ui-modal-header-foreground': '#ffffff',

    'ui-white': '#000000',

    'ui-black-transparent': 'rgba(255, 255, 255, 0.15)',

    'text-primary': '#ffffff',
    'text-primary-transparent': 'rgba(255, 255, 255, 0.75)',

    'red-primary': '#EF5350',
    'red-tertiary': '#E53935',

    'sound-primary': '#CE93D8',
    'sound-tertiary': '#BA68C8',

    'control-primary': '#FFB74D',

    'data-primary': '#64B5F6',

    'pen-primary': '#4DB6AC',
    'pen-transparent': 'rgba(77, 182, 172, 0.25)',
    'pen-tertiary': '#26A69A',

    'error-primary': '#EF5350',
    'error-light': '#F44336',
    'error-transparent': 'rgba(239, 83, 80, 0.25)',

    'extensions-primary': '#81C784',
    'extensions-tertiary': '#66BB6A',
    'extensions-transparent': 'rgba(129, 199, 132, 0.35)',
    'extensions-light': '#388E3C',

    'drop-highlight': '#ffffff',

    'menu-bar-background': '#000000',
    'menu-bar-background-image': 'none',
    'menu-bar-foreground': '#ffffff',

    'assets-background': '#0a0a0a',

    'input-background': '#141414',

    'popover-background': '#141414',

    'badge-background': '#1a1a1a',
    'badge-border': '#333333',

    'fullscreen-background': '#000000',
    'fullscreen-accent': '#000000',

    'page-background': '#0a0a0a',
    'page-foreground': '#ffffff',

    'project-title-inactive': 'var(--ui-secondary)',
    'project-title-hover': 'rgba(255, 255, 255, 0.15)',

    'link-color': '#90CAF9',

    'filter-icon-black': 'invert(100%)',
    'filter-icon-gray': 'grayscale(100%) brightness(1.7)',
    'filter-icon-white': 'brightness(0) invert(100%)',

    'paint-filter-icon-gray': 'brightness(1.7)'
};

const blockColors = {
    insertionMarker: '#cccccc',
    workspace: '#0a0a0a',
    toolboxSelected: '#1f1f1f',
    toolboxText: '#ffffff',
    toolbox: '#141414',
    flyout: '#0a0a0a',
    scrollbar: '#555555',
    valueReportBackground: '#0a0a0a',
    valueReportBorder: '#333333',
    valueReportForeground: '#ffffff',
    contextMenuBackground: '#141414',
    contextMenuBorder: 'rgba(255, 255, 255, 0.25)',
    contextMenuForeground: '#ffffff',
    contextMenuActiveBackground: '#1f1f1f',
    contextMenuDisabledForeground: '#666666',
    flyoutLabelColor: '#ffffff',
    checkboxInactiveBackground: '#141414',
    checkboxInactiveBorder: '#ffffff',
    buttonBorder: '#ffffff',
    buttonActiveBackground: '#000000',
    buttonForeground: '#ffffff',
    zoomIconFilter: 'invert(100%)',
    gridColor: '#2a2a2a',
    text: '#ffffff',
    blackText: '#ffffff',
    textFieldText: '#ffffff'
};

export {
    name,
    icon,
    guiColors,
    blockColors
};

import icon from '!!raw-loader!../icons/colorblind-light.svg';

const name = {
    defaultMessage: 'Colorblind Light',
    description: 'Light theme with pure black menu bar and black text for color blindness accessibility',
    id: 'tw.theme.gui.colorblind-light'
};

const guiColors = {
    'color-scheme': 'light',

    'ui-primary': 'hsla(0, 0%, 100%, 1)', /* #FFFFFF */
    'ui-secondary': 'hsla(0, 0%, 97%, 1)', /* #F7F7F7 */
    'ui-tertiary': 'hsla(0, 0%, 92%, 1)', /* #EBEBEB */

    'ui-modal-overlay': 'rgba(0, 0, 0, 0.3)',
    'ui-modal-background': '#ffffff',
    'ui-modal-foreground': '#000000',
    'ui-modal-header-background': '#000000',
    'ui-modal-header-foreground': '#ffffff',

    'ui-white': '#ffffff',
    'ui-white-dim': 'rgba(255, 255, 255, 0.75)',
    'ui-white-transparent': 'rgba(255, 255, 255, 0.25)',
    'ui-transparent': 'rgba(255, 255, 255, 0)',

    'ui-black-transparent': 'rgba(0, 0, 0, 0.15)',

    'text-primary': '#000000',
    'text-primary-transparent': 'rgba(0, 0, 0, 0.75)',

    'red-primary': '#D00000',
    'red-tertiary': '#A30000',

    'sound-primary': '#6A1B9A',
    'sound-tertiary': '#4A148C',

    'control-primary': '#E65100',

    'data-primary': '#0D47A1',

    'pen-primary': '#00695C',
    'pen-transparent': 'rgba(0, 105, 92, 0.25)',
    'pen-tertiary': '#004D40',

    'error-primary': '#C62828',
    'error-light': '#E53935',
    'error-transparent': 'rgba(198, 40, 40, 0.25)',

    'extensions-primary': '#2E7D32',
    'extensions-tertiary': '#1B5E20',
    'extensions-transparent': 'rgba(46, 125, 50, 0.35)',
    'extensions-light': '#C8E6C9',

    'drop-highlight': '#000000',

    'menu-bar-background': '#000000',
    'menu-bar-background-image': 'none',
    'menu-bar-foreground': '#ffffff',

    'assets-background': '#ffffff',

    'input-background': '#ffffff',

    'popover-background': '#ffffff',

    'shadow': 'rgba(0, 0, 0, 0.15)',

    'badge-background': '#F5F5F5',
    'badge-border': '#CCCCCC',

    'fullscreen-background': '#ffffff',
    'fullscreen-accent': '#E0E0E0',

    'page-background': '#ffffff',
    'page-foreground': '#000000',

    'project-title-inactive': 'var(--ui-white-transparent)',
    'project-title-hover': 'rgba(255, 255, 255, 0.25)',

    'link-color': '#0D47A1',

    'filter-icon-black': 'none',
    'filter-icon-gray': 'grayscale(100%)',
    'filter-icon-white': 'none',

    'paint-ui-pane-border': 'var(--ui-black-transparent)',
    'paint-text-primary': 'var(--text-primary)',
    'paint-form-border': 'var(--ui-black-transparent)',
    'paint-looks-secondary': 'var(--looks-secondary)',
    'paint-looks-transparent': 'var(--looks-transparent)',
    'paint-input-background': 'var(--input-background)',
    'paint-popover-background': 'var(--popover-background)',
    'paint-filter-icon-gray': 'none'
};

const blockColors = {
    workspace: '#F9F9F9',
    toolbox: '#FFFFFF',
    flyout: '#F9F9F9',
    text: '#FFFFFF',
    toolboxText: '#000000',
    blackText: '#000000',
    textFieldText: '#000000',
    flyoutLabelColor: '#000000'
};

export {
    name,
    icon,
    guiColors,
    blockColors
};

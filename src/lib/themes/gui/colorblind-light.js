import icon from '!!raw-loader!../icons/colorblind-light.svg';

const name = {
    defaultMessage: 'Colorblind Light',
    description: 'Light theme with black accents for color blindness accessibility',
    id: 'tw.theme.gui.colorblind-light'
};

const guiColors = {
    'color-scheme': 'light',

    // === Same as Light theme base ===
    'ui-primary': 'hsla(0, 0%, 100%, 1)', /* #FFFFFF */
    'ui-secondary': 'hsla(0, 0%, 97%, 1)', /* #F7F7F7 */
    'ui-tertiary': 'hsla(0, 0%, 92%, 1)', /* #EBEBEB */

    'ui-modal-overlay': 'rgba(0, 0, 0, 0.5)',
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

    // === Pure Black accent - ALL colored UI elements become black ===
    'motion-primary': '#000000',
    'motion-primary-transparent': 'rgba(0, 0, 0, 0.9)',
    'motion-tertiary': '#333333',

    'looks-secondary': '#000000',
    'looks-tertiary': '#333333',
    'looks-transparent': 'rgba(0, 0, 0, 0.35)',
    'looks-light-transparent': 'rgba(0, 0, 0, 0.15)',
    'looks-secondary-dark': '#1a1a1a',

    'red-primary': '#000000',
    'red-tertiary': '#333333',

    'sound-primary': '#000000',
    'sound-tertiary': '#333333',

    'control-primary': '#000000',

    'data-primary': '#000000',

    'pen-primary': '#000000',
    'pen-transparent': 'rgba(0, 0, 0, 0.25)',
    'pen-tertiary': '#333333',

    'error-primary': '#000000',
    'error-light': '#333333',
    'error-transparent': 'rgba(0, 0, 0, 0.25)',

    'extensions-primary': '#000000',
    'extensions-tertiary': '#333333',
    'extensions-transparent': 'rgba(0, 0, 0, 0.35)',
    'extensions-light': '#333333',

    'drop-highlight': '#333333',

    // === Black menu bar ===
    'menu-bar-background': '#000000',
    'menu-bar-background-image': 'none',
    'menu-bar-foreground': '#ffffff',

    'assets-background': '#ffffff',
    'input-background': '#ffffff',
    'popover-background': '#ffffff',
    'shadow': 'rgba(0, 0, 0, 0.15)',
    'badge-background': '#f5f5f5',
    'badge-border': '#000000',

    'fullscreen-background': '#ffffff',
    'fullscreen-accent': '#e8e8e8',

    'page-background': '#ffffff',
    'page-foreground': '#000000',

    'project-title-inactive': 'rgba(255, 255, 255, 0.25)',
    'project-title-hover': 'rgba(255, 255, 255, 0.15)',

    'link-color': '#000000',

    'filter-icon-black': 'none',
    'filter-icon-gray': 'grayscale(100%)',
    'filter-icon-white': 'brightness(0)',

    'paint-ui-pane-border': 'rgba(0, 0, 0, 0.15)',
    'paint-text-primary': '#000000',
    'paint-form-border': 'rgba(0, 0, 0, 0.15)',
    'paint-looks-secondary': '#000000',
    'paint-looks-transparent': 'rgba(0, 0, 0, 0.35)',
    'paint-input-background': '#ffffff',
    'paint-popover-background': '#ffffff',
    'paint-filter-icon-gray': 'none'
};

const blockColors = {
    workspace: '#FFFFFF',
    toolbox: '#FFFFFF',
    flyout: '#FFFFFF',
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

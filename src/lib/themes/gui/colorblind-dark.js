import icon from '!!raw-loader!../icons/colorblind-dark.svg';
import {blockColors} from './midnight';

const name = {
    defaultMessage: 'Colorblind Dark',
    description: 'Dark theme (Midnight-like) with pure black menu bar for color blindness accessibility',
    id: 'tw.theme.gui.colorblind-dark'
};

const guiColors = {
    'color-scheme': 'dark',

    // === Same as Midnight theme base ===
    'ui-primary': '#000000',
    'ui-secondary': '#0a0a0a',
    'ui-tertiary': '#151515',

    'ui-modal-overlay': 'rgba(0, 0, 0, 0.7)',
    'ui-modal-background': '#000000',
    'ui-modal-foreground': '#ffffff',
    'ui-modal-header-background': '#000000',
    'ui-modal-header-foreground': '#ffffff',

    'ui-white': '#000000',
    'ui-black-transparent': 'rgba(255, 255, 255, 0.15)',

    'text-primary': '#ffffff',
    'text-primary-transparent': 'rgba(255, 255, 255, 0.75)',

    // === Pure Black accent - ALL colored UI elements become black ===
    'motion-primary': '#000000',
    'motion-primary-transparent': 'rgba(0, 0, 0, 0.9)',
    'motion-tertiary': '#333333',

    'looks-secondary': '#000000',
    'looks-tertiary': '#333333',
    'looks-transparent': 'rgba(255, 255, 255, 0.25)',
    'looks-light-transparent': 'rgba(255, 255, 255, 0.1)',
    'looks-secondary-dark': '#333333',

    'red-primary': '#000000',
    'red-tertiary': '#333333',

    'sound-primary': '#000000',
    'sound-tertiary': '#333333',

    'control-primary': '#000000',

    'data-primary': '#000000',

    'pen-primary': '#000000',
    'pen-transparent': 'rgba(255, 255, 255, 0.25)',
    'pen-tertiary': '#333333',

    'error-primary': '#000000',
    'error-light': '#333333',
    'error-transparent': 'rgba(255, 255, 255, 0.25)',

    'extensions-primary': '#000000',
    'extensions-tertiary': '#333333',
    'extensions-transparent': 'rgba(255, 255, 255, 0.35)',
    'extensions-light': '#333333',

    'drop-highlight': '#ffffff',

    // === Black menu bar (Midnight had #222222, now pure #000000) ===
    'menu-bar-background': '#000000',
    'menu-bar-background-image': 'none',
    'menu-bar-foreground': '#ffffff',

    'assets-background': '#000000',
    'input-background': '#0a0a0a',
    'popover-background': '#0a0a0a',
    'badge-background': '#0a0a0a',
    'badge-border': '#ffffff',

    'fullscreen-background': '#000000',
    'fullscreen-accent': '#000000',

    'page-background': '#000000',
    'page-foreground': '#ffffff',

    'project-title-inactive': '#0a0a0a',
    'project-title-hover': 'rgba(255, 255, 255, 0.15)',

    'link-color': '#ffffff',

    'filter-icon-black': 'invert(100%)',
    'filter-icon-gray': 'grayscale(100%) brightness(1.7)',
    'filter-icon-white': 'brightness(0) invert(100%)',

    'paint-filter-icon-gray': 'brightness(1.7)'
};


export {
    name,
    icon,
    guiColors,
    blockColors
};

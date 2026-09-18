import defaultsDeep from 'lodash.defaultsdeep';
import icon from '!!raw-loader!../icons/colorblind-light.svg';
import {blockColors as lightBlockColors} from './light';

const name = {
    defaultMessage: 'Colorblind Light',
    description: 'Light theme with black accents for color blindness accessibility',
    id: 'tw.theme.gui.colorblind-light'
};

const guiColors = {
    'color-scheme': 'light',

    // === Same as Light theme base, but with pure black menu bar ===
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
    'paint-input-background': '#ffffff',
    'paint-popover-background': '#ffffff',
    'paint-filter-icon-gray': 'none'
};

// 所有积木分类统一纯黑 (实际颜色由 black accent 最终覆盖)
const BLACK_BODY_WHITE_BORDER = {
    primary: '#000000',
    secondary: '#000000',
    tertiary: '#FFFFFF',
    quaternary: '#000000'
};

const categoryColors = {
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

    // 积木文字白色
    text: '#FFFFFF',
    textFieldText: '#FFFFFF',
    blackText: '#575E75'
};

// light.js 提供的 workspace / toolbox / flyout 等基础属性保留,
// categoryColors 优先级更高. 但最终 black accent 会再覆盖一次.
const blockColors = defaultsDeep(
    {},
    categoryColors,
    lightBlockColors
);


export {
    name,
    icon,
    guiColors,
    blockColors
};

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

// 色盲色弱浅主题 — 工具盒分类圆圈在白色背景上按黑/白交替排列，
// 让每个分类都在纯白背景上保持清晰对比，同时积木本体也统一成纯黑或纯白两色。
// 分类顺序与 src/lib/themes/blocks/three.js 保持一致，浅色背景上必须从黑色开始。
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const makeMono = c => ({
    primary: c,
    secondary: c,
    tertiary: c,
    quaternary: c
});

const categoryColors = {
    motion:       makeMono(BLACK),
    looks:        makeMono(WHITE),
    sounds:       makeMono(BLACK),
    control:      makeMono(WHITE),
    event:        makeMono(BLACK),
    sensing:      makeMono(WHITE),
    pen:          makeMono(BLACK),
    operators:    makeMono(WHITE),
    data:         makeMono(BLACK),
    data_lists:   makeMono(WHITE),
    more:         makeMono(BLACK),
    addons:       makeMono(WHITE),
    patch:        makeMono(BLACK),
    strings:      makeMono(WHITE),
    assets:       makeMono(BLACK)
};

// light.js 提供的 workspace / toolbox / flyout / text 等基础属性保留，
// 再用 categoryColors 覆盖 three.js 的彩色分类。defaultsDeep 的顺序必须把
// categoryColors 放在前面（优先级更高），lightBlockColors 后面只补缺。
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

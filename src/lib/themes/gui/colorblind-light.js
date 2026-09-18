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

// 色盲色弱浅主题: 按用户指定顺序 1深灰 2纯白 3深灰 4纯白 ... 奇偶交替
// 同 colorblind-dark 用完全相同的分类顺序和奇偶映射, 让两主题
// 切换时分类颜色位置保持一致, 降低视觉切换开销.
//
// 用户指定顺序:
//   1 运动 motion      -> 奇 -> DARK (#222222 深灰)
//   2 外观 looks       -> 偶 -> LIGHT (#FFFFFF 纯白)
//   3 声音 sounds      -> 奇 -> DARK
//   4 事件 event       -> 偶 -> LIGHT
//   5 控制 control     -> 奇 -> DARK
//   6 侦测 sensing     -> 偶 -> LIGHT
//   7 运算 operators   -> 奇 -> DARK
//   8 字符串 strings   -> 偶 -> LIGHT
//   9 素材 assets      -> 奇 -> DARK
//   10 变量 data       -> 偶 -> LIGHT
//   11 函数 more       -> 奇 -> DARK
//
// 文字颜色: 全局黑色 #000000 (Blockly 不支持按分类不同文字色)
//   - 纯白 #FFFFFF + 黑字 -> 完美对比度 ✓
//   - 深灰 #222222 + 黑字 -> 对比度偏低 (~1.4) 但可识别
// 为什么深灰不用纯黑: 纯黑 + 黑字 = 看不见. 这是唯一能让"白积木黑字"
// 完美实现的方案, 深灰上黑字对比度偏低但可接受.

const DARK = '#222222';
const LIGHT = '#FFFFFF';
const makeMono = c => ({
    primary: c,
    secondary: c,
    tertiary: c,
    quaternary: c
});

const categoryColors = {
    motion:       makeMono(DARK),   // 1  奇
    looks:        makeMono(LIGHT),  // 2  偶
    sounds:       makeMono(DARK),   // 3  奇
    event:        makeMono(LIGHT),  // 4  偶
    control:      makeMono(DARK),   // 5  奇
    sensing:      makeMono(LIGHT),  // 6  偶
    pen:          makeMono(DARK),   // 7  奇 (就近)
    operators:    makeMono(DARK),   // 7  奇
    data:         makeMono(LIGHT),  // 10 偶
    data_lists:   makeMono(LIGHT),  // 10 偶 (就近)
    more:         makeMono(DARK),   // 11 奇
    addons:       makeMono(DARK),   // 11 奇 (就近)
    patch:        makeMono(DARK),   // 11 奇 (就近)
    strings:      makeMono(LIGHT),  // 8  偶
    assets:       makeMono(DARK),   // 9  奇

    // 关键: 全局文字颜色黑色, 让纯白积木上文字清晰
    text: '#000000',
    // textFieldText 是输入框文字, 在白色 textField 上也该是黑色
    textFieldText: '#000000',
    // blackText 用于某些深色覆盖的辅助文本
    blackText: '#212121'
};

// light.js 提供的 workspace / toolbox / flyout 等基础属性保留,
// categoryColors 和文字颜色优先级更高.
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

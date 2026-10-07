// 纯黑强调色 —— 只替换强调色（accent）相关的变量，与 Red 一样只改点缀色，
// 不再整窗换肤（不动背景 / 文字 / 菜单栏 / page 等）。
// 所有强调色统一为纯黑 #000000（带透明度的也用 rgba(0,0,0,…)）。
//
// 历史说明：旧版 black 是一套完整皮肤，会强制 color-scheme=dark 并把整窗
// UI 改成黑/白；同时被色盲 GUI（colorblind-light / colorblind-dark）锁定为
// 强调色来保持单色观感。现改为纯 accent 后：
//   - 在普通 GUI 下，只把运动/外观/扩展等分类强调色变成纯黑，底色保持不变；
//   - 在色盲 GUI 下，红/错误等状态色不再被强制压黑（由 colorblind GUI 自身控制）。

const guiColors = {
    'motion-primary': '#000000',
    'motion-primary-transparent': 'rgba(0, 0, 0, 0.9)',
    'motion-tertiary': '#000000',

    'looks-secondary': '#000000',
    'looks-tertiary': 'rgba(0, 0, 0, 0.6)',
    'looks-transparent': 'rgba(0, 0, 0, 0.35)',
    'looks-light-transparent': 'rgba(0, 0, 0, 0.15)',
    'looks-secondary-dark': '#000000',

    'extensions-primary': '#000000',
    'extensions-tertiary': '#000000',
    'extensions-transparent': 'rgba(0, 0, 0, 0.35)',
    'extensions-light': '#000000',

    'drop-highlight': '#000000'
};

// 复选框激活态用纯黑填充（与 Red 结构一致）
const blockColors = {
    checkboxActiveBackground: '#000000',
    checkboxActiveBorder: '#000000'
};

export {
    guiColors,
    blockColors
};

/**
 * 「手动配置宽度」校准过程中的临时主题预览。
 *
 * 设置页（设置 → 主题 → 像素主题 → 手动设置宽度）与创建像素主题窗口都会打开
 * 同一个校准窗口。创建窗口有自己的预览区，会把标尺画到编辑器里；设置页没有
 * 预览区，所以这里直接把标尺主题的颜色写进 CSS 变量，让菜单栏立即变成
 * 「深色块 + 白色竖线」的标尺，关闭窗口时再写回原主题。
 *
 * 注意：这里只用 applyGuiColors 改变量，不派发 setTheme、也不持久化，
 * 避免把临时标尺主题写进 localStorage（中途崩溃也不会留下脏主题）。
 */
import {applyGuiColors} from './guiHelpers.js';
import {CustomTheme, PixelUtils} from './custom-themes.js';

let originalTheme = null;
let previewing = false;

const getCurrentTheme = () => {
    try {
        const store = window.ReduxStore;
        if (!store || typeof store.getState !== 'function') return null;
        const state = store.getState();
        const themeState = state && state.scratchGui && state.scratchGui.theme;
        return (themeState && themeState.theme) || null;
    } catch (e) {
        return null;
    }
};

/**
 * 把校准标尺预览到编辑器上（可多次调用，只在第一次记住原主题）。
 * @param {Array<Array<string>>} pixelData 标尺像素数据
 */
export const previewCalibrationTheme = pixelData => {
    if (!Array.isArray(pixelData) || pixelData.length === 0) return;
    const current = getCurrentTheme();
    if (!previewing) {
        if (!current) return;
        originalTheme = current;
        previewing = true;
    }
    const base = current || originalTheme;
    try {
        const pixelAccent = PixelUtils.createPixelAccent(pixelData, '#000000');
        const calibrationTheme = new CustomTheme(
            '__width_calibration__',
            '',
            pixelAccent,
            base.gui || 'light',
            base.blocks || 'three',
            base.menuBarAlign || 'left',
            base.wallpaper,
            base.fonts
        );
        applyGuiColors(calibrationTheme);
    } catch (e) {
        console.warn('Failed to preview calibration theme', e);
    }
};

/** 结束预览并恢复校准前的主题（幂等）。 */
export const restoreCalibrationTheme = () => {
    if (!previewing) return;
    previewing = false;
    const theme = originalTheme;
    originalTheme = null;
    if (!theme) return;
    try {
        applyGuiColors(theme);
    } catch (e) {
        console.warn('Failed to restore theme after calibration preview', e);
    }
};

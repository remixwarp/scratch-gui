/**
 * 刷新「正在使用」的像素主题。
 *
 * 灵活编码（灵活记录）的像素主题文件里只保存图案与位置，画布宽度由本机的
 * 预览设置决定。设置页里点「使用参考值」或在手动配置窗口点「完成」之后，
 * 宽度变了，但已经画到菜单栏上的背景图不会自己重算——这里把像素数据按新
 * 宽度重新排布、重新生成背景，并替换掉 Redux 里的主题实例，编辑器即时生效。
 *
 * 不会破坏主题原始数据：首次刷新时把当前像素数组记为 source，之后每次刷新
 * 都从 source 重排，反复调整宽度不会累积偏移；uuid / createdAt 也沿用原值，
 * 避免被当成「另一个主题」而触发整体重新挂载。
 */
import {applyGuiColors} from './guiHelpers.js';
import {CustomTheme, PixelUtils} from './custom-themes.js';
import {getPixelPreviewSettings, isFlexiblePixelTheme} from './pixel-preview-settings.js';
import {reflowPixelDataToWidth} from './pixel-width-calibration.js';
import {PIXEL_POSITIONS} from './pixel-encoding.js';
import {updateCalibrationOriginalTheme} from './pixel-calibration-preview.js';
import {persistTheme} from './themePersistance.js';
import {setTheme} from '../../reducers/theme';

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

/** 把画布行数调整到设置的高度：多了截断，少了用最后一行补齐。 */
const fitPixelHeight = (pixelData, height) => {
    if (!Array.isArray(pixelData) || pixelData.length === 0) return pixelData;
    if (pixelData.length === height) return pixelData;
    if (pixelData.length > height) return pixelData.slice(0, height);
    const rows = pixelData.slice();
    const last = rows[rows.length - 1];
    while (rows.length < height) rows.push(last.slice());
    return rows;
};

/** 数组宽度（最长一行） */
const widthOf = pixelData => {
    if (!Array.isArray(pixelData) || pixelData.length === 0) return 0;
    return pixelData.reduce((m, row) => Math.max(m, Array.isArray(row) ? row.length : 0), 0);
};

/**
 * 按当前预览设置重新应用正在使用的像素主题。
 * @returns {boolean} 是否真的刷新了（非像素主题 / 无 Redux 时返回 false）
 */
export const refreshCurrentPixelTheme = () => {
    const store = window.ReduxStore;
    if (!store || typeof store.getState !== 'function' || typeof store.dispatch !== 'function') {
        return false;
    }
    const current = getCurrentTheme();
    if (!current || !current.customAccent) return false;
    const accent = current.customAccent;
    if (!Array.isArray(accent.pixelData) || accent.pixelData.length === 0) return false;
    // 只有灵活编码主题会随设备宽度变化；「逐个记录」的主题是固定像素图，重排会破坏它
    if (!isFlexiblePixelTheme(current)) return false;

    const {width, height} = getPixelPreviewSettings();
    const targetWidth = Math.max(2, Math.min(10000, Math.round(Number(width)) || 0)) || widthOf(accent.pixelData);
    const targetHeight = Math.max(2, Math.min(50, Math.round(Number(height)) || 0)) || accent.pixelData.length;

    // 已经从原始数据刷过一次时，继续用原始数据，避免多次调整后图案逐渐偏移
    const source = current.__pixelSourceData || accent.pixelData;
    if (widthOf(accent.pixelData) === targetWidth && accent.pixelData.length === targetHeight) {
        return false;
    }

    const position = PIXEL_POSITIONS.includes(accent.position) ? accent.position : null;
    const pixelData = fitPixelHeight(
        reflowPixelDataToWidth(source, targetWidth, position),
        targetHeight
    );

    const primaryColor = (accent.guiColors && accent.guiColors['motion-primary']) || '#ff6b6b';
    const generated = PixelUtils.createPixelAccent(pixelData, primaryColor, {
        pixelSize: accent.pixelSize || 2,
        encoding: accent.encoding,
        position: accent.position
    });
    // 只替换背景图相关的三项，其余颜色沿用原主题，反复刷新也不会让主色漂移
    const guiColors = {
        ...accent.guiColors,
        'menu-bar-background-image': generated.guiColors['menu-bar-background-image'],
        'menu-bar-background-repeat': generated.guiColors['menu-bar-background-repeat'],
        'menu-bar-background-size': generated.guiColors['menu-bar-background-size']
    };
    const nextAccent = {
        ...generated,
        guiColors,
        blockColors: accent.blockColors || generated.blockColors
    };

    const next = new CustomTheme(
        current.name,
        current.description,
        nextAccent,
        current.gui,
        current.blocks,
        current.menuBarAlign,
        current.wallpaper,
        current.fonts,
        current.author
    );
    // 沿用身份信息：避免 GUI 因 key 变化整体重挂，也避免主题被当成「新主题」重复保存
    if (current.uuid) {
        Object.defineProperty(next, 'uuid', {value: current.uuid, writable: false});
    }
    if (current.createdAt) {
        Object.defineProperty(next, 'createdAt', {value: current.createdAt, writable: false});
    }
    Object.defineProperty(next, '__pixelSourceData', {
        value: source,
        enumerable: false,
        configurable: true,
        writable: true
    });

    try {
        applyGuiColors(next);
    } catch (e) {
        console.warn('Failed to apply refreshed pixel theme', e);
    }
    store.dispatch(setTheme(next));
    // 持久化新宽度下的像素数组：刷新页面后仍与当前设置一致
    try {
        persistTheme(next);
    } catch (e) {
        console.warn('Failed to persist refreshed pixel theme', e);
    }
    // 若此刻正处于「手动配置」的标尺预览中，把恢复用的基线换成新主题，
    // 否则关闭校准窗口时会恢复成旧宽度的图案。
    updateCalibrationOriginalTheme(next);
    return true;
};

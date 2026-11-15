/**
 * 灵活编码（灵活记录）像素主题的「设备预览设置」。
 *
 * 灵活编码的主题文件里只保存图案（不同颜色的列）与相同颜色列的所在部分，
 * 同一份文件在不同宽度的设备上预览时，需要按本机设置的预览宽度重新补出
 * 相同颜色列。这里的宽度 / 高度就是「当前设备预览用的画布尺寸」，
 * 与导出文件里的 w / h 互不干扰。
 *
 * 存储于 localStorage，键为 tw:pixelPreviewSettings：
 *   {width, height, position, configured}
 *   configured 表示用户是否手动配置过宽度；默认 false 时，应用灵活编码主题
 *   会弹出「主题已经应用」的提示框（宽度已默认采用当前设备的参考值）。
 */
import {
    decodePixelData,
    isSegmentsEncoded,
    PIXEL_ENCODING_SEGMENTS,
    PIXEL_POSITION_LEFT,
    PIXEL_POSITION_CENTER,
    PIXEL_POSITION_RIGHT,
    PIXEL_POSITIONS
} from './pixel-encoding.js';
import {reflowPixelDataToWidth, computeScreenWidthReference} from './pixel-width-calibration.js';

export {
    PIXEL_POSITION_LEFT,
    PIXEL_POSITION_CENTER,
    PIXEL_POSITION_RIGHT,
    PIXEL_POSITIONS
};

const STORAGE_KEY = 'tw:pixelPreviewSettings';

/** 参考值不可用（如屏幕信息缺失）时的极端兜底宽度。 */
export const PIXEL_PREVIEW_DEFAULT_WIDTH = 900;
export const PIXEL_PREVIEW_DEFAULT_HEIGHT = 24;

/**
 * 编辑器刚启动、没有任何配置时，默认预览宽度直接采用当前设备的参考值，
 * 不再固定为 900：灵活编码主题一应用就能按屏幕真实比例正常显示。
 * 每次读取都按当前 window.screen 计算，屏幕变化后自动跟随；不依赖 clampInt，
 * 因此声明顺序安全（本模块此前曾因 TDZ 出过问题）。
 */
export const getDefaultPixelPreviewWidth = () => {
    try {
        const value = computeScreenWidthReference().value;
        return Math.max(2, Math.min(10000, Math.round(value)));
    } catch (e) {
        return PIXEL_PREVIEW_DEFAULT_WIDTH;
    }
};

const defaultSettings = () => ({
    width: getDefaultPixelPreviewWidth(),
    height: PIXEL_PREVIEW_DEFAULT_HEIGHT,
    position: PIXEL_POSITION_CENTER,
    configured: false
});

export const PIXEL_PREVIEW_DEFAULTS = defaultSettings();

const clampInt = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= min ? Math.min(max, Math.round(n)) : fallback;
};

const sanitize = raw => ({
    width: clampInt(raw.width, 2, 10000, getDefaultPixelPreviewWidth()),
    height: clampInt(raw.height, 2, 50, PIXEL_PREVIEW_DEFAULT_HEIGHT),
    position: PIXEL_POSITIONS.includes(raw.position) ? raw.position : PIXEL_POSITION_CENTER,
    configured: !!raw.configured
});

const listeners = new Set();

/** 读取当前设备的预览设置（始终返回完整对象） */
export const getPixelPreviewSettings = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultSettings();
        return sanitize(JSON.parse(raw) || {});
    } catch (e) {
        return defaultSettings();
    }
};

/** 合并写入预览设置，并通知订阅者 */
export const setPixelPreviewSettings = (patch = {}) => {
    const next = sanitize({...getPixelPreviewSettings(), ...patch});
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
        // localStorage 不可用时仍保证本次会话内有效
    }
    for (const cb of listeners) {
        try {
            cb(next);
        } catch (e) {
            // 单个订阅者出错不影响其它
        }
    }
    return next;
};

/** 标记宽度已经由用户手动配置（校准窗口 / 设置页写入宽度时调用） */
export const markPixelWidthConfigured = () => setPixelPreviewSettings({configured: true});

export const isPixelWidthConfigured = () => getPixelPreviewSettings().configured;
export const getPixelPreviewWidth = () => getPixelPreviewSettings().width;
export const getPixelPreviewHeight = () => getPixelPreviewSettings().height;
export const getPixelPreviewPosition = () => getPixelPreviewSettings().position;

/** 订阅设置变化，返回取消订阅函数 */
export const subscribePixelPreviewSettings = cb => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};

/**
 * 判断某个主题是否为「灵活编码」像素主题（用于应用 / 导入时弹警告）。
 * 兼容 CustomTheme 实例（customAccent）与导出的普通主题对象（accent）。
 */
export const isFlexiblePixelTheme = theme => {
    if (!theme || typeof theme !== 'object') return false;
    const accent = theme.customAccent || theme.accent || {};
    if (!accent || typeof accent !== 'object') return false;
    const pixelData = accent.pixelData;
    if (!pixelData) return false;
    const encoding = accent.encoding || accent.pixelEncoding;
    return isSegmentsEncoded(pixelData) || encoding === PIXEL_ENCODING_SEGMENTS;
};

/**
 * 应用 / 导入像素主题时是否应弹出「手动配置宽度」警告：
 * 主题是灵活编码，且用户从未手动配置过宽度（仍为默认宽度）。
 */
export const shouldWarnPixelTheme = theme =>
    isFlexiblePixelTheme(theme) && !isPixelWidthConfigured();

/**
 * 解码像素数据。
 * - 灵活编码 v3 主题：宽度 / 高度按当前设备预览设置自适应，但图案位置以
 *   文件里记录的 position 为准（贴左 / 居中 / 贴右）。不能把设备的预览位置
 *   传给 decodePixelData —— decodeV3 会优先用 options.position 覆盖
 *   data.position，导致靠右 / 靠左主题都被居中，看起来和居中主题一模一样。
 * - 旧版 v2 / 三段式对象：先解码，再按当前设备预览宽度与位置自适应重排。
 * - 非灵活编码（二维数组）：走原解码逻辑，不受影响。
 * @param {Array|object} data 主题文件里的 pixelData
 * @returns {Array} 完整二维数组
 */
export const decodePixelDataForPreview = data => {
    if (!isSegmentsEncoded(data)) return decodePixelData(data);
    const {width, height, position} = getPixelPreviewSettings();
    // v3 文件本身带位置信息：只按当前设备宽度 / 高度自适应，位置交给
    // decodeV3 读取 data.position 还原，不用设备预览位置覆盖。
    if (data.v === 3) return decodePixelData(data, {width, height});
    // 旧版 v2 / 三段式对象：先解码，再按当前预览宽度与位置自适应重排
    const decoded = decodePixelData(data);
    return reflowPixelDataToWidth(decoded, width, position);
};

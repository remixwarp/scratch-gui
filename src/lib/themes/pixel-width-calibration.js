/**
 * 像素主题「手动配置宽度」相关的纯计算工具。
 *
 * 1) computeScreenWidthReference：把屏幕宽高换算成屏幕比例，再代入用户给定的
 *    不稳定参考值公式 F(m,n) = 490 + 410 × [(m−n) − 11] / (6 − 11)。
 *    其中 m:n 为屏幕长边比与短边比（归一化后的常见比例表示），
 *    11 是荣耀20青春版的比例差值（20−9），6 是联想 ThinkBook 16 的比例差值（16−10）。
 *    代入手机比例得 490，代入电脑比例得 900。
 *
 * 2) buildCalibrationPixelData：生成校准标尺的像素画布。标尺为 24 列深色块
 *    （11 深 + 2 白竖线 + 11 深），左右用背景色填充，默认宽度 500。
 *
 * 3) reflowPixelDataToWidth：把「灵活编码、图片放在中间」的主题画布按目标宽度
 *    自适应重排——自动重算左右填充，并让图片按原来的水平比例落在相应位置
 *    （居中 / 偏左 / 偏右同理）。
 */

/** 校准标尺的固定参数（与 t1_pixel_theme.json 一致） */
export const CALIBRATION = {
    backgroundColor: '#75c1c4',
    darkColor: '#294344',
    lineColor: '#ffffff',
    darkHalfWidth: 11,
    lineWidth: 2,
    markWidth: 24,
    height: 24,
    initialWidth: 500
};

/**
 * 常见屏幕比例表（长边:短边）。屏幕像素比先就近匹配到这里，再整数归一化成 m:n。
 * 19.5:9 归入 20:9，对应荣耀20青春版这类「营销上叫 20:9」的屏幕。
 */
const COMMON_RATIOS = [
    [21, 9], [20, 9], [19.5, 9], [19, 9], [18, 9],
    [16, 10], [16, 9], [3, 2], [5, 3], [4, 3], [5, 4], [1, 1]
];

const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));

/**
 * 计算不稳定参考值。
 * @param {object} [screenLike] 可选的屏幕尺寸来源，便于测试；缺省读 window.screen / window.inner*
 * @returns {{value:number, m:number, n:number, d:number, ratioText:string,
 *            screenWidth:number, screenHeight:number}}
 */
export const computeScreenWidthReference = (screenLike = null) => {
    let sw = 0;
    let sh = 0;
    if (screenLike && screenLike.width && screenLike.height) {
        sw = screenLike.width;
        sh = screenLike.height;
    } else if (typeof window !== 'undefined') {
        const s = window.screen || {};
        sw = s.width || window.innerWidth || 0;
        sh = s.height || window.innerHeight || 0;
    }
    if (!sw || !sh) {
        sw = 1920;
        sh = 1080;
    }

    const long = Math.max(sw, sh);
    const short = Math.min(sw, sh);
    const ratio = long / short;

    // 就近匹配常见比例，再整数归一化（19.5 → 20）
    let best = COMMON_RATIOS[0];
    let bestDiff = Infinity;
    for (const candidate of COMMON_RATIOS) {
        const diff = Math.abs(ratio - candidate[0] / candidate[1]);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = candidate;
        }
    }
    const m = Math.round(best[0]);
    const n = Math.round(best[1]);
    const d = m - n;

    // F(m,n) = 490 + 410 × [(m−n) − 11] / (6 − 11)，即 490 + 82 × (11 − d)
    const value = Math.max(2, Math.round(490 + 410 * (d - 11) / (6 - 11)));

    return {
        value,
        m,
        n,
        d,
        ratioText: `${m}:${n}`,
        screenWidth: sw,
        screenHeight: sh
    };
};

/**
 * 生成校准标尺画布：左右背景色填充，中间 24 列深色块（含 2 列白色竖线）。
 * @param {number} width 总列数（长度）
 * @param {number} [height] 行数
 * @returns {Array<Array<string>>} 完整二维数组
 */
export const buildCalibrationPixelData = (width, height = CALIBRATION.height) => {
    const W = Math.max(CALIBRATION.markWidth, Math.round(width));
    const left = Math.floor((W - CALIBRATION.markWidth) / 2);
    const right = W - CALIBRATION.markWidth - left;
    const row = [
        ...Array(left).fill(CALIBRATION.backgroundColor),
        ...Array(CALIBRATION.darkHalfWidth).fill(CALIBRATION.darkColor),
        ...Array(CALIBRATION.lineWidth).fill(CALIBRATION.lineColor),
        ...Array(CALIBRATION.darkHalfWidth).fill(CALIBRATION.darkColor),
        ...Array(right).fill(CALIBRATION.backgroundColor)
    ];
    return Array.from({length: Math.max(1, Math.round(height))}, () => row.slice());
};

/** 取某行某列的颜色，越界返回 null */
const cellAt = (pixelData, y, x) => {
    const row = pixelData[y];
    return Array.isArray(row) && x < row.length ? row[x] : null;
};

/** 一列是否「整列同色」 */
const isSolidColumn = (pixelData, x, h) => {
    const color = cellAt(pixelData, 0, x);
    for (let y = 1; y < h; y++) {
        if (cellAt(pixelData, y, x) !== color) return false;
    }
    return true;
};

/**
 * 识别画布中的「内容块」范围与左右填充色。
 * 内容块 = 第一个非纯色列到最后一个非纯色列（多张图片时含它们之间的间隔列）。
 */
export const findContentBlock = pixelData => {
    if (!Array.isArray(pixelData) || pixelData.length === 0) return null;
    const h = pixelData.length;
    const w = pixelData.reduce((m, row) => Math.max(m, Array.isArray(row) ? row.length : 0), 0);
    if (w === 0) return null;

    let first = -1;
    let last = -1;
    for (let x = 0; x < w; x++) {
        if (!isSolidColumn(pixelData, x, h)) {
            if (first < 0) first = x;
            last = x + 1;
        }
    }

    // 左侧填充色：取内容块之前最靠近它的纯色列
    let fillColor = null;
    for (let x = (first < 0 ? w : first) - 1; x >= 0; x--) {
        const c = cellAt(pixelData, 0, x);
        if (c) {
            fillColor = c;
            break;
        }
    }
    // 右侧填充色：取内容块之后最靠近它的纯色列
    let tailColor = null;
    for (let x = last; x < w; x++) {
        const c = cellAt(pixelData, 0, x);
        if (c) {
            tailColor = c;
            break;
        }
    }
    if (!fillColor) fillColor = tailColor || CALIBRATION.backgroundColor;
    if (!tailColor) tailColor = fillColor;

    return {h, w, first, last, fillColor, tailColor};
};

/**
 * 按目标宽度自适应重排画布：自动重算左右填充列数，并让内容块按原水平比例
 * 落到相应位置（居中 / 偏左 / 偏右都保持原相对位置）。幂等：同宽度重排结果不变。
 * @param {Array<Array<string|null>>} pixelData 完整二维数组
 * @param {number} targetWidth 目标列数（即创建面板里的宽度）
 * @returns {Array<Array<string|null>>} 重排后的完整二维数组
 */
export const reflowPixelDataToWidth = (pixelData, targetWidth) => {
    const info = findContentBlock(pixelData);
    if (!info) return pixelData;
    const {h, w: w0, first, last, fillColor, tailColor} = info;
    const W = Math.max(2, Math.round(Number(targetWidth) || w0));

    // 没有内容块（整张都是纯色列）：只做裁切 / 补齐，不重排
    if (first < 0) {
        return Array.from({length: h}, (_, y) =>
            Array.from({length: W}, (_, x) => x < w0 ? cellAt(pixelData, y, x) : fillColor));
    }

    const blockWidth = last - first;
    // 原内容块的水平中心比例
    const centerRatio = (first + last) / 2 / w0;

    // 内容块比目标宽度还宽：从 0 开始放并截断
    if (blockWidth >= W) {
        return Array.from({length: h}, (_, y) =>
            Array.from({length: W}, (_, x) => cellAt(pixelData, y, first + x)));
    }

    const newStart = clampInt(centerRatio * W - blockWidth / 2, 0, W - blockWidth);
    const rightCount = W - newStart - blockWidth;

    return Array.from({length: h}, (_, y) => {
        const row = [];
        for (let i = 0; i < newStart; i++) row.push(fillColor);
        for (let x = first; x < last; x++) row.push(cellAt(pixelData, y, x));
        for (let i = 0; i < rightCount; i++) row.push(tailColor);
        return row;
    });
};

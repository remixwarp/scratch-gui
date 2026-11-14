/**
 * 像素主题「手动配置宽度」相关的纯计算工具。
 *
 * 1) computeScreenWidthReference：直接采用屏幕真实宽高比，不做常见比例归一化。
 *    用户给定公式 F(m,n) = 490 + 410 × [(m−n) − 11] / (6 − 11)，
 *    其中 11 = 20 − 9（荣耀20青春版 20:9），6 = 16 − 10（ThinkBook 16 16:10）。
 *    把公式里的差值 d = m − n 视为真实宽高比 r 的连续线性函数，用两个锚点定标：
 *      r₁ = 20/9  → d = 11 → F = 490
 *      r₂ = 16/10 → d = 6  → F = 900
 *      d(r) = 11 + (6 − 11) × (r − r₁) / (r₂ − r₁)
 *    代回原公式即 F(r) = 490 + 410 × (r₁ − r) / (r₁ − r₂)。
 *    因此每台设备的真实比例都会得到连续且互不相同的参考值
 *    （如 2340×1080 → 527、2160×1080 → 636、1024×768 → 1076），
 *    不再被压成 490 / 818 / 900 等少数几个固定值。
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
 * 用户给定公式的两个真实比例锚点（长边/短边），以及对应的差值与参考值。
 * 这两个锚点精确保留原公式 20:9 → 490、16:10 → 900，其余比例按真实宽高连续插值。
 */
export const REFERENCE_ANCHORS = {
    phoneRatio: 20 / 9,
    laptopRatio: 16 / 10,
    phoneDifference: 11,
    laptopDifference: 6,
    phoneValue: 490,
    laptopValue: 900
};

const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));

/**
 * 计算不稳定参考值：直接采用屏幕真实宽高比连续换算，不再就近匹配常见比例。
 * @param {object} [screenLike] 可选的屏幕尺寸来源，便于测试；缺省读 window.screen / window.inner*
 * @returns {{value:number, ratio:number, d:number, ratioText:string,
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
    // 真实宽高比（长边/短边）：保留小数，不做常见比例就近匹配与整数归一化
    const ratio = long / short;

    const A = REFERENCE_ANCHORS;
    // 把真实比例连续映射成公式里的差值 d：r₁ → 11，r₂ → 6
    const d = A.phoneDifference +
        (A.laptopDifference - A.phoneDifference) * (ratio - A.phoneRatio) / (A.laptopRatio - A.phoneRatio);
    // 原公式 F(m,n) = 490 + 410 × [(m−n) − 11] / (6 − 11)
    const value = Math.max(2, Math.round(A.phoneValue +
        (A.laptopValue - A.phoneValue) * (d - A.phoneDifference) / (A.laptopDifference - A.phoneDifference)));

    return {
        value,
        ratio,
        d,
        // 显示真实比例本身，而不是归一化后的整数比
        ratioText: `${ratio.toFixed(3)}:1`,
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

/**
 * 像素主题「手动配置宽度」相关的纯计算工具。
 *
 * 1) computeScreenWidthReference：先按最大公约数把屏幕分辨率化简成最简比例
 *    （2400×1080 → 20:9、1920×1200 → 8:5），再用最简比例换算参考值。
 *    用户给定公式 F(m,n) = 490 + 410 × [(m−n) − 11] / (6 − 11)，
 *    其中 11 = 20 − 9（荣耀20青春版 20:9），6 = 16 − 10（ThinkBook 16 16:10）。
 *    把 d = m − n 视为比例的连续线性函数，用两个锚点定标：
 *      r₁ = 20/9  → d = 11 → F = 490
 *      r₂ = 16/10 → d = 6  → F = 900
 *    横屏 / 竖屏是两套不同的算法，但结果刻意保持接近：
 *      - 竖屏（上下短、左右长）：比例 p = 长边/短边（>1），按 p 在 r₁、r₂ 之间插值；
 *      - 横屏（左右短、上下长）：比例 q = 短边/长边（<1），按 q 在 1/r₁、1/r₂
 *        之间插值，再与竖屏结果取几何平均，最后乘横屏视口的缩放补偿 0.99。
 *    两种写法在锚点处重合，偏离锚点时只拉开几个像素
 *    （2400×1080：竖屏 490 / 横屏 485；1920×1200：900 / 891；1920×1080：783 / 764），
 *    不会再出现横屏 2000+、竖屏 500 那种量级差异。
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

/**
 * 预览方向（设置页里可切换）：
 * - landscape 横屏：左右为短边、上下为长边，宽度方向是短边，按「短边:长边」算；
 * - portrait 竖屏：上下为短边、左右为长边，宽度方向是长边，按「长边:短边」算。
 * 两套算法共用同一组锚点，只是比例的取法不同（互为倒数），
 * 因此切换方向时数值接近、又不会完全相同。
 */
export const PIXEL_ORIENTATION_LANDSCAPE = 'landscape';
export const PIXEL_ORIENTATION_PORTRAIT = 'portrait';
export const PIXEL_ORIENTATIONS = [PIXEL_ORIENTATION_LANDSCAPE, PIXEL_ORIENTATION_PORTRAIT];

/** 最大公约数：用于把分辨率化简成最简比例 */
const gcdOf = (a, b) => {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
        const t = x % y;
        x = y;
        y = t;
    }
    return x || 1;
};

/**
 * 把分辨率化简成最简比例：2400×1080 → {long: 20, short: 9}，
 * 1920×1200 → {long: 8, short: 5}，1366×768 → {long: 683, short: 384}。
 * @param {number} width 屏幕宽（像素）
 * @param {number} height 屏幕高（像素）
 * @returns {{width:number, height:number, long:number, short:number}} 最简比例（整数）
 */
export const simplifyAspectRatio = (width, height) => {
    const w = Math.max(1, Math.round(Math.abs(Number(width)) || 0));
    const h = Math.max(1, Math.round(Math.abs(Number(height)) || 0));
    const g = gcdOf(w, h);
    return {
        width: w / g,
        height: h / g,
        long: Math.max(w, h) / g,
        short: Math.min(w, h) / g
    };
};

/**
 * 横屏参考值的缩放补偿：横屏时视口整体被缩放，单行像素的换算比例略低，
 * 参考宽度比竖屏小约 1%。这样两个方向的数值既接近、又不会完全相同。
 */
const LANDSCAPE_WIDTH_SCALE = 0.99;

const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));

/**
 * 计算不稳定参考值：先把分辨率化简成最简比例，再按方向用两种算法换算。
 * - 竖屏：p = 长边/短边（>1），锚点 20/9 → 490、16/10 → 900；
 * - 横屏：q = 短边/长边（<1），锚点 9/20、10/16，再乘 0.99 缩放补偿。
 * 两套算法在锚点处重合，偏离锚点时只差几个像素。
 * @param {object} [screenLike] 可选的屏幕尺寸来源，便于测试；缺省读 window.screen / window.inner*
 * @param {{orientation?: string}} [options] 预览方向（横屏 / 竖屏）
 * @returns {{value:number, ratio:number, d:number, ratioText:string, orientation:string,
 *            simplifiedRatio:{long:number, short:number, width:number, height:number},
 *            screenWidth:number, screenHeight:number}}
 */
export const computeScreenWidthReference = (screenLike = null, options = {}) => {
    const orientation = options.orientation === PIXEL_ORIENTATION_LANDSCAPE ?
        PIXEL_ORIENTATION_LANDSCAPE : PIXEL_ORIENTATION_PORTRAIT;
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

    // 最简比例：2400×1080 → 20:9，而不是直接拿 2400 / 1080 的浮点比值。
    const simplified = simplifyAspectRatio(sw, sh);
    const longRatio = simplified.long / simplified.short;
    const shortRatio = simplified.short / simplified.long;

    const A = REFERENCE_ANCHORS;
    const isLandscape = orientation === PIXEL_ORIENTATION_LANDSCAPE;
    // 把比例线性映射成公式里的差值 d，再代回原公式 F(m,n)
    const dFrom = (p, p1, p2) => A.phoneDifference +
        (A.laptopDifference - A.phoneDifference) * (p - p1) / (p2 - p1);
    const valueFrom = d => A.phoneValue +
        (A.laptopValue - A.phoneValue) * (d - A.phoneDifference) / (A.laptopDifference - A.phoneDifference);

    // 竖屏：宽方向是长边，按「长边:短边」插值，锚点 20/9 → 490、16/10 → 900
    let d = dFrom(longRatio, A.phoneRatio, A.laptopRatio);
    let value = valueFrom(d);
    if (isLandscape) {
        // 横屏：宽方向是短边，按「短边:长边」插值，锚点同步取倒数。
        d = dFrom(shortRatio, 1 / A.phoneRatio, 1 / A.laptopRatio);
        // 倒数比例的线性插值在 4:3、21:9 这类比例上会与竖屏拉开 8%~10%，
        // 再与竖屏结果取几何平均，把差异收敛到几个像素（约 1%~4%）。
        value = Math.sqrt(Math.max(1, value * valueFrom(d))) * LANDSCAPE_WIDTH_SCALE;
    }
    value = Math.max(2, Math.min(10000, Math.round(value)));

    return {
        value,
        ratio: longRatio,
        d,
        orientation,
        // 竖屏显示「长边:短边」（20:9），横屏显示「短边:长边」（9:20），
        // 两者是同一个屏幕的两种最简写法，数值自然接近。
        ratioText: isLandscape ?
            `${simplified.short}:${simplified.long}` :
            `${simplified.long}:${simplified.short}`,
        simplifiedRatio: simplified,
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
 * @param {number} targetWidth 目标列数（即当前设备预览宽度）
 * @param {string} [position] 预览位置 'left'|'center'|'right'；不传时保持原相对比例
 * @returns {Array<Array<string|null>>} 重排后的完整二维数组
 */
export const reflowPixelDataToWidth = (pixelData, targetWidth, position = null) => {
    const info = findContentBlock(pixelData);
    if (!info) return pixelData;
    const {h, w: w0, first, last, fillColor, tailColor} = info;
    const W = Math.max(2, Math.round(Number(targetWidth) || w0));

    // 没有内容块（整张都是纯色列）：不重排，只按预览位置裁剪 / 补齐。
    // 像「11 深 + 2 白 + 11 深」这类整列同色的标尺图案，每一列都算纯色列，
    // 若一律从第 0 列开始裁，贴右 / 居中的图案会被整块裁掉，所以按位置取窗口。
    if (first < 0) {
        let start = 0;
        if (W < w0) {
            if (position === 'right') start = w0 - W;
            else if (position === 'center') start = Math.floor((w0 - W) / 2);
        }
        return Array.from({length: h}, (_, y) =>
            Array.from({length: W}, (_, x) => {
                const sx = start + x;
                return sx < w0 ? cellAt(pixelData, y, sx) : fillColor;
            }));
    }

    const blockWidth = last - first;
    // 原内容块的水平中心比例
    const centerRatio = (first + last) / 2 / w0;

    // 内容块比目标宽度还宽：从 0 开始放并截断
    if (blockWidth >= W) {
        return Array.from({length: h}, (_, y) =>
            Array.from({length: W}, (_, x) => cellAt(pixelData, y, first + x)));
    }

    // 指定预览位置时，按位置把图案贴到左侧 / 居中 / 右侧；
    // 两侧都用「相同颜色列」填充（与 v3 灵活编码一致）。
    // 不传位置时保留旧行为：按图案原来的水平比例落位。
    let newStart;
    if (position === 'left') {
        newStart = 0;
    } else if (position === 'right') {
        newStart = W - blockWidth;
    } else if (position === 'center') {
        newStart = clampInt((W - blockWidth) / 2, 0, W - blockWidth);
    } else {
        newStart = clampInt(centerRatio * W - blockWidth / 2, 0, W - blockWidth);
    }
    const rightCount = W - newStart - blockWidth;
    const hasPosition = position === 'left' || position === 'center' || position === 'right';
    const leftColor = hasPosition ? fillColor : fillColor;
    const rightColor = hasPosition ? fillColor : tailColor;

    return Array.from({length: h}, (_, y) => {
        const row = [];
        for (let i = 0; i < newStart; i++) row.push(leftColor);
        for (let x = first; x < last; x++) row.push(cellAt(pixelData, y, x));
        for (let i = 0; i < rightCount; i++) row.push(rightColor);
        return row;
    });
};

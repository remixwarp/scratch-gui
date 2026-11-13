/**
 * 像素主题画布数据的编码格式。
 *
 * 内部（渲染 / 预览 / PNG 导出 / localStorage）始终使用完整二维数组 [行][列]，
 * 只有在「导出 JSON」时才按所选格式编码，「导入 JSON」时再解码还原。
 *
 * 网格设置里的两个选项：
 *   1) full     / 逐个记录（旧方式）：pixelData 二维数组，每一格都写一个颜色。
 *   2) segments / 灵活记录（新方式）：按「列」扫描最终画布，把相同颜色的列合并。
 *
 * 灵活记录的结构（v2）：
 *   {
 *     encoding: 'segments', v: 2,
 *     w: 900,                      // 画布列数（画布尺寸，不是「某段有几列」）
 *     h: 24,                       // 画布行数
 *     segs: [
 *       ['s', '#75c1c4', 388],     // 前面 388 列整列同色，记录列数
 *       ['p', [col, col, ...]],    // 第一张图片：逐列逐格记录，每列 h 个颜色
 *       ['s', '#75c1c4', 60],      // 中间间隔 60 列同色：因间距限制必须记录列数，
 *                                  // 否则后面的图片无法定位
 *       ['p', [col, ...]],         // 第二张图片
 *       ['s', '#75c1c4']           // 最后一段同色：不记录列数，解码时用 w 减去前面所有段
 *     ]
 *   }
 *   's' = solid（整列所有行颜色相同），'p' = pixels（列内有不同颜色，逐格记录）。
 *
 * 关键特性：
 *   - 编码只读取最终画布的像素，不依赖「导入了几张图片 / 插了几次列」等元信息。
 *     因此任意多张图片、任意间距、任意重复颜色都能被识别并准确记录。
 *   - 凡「整列 h 个像素同色」的列都会被合并进 solid 段（包括图片里恰好纯色的列），
 *     展开时逐列还原，完全无损。
 *   - 只有最后一段可以省略列数；中间的 solid 段一律显式记录列数。
 *   - w / h 只是画布尺寸两个整数，替代旧二维数组里隐含的行列长度。
 */

export const PIXEL_ENCODING_FULL = 'full';
export const PIXEL_ENCODING_SEGMENTS = 'segments';

const SEGMENTS_VERSION = 2;

/** 判断一个值是否可以作为像素颜色（颜色字符串或透明占位 null） */
const isPixelColor = value => value === null || typeof value === 'string';

const toCount = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** 是否为 v2「灵活记录」对象 */
const isV2 = data => !!data && !Array.isArray(data) && typeof data === 'object' &&
    data.encoding === PIXEL_ENCODING_SEGMENTS && Array.isArray(data.segs);

/** 是否为早期实验性的三段式对象（未正式发布，仍兼容以便读取旧草稿） */
const isLegacyRows = data => !!data && !Array.isArray(data) && typeof data === 'object' &&
    data.encoding === PIXEL_ENCODING_SEGMENTS && Array.isArray(data.rows);

/** 判断数据是否为「灵活记录」编码对象（而非逐个记录的二维数组） */
export const isSegmentsEncoded = data => isV2(data) || isLegacyRows(data);

/** 取第 x 列（长度 h 的数组），行缺失时补 null */
const columnAt = (pixelData, x, h) => {
    const col = new Array(h);
    for (let y = 0; y < h; y++) {
        const row = pixelData[y];
        col[y] = Array.isArray(row) && x < row.length ? row[x] : null;
    }
    return col;
};

/** 判断一列是否为「整列同色」 */
const isSolidColumn = col => {
    if (col.length === 0) return false;
    const color = col[0];
    for (let i = 1; i < col.length; i++) {
        if (col[i] !== color) return false;
    }
    return true;
};

/**
 * 把完整二维数组编码成指定格式。
 * @param {Array<Array<string|null>>} pixelData 完整二维数组 [行][列]
 * @param {string} encoding 'full' | 'segments'
 * @returns {Array|object} 编码结果；full 时原样返回二维数组
 */
export const encodePixelData = (pixelData, encoding = PIXEL_ENCODING_FULL) => {
    if (!Array.isArray(pixelData)) {
        // 已经是编码对象或非法数据，原样返回，由调用方处理
        return pixelData;
    }
    if (encoding !== PIXEL_ENCODING_SEGMENTS) {
        return pixelData;
    }

    const h = pixelData.length;
    // 容错：行长度可能不齐，取最大列数作为画布宽度，缺的格补 null
    let w = 0;
    for (const row of pixelData) {
        if (Array.isArray(row) && row.length > w) w = row.length;
    }

    const segs = [];
    for (let x = 0; x < w; x++) {
        const col = columnAt(pixelData, x, h);
        const last = segs[segs.length - 1];
        if (isSolidColumn(col)) {
            // 整列同色：与前一个同色 solid 段合并，否则新开一段
            const color = col[0];
            if (last && last[0] === 's' && last[1] === color) {
                last[2] += 1;
            } else {
                segs.push(['s', color, 1]);
            }
        } else if (last && last[0] === 'p') {
            // 非同色列：并入当前图片段，逐格记录
            last[1].push(col);
        } else {
            segs.push(['p', [col]]);
        }
    }

    // 最后一段若是 solid，去掉列数：解码时由 w - 已展开列数自动推断
    if (segs.length > 0) {
        const tail = segs[segs.length - 1];
        if (tail[0] === 's') segs[segs.length - 1] = ['s', tail[1]];
    }

    return {
        encoding: PIXEL_ENCODING_SEGMENTS,
        v: SEGMENTS_VERSION,
        w,
        h,
        segs
    };
};

/** 解码早期实验性三段式对象 */
const decodeLegacyRows = data => data.rows.map(row => {
    if (!row || typeof row !== 'object') return [];
    const [headColor, headCount] = Array.isArray(row.head) ? row.head : [null, 0];
    const [tailColor, tailCount] = Array.isArray(row.tail) ? row.tail : [null, 0];
    const image = Array.isArray(row.image) ? row.image : [];
    const result = [];
    for (let i = 0; i < toCount(headCount); i++) result.push(headColor);
    for (const color of image) result.push(isPixelColor(color) ? color : null);
    for (let i = 0; i < toCount(tailCount); i++) result.push(tailColor);
    return result;
});

/**
 * 把任意格式（逐个记录二维数组 / 灵活记录对象）解码成完整二维数组。
 * @param {Array|object} data 导出的 pixelData
 * @returns {Array|*} 解码后的二维数组；无法识别时原样返回
 */
export const decodePixelData = data => {
    // 逐个记录：本身就是二维数组
    if (Array.isArray(data)) return data;

    if (isLegacyRows(data)) return decodeLegacyRows(data);
    if (!isV2(data)) return data;

    const h = Number.isFinite(data.h) && data.h > 0 ? Math.floor(data.h) : 0;
    const w = Number.isFinite(data.w) && data.w > 0 ? Math.floor(data.w) : 0;
    const grid = Array.from({length: h}, () => []);
    let used = 0;

    for (const seg of data.segs) {
        if (!Array.isArray(seg)) continue;
        if (seg[0] === 's') {
            const color = isPixelColor(seg[1]) ? seg[1] : null;
            // 第三段缺失 = 最后一段同色，不记录列数，用画布宽度补足
            const n = seg.length >= 3 && Number.isFinite(seg[2]) ?
                toCount(seg[2]) : Math.max(0, w - used);
            for (let y = 0; y < h; y++) {
                for (let i = 0; i < n; i++) grid[y].push(color);
            }
            used += n;
        } else if (seg[0] === 'p' && Array.isArray(seg[1])) {
            // 图片段：每个元素是一列，逐格还原
            for (const col of seg[1]) {
                const cells = Array.isArray(col) ? col : [];
                for (let y = 0; y < h; y++) {
                    grid[y].push(isPixelColor(cells[y]) ? cells[y] : null);
                }
                used += 1;
            }
        }
    }

    // 容错：坏数据导致列数对不上时，补 null / 截断到 w，保证每行等长
    for (let y = 0; y < h; y++) {
        const row = grid[y];
        while (row.length < w) row.push(null);
        if (row.length > w) row.length = w;
    }
    return grid;
};

/** 取数据所标注的编码格式，缺省视为逐个记录 */
export const getPixelEncoding = (data, fallbackEncoding) => {
    if (fallbackEncoding === PIXEL_ENCODING_SEGMENTS) return PIXEL_ENCODING_SEGMENTS;
    if (isSegmentsEncoded(data)) return PIXEL_ENCODING_SEGMENTS;
    return PIXEL_ENCODING_FULL;
};

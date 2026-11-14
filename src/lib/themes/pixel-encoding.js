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
 *
 * 灵活记录的结构（v3，按「预览位置」记录，选中预览位置后启用）：
 *   {
 *     encoding: 'segments', v: 3,
 *     w: 900, h: 24,                 // 导出时的画布尺寸
 *     position: 'left'|'center'|'right',
 *     fill: '#75c1c4',               // 相同颜色列（外侧填充）的颜色
 *     padding: ['right'],            // 相同颜色列出现在哪一个部分
 *     content: [                     // 「不同颜色的列」构成的图案（含图案内部间隔）
 *       ['p', [col, col, ...]],
 *       ['s', '#75c1c4', 60]         // 图案中间的相同颜色列：必须写列数
 *     ],
 *     pad: 388                       // 仅 position='center'：左右单侧填充列数
 *   }
 *   - 预览位置：左侧 → 图案移到最左、右侧补相同颜色列；右侧 → 左侧补；
 *     中间 → 左右两侧同时补相同颜色列。
 *   - 填充列数 = 当前预览宽度 − 图案宽度；中间位置再除以 2 四舍五入。
 *   - 只要相同颜色列不在中间（左侧 / 右侧单侧填充），都不写列数；
 *     中间的相同颜色列（图案内部间隔、以及居中时左右两侧）必须写列数。
 *   - v2 / full / 早期三段式对象仍可正常解码，保证旧主题兼容。
 */

export const PIXEL_ENCODING_FULL = 'full';
export const PIXEL_ENCODING_SEGMENTS = 'segments';

export const PIXEL_POSITION_LEFT = 'left';
export const PIXEL_POSITION_CENTER = 'center';
export const PIXEL_POSITION_RIGHT = 'right';
export const PIXEL_POSITIONS = [
    PIXEL_POSITION_LEFT, PIXEL_POSITION_CENTER, PIXEL_POSITION_RIGHT
];

const SEGMENTS_VERSION = 2;
const SEGMENTS_VERSION_V3 = 3;

/** 判断一个值是否可以作为像素颜色（颜色字符串或透明占位 null） */
const isPixelColor = value => value === null || typeof value === 'string';

const toCount = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

const isSegmentsObject = data => !!data && !Array.isArray(data) &&
    typeof data === 'object' && data.encoding === PIXEL_ENCODING_SEGMENTS;

/** 是否为 v2「灵活记录」对象 */
const isV2 = data => isSegmentsObject(data) && data.v !== SEGMENTS_VERSION_V3 &&
    Array.isArray(data.segs);

/** 是否为 v3「按预览位置」对象 */
const isV3 = data => isSegmentsObject(data) && data.v === SEGMENTS_VERSION_V3 &&
    Array.isArray(data.content);

/** 是否为早期实验性的三段式对象（未正式发布，仍兼容以便读取旧草稿） */
const isLegacyRows = data => isSegmentsObject(data) && Array.isArray(data.rows);

/** 判断数据是否为「灵活记录」编码对象（而非逐个记录的二维数组） */
export const isSegmentsEncoded = data => isV2(data) || isV3(data) || isLegacyRows(data);

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
 * 把完整二维数组按「预览位置」编码成 v3 灵活记录对象。
 * 只读取最终画布的像素列，不依赖导入了几张图片等元信息。
 * @param {Array<Array<string|null>>} pixelData 完整二维数组
 * @param {object} options {position: 'left'|'center'|'right'}
 * @returns {object} v3 编码对象
 */
const encodeV3 = (pixelData, options) => {
    const position = PIXEL_POSITIONS.includes(options.position) ?
        options.position : PIXEL_POSITION_CENTER;
    const h = pixelData.length;
    let w = 0;
    for (const row of pixelData) {
        if (Array.isArray(row) && row.length > w) w = row.length;
    }

    const columns = [];
    const solidFlags = [];
    for (let x = 0; x < w; x++) {
        const col = columnAt(pixelData, x, h);
        columns.push(col);
        solidFlags.push(isSolidColumn(col));
    }

    // 图案 = 第一个到最后一个「不同颜色的列」；外侧整列同色都是相同颜色列
    let first = -1;
    let last = -1;
    for (let x = 0; x < w; x++) {
        if (!solidFlags[x]) {
            if (first < 0) first = x;
            last = x + 1;
        }
    }

    // 整张画布都是相同颜色列：没有图案，保留一个显式列数的纯色段
    if (first < 0) {
        const color = columns.length ? columns[0][0] : null;
        return {
            encoding: PIXEL_ENCODING_SEGMENTS,
            v: SEGMENTS_VERSION_V3,
            w,
            h,
            position,
            fill: isPixelColor(color) ? color : null,
            padding: [PIXEL_POSITION_LEFT, PIXEL_POSITION_RIGHT],
            content: [['s', isPixelColor(color) ? color : null, w]]
        };
    }

    // undefined 表示这一侧没有相同颜色列；null 是合法的「透明格」颜色，
    // 两者不能混用，否则会把填充色误写成透明。
    const fillLeft = first > 0 ? columns[first - 1][0] : undefined;
    const fillRight = last < w ? columns[last][0] : undefined;
    const fill = fillLeft !== undefined ? fillLeft :
        (fillRight !== undefined ? fillRight : null);
    const padding = [];
    if (first > 0) padding.push(PIXEL_POSITION_LEFT);
    if (last < w) padding.push(PIXEL_POSITION_RIGHT);

    // 图案内部：整列同色（含多图片之间的间隔列）显式写列数；
    // 不同颜色的列逐格记录。图案段的最后一段若是纯色也必须写列数，
    // 因为它不是整张画布的尾部，宽度不能靠 w 推断。
    const content = [];
    for (let x = first; x < last; x++) {
        const lastSeg = content[content.length - 1];
        if (solidFlags[x]) {
            const color = isPixelColor(columns[x][0]) ? columns[x][0] : null;
            if (lastSeg && lastSeg[0] === 's' && lastSeg[1] === color) {
                lastSeg[2] += 1;
            } else {
                content.push(['s', color, 1]);
            }
        } else if (lastSeg && lastSeg[0] === 'p') {
            lastSeg[1].push(columns[x]);
        } else {
            content.push(['p', [columns[x]]]);
        }
    }

    const contentWidth = last - first;
    const padCount = Math.max(0, w - contentWidth);
    const result = {
        encoding: PIXEL_ENCODING_SEGMENTS,
        v: SEGMENTS_VERSION_V3,
        w,
        h,
        position,
        fill,
        padding,
        content
    };
    // 「中间」位置左右两侧都有相同颜色列，必须写上单侧列数；
    // 左侧 / 右侧只有单侧填充，不写列数（解码时按本机预览宽度自动推算）。
    if (position === PIXEL_POSITION_CENTER) result.pad = Math.round(padCount / 2);
    return result;
};

/**
 * 把完整二维数组编码成指定格式。
 * @param {Array<Array<string|null>>} pixelData 完整二维数组 [行][列]
 * @param {string} encoding 'full' | 'segments'
 * @param {object} [options] 传入 position 时启用 v3「按预览位置」编码
 * @returns {Array|object} 编码结果；full 时原样返回二维数组
 */
export const encodePixelData = (pixelData, encoding = PIXEL_ENCODING_FULL, options = {}) => {
    if (!Array.isArray(pixelData)) {
        // 已经是编码对象或非法数据，原样返回，由调用方处理
        return pixelData;
    }
    if (encoding !== PIXEL_ENCODING_SEGMENTS) {
        return pixelData;
    }
    if (options && PIXEL_POSITIONS.includes(options.position)) {
        return encodeV3(pixelData, options);
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

/** 把 v3「按预览位置」对象还原成完整二维数组 */
const decodeV3 = (data, options = {}) => {
    const h = Number.isFinite(data.h) && data.h > 0 ? Math.floor(data.h) : 0;
    const targetHeight = Math.max(1, Math.floor(Number(options.height) || h || 1));
    const W = Math.max(2, Math.floor(Number(options.width) || data.w || 2));
    const rawPosition = options.position || data.position;
    const position = PIXEL_POSITIONS.includes(rawPosition) ? rawPosition : PIXEL_POSITION_CENTER;

    // 展开图案（不同颜色的列 + 图案内部的相同颜色间隔列）
    const content = [];
    for (const seg of data.content) {
        if (!Array.isArray(seg)) continue;
        if (seg[0] === 's') {
            const color = isPixelColor(seg[1]) ? seg[1] : null;
            const n = Number.isFinite(seg[2]) ? Math.max(0, Math.floor(seg[2])) : 0;
            for (let i = 0; i < n; i++) content.push(Array.from({length: h}, () => color));
        } else if (seg[0] === 'p' && Array.isArray(seg[1])) {
            for (const col of seg[1]) {
                const cells = Array.isArray(col) ? col : [];
                content.push(Array.from({length: h}, (_, y) =>
                    (isPixelColor(cells[y]) ? cells[y] : null)));
            }
        }
    }

    const fill = isPixelColor(data.fill) ? data.fill : null;
    const cw = content.length;
    const padTotal = Math.max(0, W - cw);
    let leftPad = 0;
    if (position === PIXEL_POSITION_RIGHT) {
        leftPad = padTotal;
    } else if (position === PIXEL_POSITION_CENTER) {
        // 有本机预览宽度时按「宽度 − 图案宽度」除以 2 四舍五入；
        // 纯 JSON 往返（未给宽度）时用文件里写下的单侧列数还原。
        leftPad = options.width ? Math.round(padTotal / 2) :
            Math.round(Number.isFinite(data.pad) ? data.pad : padTotal / 2);
    }
    leftPad = Math.max(0, Math.min(padTotal, leftPad));
    const rightPad = padTotal - leftPad;

    const grid = [];
    for (let y = 0; y < targetHeight; y++) {
        const row = [];
        for (let i = 0; i < leftPad; i++) row.push(fill);
        for (const col of content) row.push(y < h ? col[y] : null);
        for (let i = 0; i < rightPad; i++) row.push(fill);
        // 图案比目标宽度还宽时安全截断
        grid.push(row.length > W ? row.slice(0, W) : row);
    }
    return grid;
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
export const decodePixelData = (data, options = {}) => {
    // 逐个记录：本身就是二维数组
    if (Array.isArray(data)) return data;

    if (isLegacyRows(data)) return decodeLegacyRows(data);
    if (isV3(data)) return decodeV3(data, options);
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

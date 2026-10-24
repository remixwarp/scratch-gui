// .rfd（流程图描述）文本的解析、布局与 SVG 渲染。
//
// 语法（与超级重构里 .rfd 文件的「描述」面板一致）：
//   ( 文字 )  椭圆 · 开始 / 结束
//   [ 文字 ]  矩形 · 处理 / 语句
//   < 文字 >  菱形 · 判断
//   / 文字 /  平行四边形 · 输入 / 输出
//   ~ 文字 ~  虚线框 · 注释
//   赋值：(开始,v:1-2) 命名为 1，并连接到 2
//   流程分隔：--- 或空行

const NS = 'http://www.w3.org/2000/svg';

const SHAPES = {
    oval: {w: 160, h: 48},
    rect: {w: 180, h: 48},
    diamond: {w: 190, h: 90},
    para: {w: 180, h: 48},
    comment: {w: 180, h: 44}
};

const H_GAP = 80;
const V_GAP = 62;
const FLOW_GAP = 50;
const SEP_GAP = 30;
const TOP_PAD = 60;
const LEFT_PAD = 60;

export const RFD_DEFAULT_TEXT = `(开始,v:1-2)
[执行操作,^:2,}:3-4] / 输出结果,{:4,v:5-6 /
(结束,^:6)`;

const PALETTES = {
    light: {
        nodeFill: '#ffffff',
        nodeStroke: '#3a3f47',
        commentFill: '#fdfbf3',
        commentStroke: '#9aa0a6',
        edge: '#5f6368',
        text: '#1a1a1a',
        legendText: '#5f6368',
        hotspotFill: '#ffffff',
        hotspotHover: '#e6f0ff',
        hotspotStroke: '#4c8bf5',
        hotspotActive: '#4c8bf5',
        separator: '#c0c4cc',
        empty: '#9aa0a6'
    },
    dark: {
        nodeFill: '#252526',
        nodeStroke: '#8a8a8a',
        commentFill: '#2a2822',
        commentStroke: '#7a7a7a',
        edge: '#9a9a9a',
        text: '#e0e0e0',
        legendText: '#a0a0a0',
        hotspotFill: '#1e1e1e',
        hotspotHover: '#243b5c',
        hotspotStroke: '#4d97ff',
        hotspotActive: '#4d97ff',
        separator: '#4a4a4a',
        empty: '#8a8a8a'
    }
};

/* ================= 解析工具 ================= */

const unescapeStr = s => s.replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c));

const escapeStr = s => s.replace(/[\\,:-]/g, m => `\\${m}`);

const splitEscaped = (str, sep) => {
    const result = [];
    let cur = '';
    let escaped = false;
    for (let k = 0; k < str.length; k++) {
        const c = str[k];
        if (escaped) {
            cur += `\\${c}`;
            escaped = false;
            continue;
        }
        if (c === '\\') {
            escaped = true;
            continue;
        }
        if (c === sep) {
            result.push(cur);
            cur = '';
            continue;
        }
        cur += c;
    }
    if (escaped) cur += '\\';
    result.push(cur);
    return result;
};

const shapeOpen = shape =>
    (shape === 'oval' ? '(' : shape === 'rect' ? '[' : shape === 'diamond' ? '<' : shape === 'para' ? '/' : '~');

const shapeClose = shape =>
    (shape === 'oval' ? ')' : shape === 'rect' ? ']' : shape === 'diamond' ? '>' : shape === 'para' ? '/' : '~');

const scanLine = line => {
    const result = [];
    let i = 0;
    const pairs = {'(': ')', '[': ']', '<': '>', '/': '/', '~': '~'};
    while (i < line.length) {
        const ch = line[i];
        if (!pairs[ch]) {
            i++;
            continue;
        }
        const close = pairs[ch];
        let end = -1;
        let j = i + 1;
        let escaped = false;
        while (j < line.length) {
            if (!escaped && line[j] === '\\') {
                escaped = true;
                j++;
                continue;
            }
            if (!escaped && line[j] === close) {
                end = j;
                break;
            }
            escaped = false;
            j++;
        }
        if (end === -1) break;
        const inner = line.slice(i + 1, end);
        let shape = null;
        if (ch === '(') shape = 'oval';
        else if (ch === '[') shape = 'rect';
        else if (ch === '<') shape = 'diamond';
        else if (ch === '/') shape = 'para';
        else if (ch === '~') shape = 'comment';

        const parts = splitEscaped(inner, ',');
        const textPart = unescapeStr(parts[0].trim());
        const assigns = [];
        for (let p = 1; p < parts.length; p++) {
            const seg = parts[p].trim();
            if (!seg) continue;
            const dirMatch = seg.match(/^([{}v^])\s*:/);
            if (!dirMatch) continue;
            const dir = dirMatch[1];
            const val = seg.slice(dirMatch[0].length);
            const segments = splitEscaped(val, '-');
            const id = unescapeStr(segments[0].trim());
            const targetIds = [...new Set(
                segments.slice(1).map(s => unescapeStr(s.trim()))
                    .filter(Boolean)
            )];
            if (id) assigns.push({dir, id, targetIds});
        }
        if (textPart || shape) result.push({shape, text: textPart, assigns, start: i, end});
        i = end + 1;
    }
    return result;
};

const parseText = text => {
    const lines = String(text || '').split('\n');
    const flows = [[]];
    for (const raw of lines) {
        const trimmed = raw.trim();

        // 显式流程分隔符 ---
        if (trimmed === '---') {
            const cur = flows[flows.length - 1];
            if (cur.length > 0) flows.push([]);
            continue;
        }

        // 空行与注释行
        if (!trimmed || trimmed.startsWith('#')) {
            if (!trimmed) {
                const cur = flows[flows.length - 1];
                if (cur.length > 0) flows.push([]);
            }
            continue;
        }

        const rowBlocks = scanLine(trimmed);
        if (rowBlocks.length > 0) flows[flows.length - 1].push(rowBlocks);
    }
    while (flows.length > 1 && flows[flows.length - 1].length === 0) flows.pop();

    const blocks = [];
    flows.forEach((rows, fi) => {
        rows.forEach((rowBlocks, ri) => {
            rowBlocks.forEach((b, ci) => {
                blocks.push({
                    id: `f${fi}r${ri}c${ci}`,
                    flowIndex: fi,
                    rowIndex: ri,
                    colIndex: ci,
                    shape: b.shape,
                    text: b.text,
                    assigns: b.assigns
                });
            });
        });
    });
    return {blocks, flows};
};

/* ================= 布局 ================= */

const computeLayout = parsed => {
    const {blocks, flows} = parsed;
    if (!blocks.length) {
        return {layout: {}, totalWidth: 600, totalHeight: 300, flowSizes: [], flowX: [], maxFlowHeight: 0};
    }
    const flowSizes = flows.map(rows => {
        const rowHeights = [];
        let maxW = 0;
        let totalH = 0;
        rows.forEach((rowBlocks, ri) => {
            let rowW = 0;
            let maxH = 0;
            rowBlocks.forEach((b, i) => {
                const s = SHAPES[b.shape];
                rowW += s.w + (i > 0 ? H_GAP : 0);
                maxH = Math.max(maxH, s.h);
            });
            maxW = Math.max(maxW, rowW);
            rowHeights.push(maxH);
            totalH += maxH + (ri > 0 ? V_GAP : 0);
        });
        return {w: maxW, h: totalH, rowHeights};
    });
    const flowX = [];
    let x = LEFT_PAD;
    flowSizes.forEach((s, i) => {
        if (i > 0) x += FLOW_GAP + SEP_GAP;
        flowX.push(x);
        x += s.w;
    });
    const totalWidth = x + LEFT_PAD;
    let maxFlowHeight = 0;
    flowSizes.forEach(s => {
        maxFlowHeight = Math.max(maxFlowHeight, s.h);
    });
    const totalHeight = (TOP_PAD * 2) + maxFlowHeight;
    const layout = {};
    blocks.forEach(b => {
        const fi = b.flowIndex;
        const flowSize = flowSizes[fi];
        const fx = flowX[fi];
        const rows = flows[fi];
        let y = TOP_PAD;
        for (let r = 0; r < b.rowIndex; r++) y += flowSize.rowHeights[r] + V_GAP;
        const rowH = flowSize.rowHeights[b.rowIndex];
        const rowBlocks = rows[b.rowIndex];
        let rowW = 0;
        rowBlocks.forEach((rb, i) => {
            rowW += SHAPES[rb.shape].w + (i > 0 ? H_GAP : 0);
        });
        let rx = fx + ((flowSize.w - rowW) / 2);
        for (let c = 0; c < b.colIndex; c++) rx += SHAPES[rowBlocks[c].shape].w + H_GAP;
        const s = SHAPES[b.shape];
        layout[b.id] = {cx: rx + (s.w / 2), top: y + ((rowH - s.h) / 2), w: s.w, h: s.h};
    });
    return {layout, totalWidth, totalHeight, flowSizes, flowX, maxFlowHeight};
};

/* ================= 热点 / 连接 ================= */

const hotspotPos = (lay, side) => {
    if (side === 'top') return {x: lay.cx, y: lay.top};
    if (side === 'bottom') return {x: lay.cx, y: lay.top + lay.h};
    if (side === 'left') return {x: lay.cx - (lay.w / 2), y: lay.top + (lay.h / 2)};
    return {x: lay.cx + (lay.w / 2), y: lay.top + (lay.h / 2)};
};

const dirToSide = dir => ({'{': 'left', '}': 'right', 'v': 'bottom', '^': 'top'}[dir]);

const sideToDir = side => ({left: '{', right: '}', bottom: 'v', top: '^'}[side]);

const connectionPath = (p1, p2, side1, side2) => {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const d = Math.max(24, Math.min(80, dist * 0.45));
    const dir1 = {top: {x: 0, y: -1}, bottom: {x: 0, y: 1}, left: {x: -1, y: 0}, right: {x: 1, y: 0}}[side1];
    const dir2 = {top: {x: 0, y: -1}, bottom: {x: 0, y: 1}, left: {x: -1, y: 0}, right: {x: 1, y: 0}}[side2];
    const c1 = {x: p1.x + (dir1.x * d), y: p1.y + (dir1.y * d)};
    const c2 = {x: p2.x + (dir2.x * d), y: p2.y + (dir2.y * d)};
    return `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
};

const buildIdMapAndConnections = parsed => {
    const idMap = {};
    const connections = [];
    const autoConnects = [];

    parsed.blocks.forEach(b => {
        b.assigns.forEach(a => {
            const side = dirToSide(a.dir);
            const isNewId = !idMap[a.id];
            if (isNewId) idMap[a.id] = {blockId: b.id, side};

            if (a.targetIds.length === 0) {
                if (!isNewId) {
                    autoConnects.push({fromId: b.id, fromSide: side, targetId: a.id});
                }
            } else {
                a.targetIds.forEach(tid => {
                    autoConnects.push({fromId: b.id, fromSide: side, targetId: tid});
                });
            }
        });
    });

    autoConnects.forEach(c => {
        const target = idMap[c.targetId];
        if (!target) return;
        if (target.blockId === c.fromId && target.side === c.fromSide) return;
        const exists = connections.some(x =>
            x.fromId === c.fromId && x.fromSide === c.fromSide &&
            x.toId === target.blockId && x.toSide === target.side
        );
        if (!exists) {
            connections.push({
                fromId: c.fromId,
                fromSide: c.fromSide,
                toId: target.blockId,
                toSide: target.side
            });
        }
    });

    return {idMap, connections};
};

const nextNumericId = idMap => {
    let n = 1;
    while (idMap[String(n)]) n++;
    return String(n);
};

/* ================= 文本回写 ================= */

const updateTextAssign = (text, blockId, side, id, targetIds) => {
    const parsed = parseText(text);
    const b = parsed.blocks.find(x => x.id === blockId);
    if (!b) return null;
    const dir = sideToDir(side);
    const lines = String(text).split('\n');

    let flowCount = 0;
    let rowCount = 0;
    let hasContent = false;

    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();

        // --- 显式流程分隔
        if (t === '---') {
            if (hasContent) {
                flowCount++;
                rowCount = 0;
                hasContent = false;
            }
            continue;
        }

        if (!t || t.startsWith('#')) {
            if (!t && hasContent) {
                flowCount++;
                rowCount = 0;
                hasContent = false;
            }
            continue;
        }

        if (flowCount === b.flowIndex && rowCount === b.rowIndex) {
            const rowBlocks = scanLine(t);
            if (rowBlocks.length > b.colIndex) {
                const rb = rowBlocks[b.colIndex];
                if (typeof rb.start !== 'number' || typeof rb.end !== 'number') return null;

                const assigns = rb.assigns.filter(a => dirToSide(a.dir) !== side);
                if (id) assigns.push({dir, id, targetIds: (targetIds || []).slice()});

                const open = shapeOpen(rb.shape);
                const close = shapeClose(rb.shape);
                let blockStr = open + escapeStr(rb.text);
                assigns.forEach(a => {
                    blockStr += `,${a.dir}:${escapeStr(a.id)}`;
                    if (a.targetIds && a.targetIds.length) {
                        a.targetIds.forEach(tid => {
                            blockStr += `-${escapeStr(tid)}`;
                        });
                    }
                });
                blockStr += close;

                const leading = lines[i].length - lines[i].replace(/^\s+/, '').length;
                lines[i] = ' '.repeat(leading) + t.slice(0, rb.start) + blockStr + t.slice(rb.end + 1);
                return lines.join('\n');
            }
            return null;
        }

        hasContent = true;
        rowCount++;
    }
    return null;
};

/**
 * 把两个热点点连起来，返回新的文本；失败返回 null。
 * @param {string} text .rfd 文本
 * @param {{blockId: string, side: string}} from 起点热点
 * @param {{blockId: string, side: string}} to 终点热点
 * @returns {?string} 新的 .rfd 文本，失败时为 null
 */
export const connectRfdHotspots = (text, from, to) => {
    if (!from || !to) return null;
    const parsed = parseText(text);
    const fb = parsed.blocks.find(b => b.id === from.blockId);
    const tb = parsed.blocks.find(b => b.id === to.blockId);
    if (!fb || !tb) return null;

    let current = String(text);

    const fa = fb.assigns.find(a => dirToSide(a.dir) === from.side);
    let fromPointId = fa ? fa.id : null;
    const existingTargets = fa ? fa.targetIds.slice() : [];

    const ta = tb.assigns.find(a => dirToSide(a.dir) === to.side);
    let toPointId = ta ? ta.id : null;

    if (!toPointId) {
        toPointId = nextNumericId(buildIdMapAndConnections(parseText(current)).idMap);
        const updated = updateTextAssign(current, to.blockId, to.side, toPointId, []);
        if (!updated) return null;
        current = updated;
    }

    if (!fromPointId) {
        fromPointId = nextNumericId(buildIdMapAndConnections(parseText(current)).idMap);
    }
    if (fromPointId !== toPointId && !existingTargets.includes(toPointId)) {
        existingTargets.push(toPointId);
    }
    return updateTextAssign(current, from.blockId, from.side, fromPointId, existingTargets);
};

/**
 * 清除文本里所有赋值（即所有连线）。
 * @param {string} text .rfd 文本
 * @returns {string} 清除连线后的文本
 */
export const clearRfdConnections = text => {
    const lines = String(text || '').split('\n');
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (!t || t.startsWith('#') || t === '---') continue;
        const rowBlocks = scanLine(t);
        if (rowBlocks.length === 0) continue;

        let newLine = '';
        for (const rb of rowBlocks) {
            newLine += shapeOpen(rb.shape) + escapeStr(rb.text) + shapeClose(rb.shape);
        }
        const leading = lines[i].length - lines[i].replace(/^\s+/, '').length;
        lines[i] = ' '.repeat(leading) + newLine;
    }
    return lines.join('\n');
};

/**
 * 在末尾追加一条新流程。
 * @param {string} text .rfd 文本
 * @returns {string} 追加后的文本
 */
export const appendRfdFlow = text => {
    const v = String(text || '').replace(/\s+$/, '');
    return `${v ? `${v}\n---\n` : ''}(开始)\n[步骤]`;
};

/* ================= SVG 渲染 ================= */

const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
};

const wrapText = (text, maxWidth, fontSize) => {
    if (!text) return [''];
    const lines = [];
    let cur = '';
    let curW = 0;
    for (const ch of text) {
        const w = /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? fontSize : fontSize * 0.55;
        if (curW + w > maxWidth && cur) {
            lines.push(cur);
            cur = '';
            curW = 0;
        }
        cur += ch;
        curW += w;
    }
    if (cur) lines.push(cur);
    return lines;
};

/**
 * 渲染流程图 SVG。
 * @param {string} text .rfd 文本
 * @param {object} options {dark, showHotspot, showId, pending}
 * @returns {{svg: string, width: number, height: number}} SVG 文本与画布尺寸
 */
export const renderRfdSvg = (text, options) => {
    const opts = options || {};
    const palette = opts.dark ? PALETTES.dark : PALETTES.light;
    const pending = opts.pending || null;
    const showHotspot = opts.showHotspot !== false;
    const showId = opts.showId !== false;

    const svg = el('svg', {xmlns: NS});
    svg.setAttribute('viewBox', '0 0 0 0');

    const defs = el('defs', {});
    const marker = el('marker', {
        id: 'rfd-arrow',
        viewBox: '0 0 10 10',
        refX: '9',
        refY: '5',
        markerWidth: '7',
        markerHeight: '7',
        orient: 'auto'
    });
    marker.appendChild(el('path', {d: 'M 0 0 L 10 5 L 0 10 z', fill: palette.edge}));
    defs.appendChild(marker);
    svg.appendChild(defs);

    const parsed = parseText(text);
    const {connections} = buildIdMapAndConnections(parsed);
    const res = computeLayout(parsed);
    const layout = res.layout;
    const vw = res.totalWidth;
    const vh = res.totalHeight;
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.setAttribute('width', String(vw));
    svg.setAttribute('height', String(vh));
    svg.style.background = 'transparent';

    if (!parsed.blocks.length) {
        const t = el('text', {
            'x': vw / 2,
            'y': vh / 2,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            'font-size': 14,
            'fill': palette.empty
        });
        t.textContent = '在左侧输入内容，点击块边缘的 + 连接';
        svg.appendChild(t);
        return {svg: svg.outerHTML, width: vw, height: vh};
    }

    // 流程分隔线
    if (res.flowX.length > 1) {
        const gSep = el('g', {});
        for (let i = 1; i < res.flowX.length; i++) {
            const x = (res.flowX[i - 1] + res.flowSizes[i - 1].w + res.flowX[i]) / 2;
            gSep.appendChild(el('line', {
                'x1': x,
                'y1': TOP_PAD - 22,
                'x2': x,
                'y2': TOP_PAD + res.maxFlowHeight + 22,
                'stroke': palette.separator,
                'stroke-width': '1.4',
                'stroke-dasharray': '6 6'
            }));
        }
        svg.appendChild(gSep);
    }

    // 连线
    const gConn = el('g', {});
    connections.forEach(c => {
        const from = layout[c.fromId];
        const to = layout[c.toId];
        if (!from || !to) return;
        const p1 = hotspotPos(from, c.fromSide);
        const p2 = hotspotPos(to, c.toSide);
        gConn.appendChild(el('path', {
            'd': connectionPath(p1, p2, c.fromSide, c.toSide),
            'stroke': palette.edge,
            'stroke-width': '1.6',
            'fill': 'none',
            'marker-end': 'url(#rfd-arrow)'
        }));
    });
    svg.appendChild(gConn);

    // 节点
    const gNodes = el('g', {});
    parsed.blocks.forEach(b => {
        const lay = layout[b.id];
        if (!lay) return;
        const x = lay.cx - (lay.w / 2);
        let node;
        if (b.shape === 'oval') {
            node = el('rect', {x, y: lay.top, width: lay.w, height: lay.h, rx: lay.h / 2, ry: lay.h / 2});
        } else if (b.shape === 'rect') {
            node = el('rect', {x, y: lay.top, width: lay.w, height: lay.h, rx: 6, ry: 6});
        } else if (b.shape === 'comment') {
            node = el('rect', {x, y: lay.top, width: lay.w, height: lay.h, rx: 6, ry: 6});
            node.setAttribute('stroke-dasharray', '5 4');
        } else if (b.shape === 'diamond') {
            const pts = `${lay.cx},${lay.top} ${x + lay.w},${lay.top + (lay.h / 2)} ` +
                `${lay.cx},${lay.top + lay.h} ${x},${lay.top + (lay.h / 2)}`;
            node = el('polygon', {points: pts});
        } else {
            const sk = 18;
            const pts = `${x + sk},${lay.top} ${x + lay.w},${lay.top} ` +
                `${x + lay.w - sk},${lay.top + lay.h} ${x},${lay.top + lay.h}`;
            node = el('polygon', {points: pts});
        }
        if (b.shape === 'comment') {
            node.setAttribute('fill', palette.commentFill);
            node.setAttribute('stroke', palette.commentStroke);
            node.setAttribute('stroke-width', '1.4');
        } else {
            node.setAttribute('fill', palette.nodeFill);
            node.setAttribute('stroke', palette.nodeStroke);
            node.setAttribute('stroke-width', '1.6');
        }
        gNodes.appendChild(node);

        const fs = 13;
        const lines = wrapText(b.text, lay.w - 32, fs);
        const lh = 18;
        const cy = lay.top + (lay.h / 2);
        const startY = cy - (((lines.length - 1) * lh) / 2);
        lines.forEach((line, i) => {
            const t = el('text', {
                'x': lay.cx,
                'y': startY + (i * lh),
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': fs,
                'fill': palette.text,
                'font-family': 'system-ui, sans-serif',
                'pointer-events': 'none'
            });
            t.textContent = line;
            gNodes.appendChild(t);
        });
    });
    svg.appendChild(gNodes);

    // 热点与 ID
    const gHot = el('g', {});
    parsed.blocks.forEach(b => {
        const lay = layout[b.id];
        if (!lay) return;
        const assignMap = {};
        b.assigns.forEach(a => {
            assignMap[dirToSide(a.dir)] = a;
        });
        ['top', 'bottom', 'left', 'right'].forEach(side => {
            const p = hotspotPos(lay, side);
            const active = pending && pending.blockId === b.id && pending.side === side;

            if (showHotspot) {
                const c = el('circle', {
                    'cx': p.x,
                    'cy': p.y,
                    'r': 9,
                    'fill': active ? palette.hotspotActive : palette.hotspotFill,
                    'stroke': active ? palette.hotspotActive : palette.hotspotStroke,
                    'stroke-width': '1.5',
                    'data-block-id': b.id,
                    'data-side': side,
                    'style': 'cursor:pointer'
                });
                gHot.appendChild(c);
                const t = el('text', {
                    'x': p.x,
                    'y': p.y,
                    'text-anchor': 'middle',
                    'dominant-baseline': 'central',
                    'font-size': 13,
                    'font-weight': 700,
                    'fill': active ? '#ffffff' : palette.hotspotStroke,
                    'style': 'pointer-events:none;user-select:none'
                });
                t.textContent = '+';
                gHot.appendChild(t);
            }

            const assign = assignMap[side];
            if (showId && assign && assign.id) {
                const label = el('text', {
                    'x': p.x,
                    'y': p.y + (side === 'top' ? -14 : side === 'bottom' ? 14 : 0),
                    'text-anchor': 'middle',
                    'dominant-baseline': side === 'top' ? 'auto' : side === 'bottom' ? 'hanging' : 'central',
                    'font-size': 9,
                    'font-weight': 600,
                    'fill': palette.hotspotStroke,
                    'style': 'pointer-events:none;user-select:none;pointer-events:none'
                });
                if (side === 'left') {
                    label.setAttribute('x', p.x - 14);
                    label.setAttribute('text-anchor', 'end');
                }
                if (side === 'right') {
                    label.setAttribute('x', p.x + 14);
                    label.setAttribute('text-anchor', 'start');
                }
                label.textContent = assign.id;
                gHot.appendChild(label);
            }
        });
    });
    svg.appendChild(gHot);

    return {svg: svg.outerHTML, width: vw, height: vh};
};

/** 描述（语法说明）文案，供 .rfd 编辑区显示 */
export const RFD_LEGEND_ITEMS = [
    {code: '( 文字 )', desc: '椭圆 · 开始 / 结束'},
    {code: '[ 文字 ]', desc: '矩形 · 处理 / 语句'},
    {code: '< 文字 >', desc: '菱形 · 判断'},
    {code: '/ 文字 /', desc: '平行四边形 · 输入 / 输出'},
    {code: '~ 文字 ~', desc: '虚线框 · 注释'},
    {code: '(开始,v:1-2)', desc: '命名为 1，并连接到 2'},
    {code: '(开始,v:1-2-3-4)', desc: '命名为 1，同时连接 2、3、4…'},
    {code: '{  }  v  ^', desc: '左 / 右 / 下 / 上，: 后为 ID，- 后为目标 ID'},
    {code: '---', desc: '流程分隔（三个减号或空行）'},
    {code: '相同 ID', desc: '自动连接；反斜杠转义 \\, \\: \\-'}
];

export const isRfdFileName = name => /\.rfd$/i.test(String(name || ''));

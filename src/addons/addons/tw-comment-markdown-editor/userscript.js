/**
 * 注释增强：
 *  1. Markdown 渲染（预览 / 编辑切换）。编辑态用的是 contenteditable 混合编辑器：
 *     文字是 Markdown 原文，```blocks 围栏直接画成积木，不会让用户面对一段 XML。
 *  2. ```blocks 围栏：注释里内嵌积木片段
 *     - 把工作区的积木拖到注释上 -> 复制一份进注释（原积木回到原位）
 *     - 把注释里的片段拖到工作区 -> 变成真正可用的积木
 *     - 每段片段右上角 ✕ 删除
 *
 * 注释正文始终是纯 Markdown 文本，积木以 XML 文本存在围栏里，
 * 因此不需要修改 sb3 的 comment 结构，也不会引入 HTML 注入风险。
 */

const FENCE_OPEN = '```blocks';
const FENCE_CLOSE = '```';
const SNIPPET_REGEX = /```blocks[ \t]*\r?\n([\s\S]*?)\r?\n?```/g;
const DRAG_THRESHOLD = 5;

export default async function ({addon, console, msg}) {
    const Blockly = await addon.tab.traps.getBlockly();

    /** comment 对象 -> entry */
    const entries = new Map();

    /* ------------------------------------------------------------------ */
    /* 基础工具                                                             */
    /* ------------------------------------------------------------------ */

    const getMainWorkspace = () => {
        try {
            return addon.tab.traps.getWorkspace() || Blockly.getMainWorkspace();
        } catch (err) {
            return Blockly.getMainWorkspace ? Blockly.getMainWorkspace() : null;
        }
    };

    const getClientXY = e => {
        if (typeof e.clientX === 'number') return {x: e.clientX, y: e.clientY};
        const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
        return touch ? {x: touch.clientX, y: touch.clientY} : null;
    };

    /** 屏幕坐标 -> 工作区坐标 */
    const screenToWorkspace = (ws, clientX, clientY) => {
        const svg = ws.getParentSvg();
        if (!svg || typeof svg.createSVGPoint !== 'function') return {x: 0, y: 0};
        const target = ws.getCanvas() || svg;
        const matrix = target.getScreenCTM && target.getScreenCTM();
        if (!matrix) return {x: 0, y: 0};
        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        const local = point.matrixTransform(matrix.inverse());
        return {x: local.x, y: local.y};
    };

    const isOverWorkspace = (ws, clientX, clientY) => {
        const svg = ws && ws.getParentSvg && ws.getParentSvg();
        if (!svg) return false;
        const rect = svg.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right &&
            clientY >= rect.top && clientY <= rect.bottom;
    };

    /* ------------------------------------------------------------------ */
    /* 围栏文本处理                                                         */
    /* ------------------------------------------------------------------ */

    const splitParts = text => {
        const source = typeof text === 'string' ? text : '';
        const parts = [];
        let lastIndex = 0;
        let match;
        SNIPPET_REGEX.lastIndex = 0;
        while ((match = SNIPPET_REGEX.exec(source)) !== null) {
            if (match.index > lastIndex) {
                parts.push({type: 'text', content: source.slice(lastIndex, match.index)});
            }
            parts.push({type: 'blocks', content: match[1]});
            lastIndex = SNIPPET_REGEX.lastIndex;
        }
        if (lastIndex < source.length) {
            parts.push({type: 'text', content: source.slice(lastIndex)});
        }
        return parts;
    };

    const partsToText = parts => parts.map(part => (
        part.type === 'blocks' ?
            `${FENCE_OPEN}\n${String(part.content).trim()}\n${FENCE_CLOSE}\n` :
            part.content
    )).join('');

    const countSnippets = text => splitParts(text).filter(part => part.type === 'blocks').length;

    const setCommentText = (comment, text) => {
        comment.setText(text);
        const entry = entries.get(comment);
        if (!entry) return;
        refresh(entry);
        // 编辑态下编辑器不跟着 preview 走，得单独重建（例如拖进来一段积木时）
        if (entry.editing) buildEditor(entry);
    };

    /** index: 第几个片段，-1 表示追加到末尾 */
    const insertSnippet = (comment, xml, index) => {
        const parts = splitParts(comment.getText());
        const next = [];
        let seen = -1;
        let replaced = false;
        for (const part of parts) {
            if (part.type === 'blocks') {
                seen += 1;
                if (seen === index) {
                    next.push({type: 'blocks', content: xml});
                    replaced = true;
                    continue;
                }
            }
            next.push(part);
        }
        if (!replaced) {
            const tail = next[next.length - 1];
            if (tail && tail.type === 'text' && !/\n$/.test(tail.content)) {
                tail.content += '\n';
                if (tail.content.trim() && !/\n\n$/.test(tail.content)) tail.content += '\n';
            }
            next.push({type: 'blocks', content: xml});
        }
        setCommentText(comment, partsToText(next));
    };

    const removeSnippet = (comment, index) => {
        const parts = splitParts(comment.getText());
        const next = [];
        let seen = -1;
        for (const part of parts) {
            if (part.type === 'blocks') {
                seen += 1;
                if (seen === index) continue;
            }
            next.push(part);
        }
        setCommentText(comment, partsToText(next));
    };

    /* ------------------------------------------------------------------ */
    /* 积木片段 <-> SVG                                                    */
    /* ------------------------------------------------------------------ */

    /** 渲染片段时临时积木要放的坐标：离用户内容足够远，免得互相挤 */
    const FAR_AWAY = 200000;

    /**
     * 把围栏里的积木 XML 解析成可直接喂给 domToWorkspace 的 DOM。
     * 顶层 block 的 x/y 由这里指定（blockToDom 不写坐标）。
     */
    const snippetToDom = (xml, x, y) => {
        const dom = Blockly.Xml.textToDom(`<xml xmlns="http://www.w3.org/1999/xhtml">${xml}</xml>`);
        const children = dom.childNodes || [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1 && child.nodeName.toLowerCase() === 'block') {
                child.setAttribute('x', String(Math.round(x)));
                child.setAttribute('y', String(Math.round(y)));
            }
        }
        return dom;
    };

    /** 按 id 取新建的积木：domToWorkspace 返回的是 id 列表，不是积木对象 */
    const blockFromIds = (ids, workspace) => {
        if (!ids || !ids.length || !workspace) return null;
        return workspace.getBlockById ? workspace.getBlockById(ids[0]) : null;
    };

    const snippetSvgCache = new Map();
    const SNIPPET_SVG_CACHE_LIMIT = 60;

    /**
     * 片段异步重试队列：当 domToWorkspace 因为 opcode 尚未注册等原因失败时，
     * 下一个 tick 再试一次。最多重试 5 次（200ms × 5 = 1s），opcode 肯定加载完了。
     */
    const retryQueue = [];
    let retryScheduled = false;
    const scheduleRetry = (xml, entry) => {
        if (!entry || !entries.has(entry.comment)) return;
        if (retryQueue.some(item => item.entry === entry && item.xml === xml)) return;
        retryQueue.push({xml, entry, attempts: 0});
        if (!retryScheduled) {
            retryScheduled = true;
            window.setTimeout(flushRetryQueue, 150);
        }
    };
    const flushRetryQueue = () => {
        retryScheduled = false;
        const remaining = [];
        for (const item of retryQueue) {
            const {entry, xml, attempts} = item;
            if (!entries.has(entry.comment)) continue;
            snippetSvgCache.delete(xml);
            const newSvg = renderSnippetSvg(xml);
            if (newSvg) {
                // 渲染成功 → 重建 preview，把占位换成真 SVG
                refresh(entry);
            } else if (attempts + 1 < 5) {
                remaining.push({...item, attempts: attempts + 1});
            }
        }
        retryQueue.length = 0;
        retryQueue.push(...remaining);
        if (retryQueue.length) {
            retryScheduled = true;
            window.setTimeout(flushRetryQueue, 300);
        }
    };

    /**
     * 渲染片段：在主工作区临时建一块，克隆出 SVG 后立刻销毁。
     * 和原来一样简单，但加了多顶层 id 遍历 + 失败时交给重试队列兜底。
     */
    const renderSnippetSvg = xml => {
        const cached = snippetSvgCache.get(xml);
        if (cached) return cached.cloneNode(true);

        const ws = getMainWorkspace();
        if (!ws || !Blockly.Xml) return null;

        let svg = null;
        let firstBlock = null;
        const eventsWereEnabled = Blockly.Events.isEnabled();
        if (eventsWereEnabled) Blockly.Events.disable();
        try {
            const ids = Blockly.Xml.domToWorkspace(snippetToDom(xml, FAR_AWAY, FAR_AWAY), ws);
            if (ids && ids.length) {
                for (const id of ids) {
                    const b = ws.getBlockById ? ws.getBlockById(id) : null;
                    if (!b) continue;
                    if (!firstBlock) firstBlock = b;
                    const root = b.getSvgRoot ? b.getSvgRoot() : null;
                    if (!root) continue;
                    let bbox = null;
                    try {
                        bbox = root.getBBox();
                    } catch (_e) { bbox = null; }
                    if (!bbox || !bbox.width || !bbox.height) continue;
                    const clone = root.cloneNode(true);
                    clone.removeAttribute('transform');
                    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('width', Math.round(Math.max(bbox.width + 8, 8)));
                    svg.setAttribute('height', Math.round(Math.max(bbox.height + 8, 8)));
                    svg.setAttribute('viewBox', `${bbox.x - 4} ${bbox.y - 4} ${Math.max(bbox.width + 8, 8)} ${Math.max(bbox.height + 8, 8)}`);
                    svg.classList.add('rw-cb-snippet-svg');
                    svg.appendChild(clone);
                    break;
                }
            }
        } catch (err) {
            // opcode 还没注册、XML 损坏等 → 让调用方走重试
            console.warn('[comment-blocks] 片段渲染失败', err);
        } finally {
            if (firstBlock && typeof firstBlock.dispose === 'function') {
                try {
                    // 这条链上可能还有子 block，dispose 会递归清理
                    firstBlock.dispose(false);
                } catch (err) {
                    console.warn('[comment-blocks] 临时积木清理失败', err);
                }
            }
            if (Blockly.Events && eventsWereEnabled) Blockly.Events.enable();
        }

        if (!svg) return null;
        if (snippetSvgCache.size >= SNIPPET_SVG_CACHE_LIMIT) snippetSvgCache.clear();
        snippetSvgCache.set(xml, svg);
        return svg.cloneNode(true);
    };

    const blockToXml = block => {
        try {
            const dom = Blockly.Xml.blockToDom(block, true);
            return Blockly.Xml.domToText(dom);
        } catch (err) {
            console.warn('[comment-blocks] 积木序列化失败', err);
            return null;
        }
    };

    /** 把片段放到工作区上，返回新建的真积木 */
    const dropSnippetToWorkspace = (ws, xml, point) => {
        let created = null;
        Blockly.Events.setGroup(true);
        try {
            const ids = Blockly.Xml.domToWorkspace(snippetToDom(xml, point.x, point.y), ws);
            created = blockFromIds(ids, ws);
            if (created) {
                created.moveTo(point.x, point.y);
                if (created.scheduleSnapAndBump) created.scheduleSnapAndBump();
            }
        } catch (err) {
            console.warn('[comment-blocks] 拖出失败', err);
        } finally {
            Blockly.Events.setGroup(false);
        }
        return created;
    };

    /* ------------------------------------------------------------------ */
    /* Markdown 渲染（不使用 innerHTML）                                    */
    /* ------------------------------------------------------------------ */

    const renderInline = (target, text) => {
        const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g;
        let last = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match.index > last) target.appendChild(document.createTextNode(text.slice(last, match.index)));
            const token = match[0];
            let node = null;
            let content = token;
            if (token.startsWith('**')) {
                node = document.createElement('strong');
                content = token.slice(2, -2);
            } else if (token.startsWith('~~')) {
                node = document.createElement('del');
                content = token.slice(2, -2);
            } else if (token.startsWith('`')) {
                node = document.createElement('code');
                content = token.slice(1, -1);
            } else {
                node = document.createElement('em');
                content = token.slice(1, -1);
            }
            node.textContent = content;
            target.appendChild(node);
            last = pattern.lastIndex;
        }
        if (last < text.length) target.appendChild(document.createTextNode(text.slice(last)));
    };

    const renderMarkdown = (container, text) => {
        const lines = String(text).split(/\r?\n/);
        let list = null;
        let quote = null;
        let paragraph = null;

        const flush = () => {
            if (paragraph) {
                if (paragraph.textContent.trim() || paragraph.children.length) container.appendChild(paragraph);
                paragraph = null;
            }
            if (list) {
                if (list.children.length) container.appendChild(list);
                list = null;
            }
            if (quote) {
                if (quote.textContent.trim()) container.appendChild(quote);
                quote = null;
            }
        };

        for (const raw of lines) {
            const line = raw.replace(/\s+$/, '');
            if (!line.trim()) {
                flush();
                continue;
            }
            const heading = /^(#{1,3})\s+(.*)$/.exec(line);
            if (heading) {
                flush();
                const level = Math.min(heading[1].length, 3);
                const node = document.createElement(`h${level}`);
                renderInline(node, heading[2]);
                container.appendChild(node);
                continue;
            }
            const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
            if (bullet) {
                if (quote) flush();
                if (paragraph) {
                    container.appendChild(paragraph);
                    paragraph = null;
                }
                if (!list) {
                    list = document.createElement('ul');
                }
                const item = document.createElement('li');
                renderInline(item, bullet[1]);
                list.appendChild(item);
                continue;
            }
            const quoted = /^>\s?(.*)$/.exec(line);
            if (quoted) {
                if (paragraph) {
                    container.appendChild(paragraph);
                    paragraph = null;
                }
                if (!quote) quote = document.createElement('blockquote');
                else quote.appendChild(document.createElement('br'));
                renderInline(quote, quoted[1]);
                continue;
            }
            if (list || quote) flush();
            if (!paragraph) paragraph = document.createElement('p');
            else paragraph.appendChild(document.createElement('br'));
            renderInline(paragraph, line);
        }
        flush();
    };

    /* ------------------------------------------------------------------ */
    /* 注释 DOM 建立与渲染                                                  */
    /* ------------------------------------------------------------------ */

    const buildPreview = entry => {
        const preview = entry.preview;
        preview.textContent = '';
        let snippetIndex = -1;
        for (const part of splitParts(entry.comment.getText())) {
            if (part.type === 'blocks') {
                snippetIndex += 1;
                preview.appendChild(createSnippetEl(entry, part.content, snippetIndex));
            } else if (part.content.trim()) {
                renderMarkdown(preview, part.content);
            }
        }
        if (!preview.children.length && !preview.textContent.trim()) {
            const empty = document.createElement('p');
            empty.className = 'rw-cb-empty';
            // 走 addon.msg()：key 会走 addonMessages 命名空间，
            // 切语言后 api.js 监听 Redux statechanged 会重新加载翻译，
            // 我们再在下面的语言切换监听器里让所有已渲染的 preview 重建一次，
            // 这样空注释占位文字就能跟上当前语言。
            empty.textContent = msg('default-comment');
            preview.appendChild(empty);
        }
    };

    const createSnippetEl = (entry, xml, index) => {
        const wrap = document.createElement('div');
        wrap.className = 'rw-cb-snippet';
        wrap.dataset.snippetIndex = String(index);
        wrap.title = '拖到工作区即可变成真正的积木';

        const svg = renderSnippetSvg(xml);
        if (svg) wrap.appendChild(svg);
        else {
            const broken = document.createElement('span');
            broken.className = 'rw-cb-snippet-broken';
            broken.textContent = '（这段积木暂时未渲染）';
            wrap.appendChild(broken);
            // 第一次没渲染出来：下一个 tick 再试（opcode 可能晚注册 / 草稿 workspace 刚初始化）
            scheduleRetry(xml, entry);
        }

        const remove = document.createElement('button');
        remove.className = 'rw-cb-snippet-delete';
        remove.type = 'button';
        remove.textContent = '✕';
        remove.title = '删除这一段积木';
        remove.addEventListener('mousedown', e => e.stopPropagation());
        remove.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            removeSnippet(entry.comment, index);
        });
        wrap.appendChild(remove);

        wrap.addEventListener('mousedown', e => {
            if (e.button !== 0 || e.target === remove) return;
            e.preventDefault();
            e.stopPropagation();
            startSnippetDrag(entry, xml, e);
        });
        // 移动端触摸：touchstart 要 preventDefault 阻止浏览器的长按/点击菜单，
        // 同时告诉 scratch-blocks 的 gesture 系统这不是它要处理的拖拽。
        wrap.addEventListener('touchstart', e => {
            if (e.target === remove) return;
            if (e.touches && e.touches.length !== 1) return; // 只支持单指
            e.preventDefault();
            e.stopPropagation();
            startSnippetDrag(entry, xml, e);
        }, {passive: false});
        return wrap;
    };

    /* ------------------------------------------------------------------ */
    /* 编辑态：contenteditable 混合编辑器                                    */
    /* 文字部分是 Markdown 原文，围栏部分直接画成积木——                      */
    /* 否则用户编写时面对的是一大段 XML 文本。                                */
    /* ------------------------------------------------------------------ */

    const insertTextAtCaret = (entry, text) => {
        const editor = entry.editor;
        if (!editor) return;
        const selection = window.getSelection();
        let range = null;
        if (selection && selection.rangeCount && editor.contains(selection.anchorNode)) {
            // 光标万一卡在不可编辑的积木行里，先挪出来
            range = fixCaretRange(selection.getRangeAt(0));
        }
        if (!range) {
            // 光标不在这个编辑器里（或压根没有）就插到末尾，保证文字不会丢
            editor.focus();
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    /** 编辑态下把光标稳住：焦点一旦跑掉就抢回来，光标才不会停 */
    const ensureEditorFocused = entry => {
        if (!entry.editing || !entry.editor) return;
        const active = document.activeElement;
        if (active === entry.editor || (active && entry.editor.contains(active))) return;
        try {
            entry.editor.focus();
        } catch (err) {
            /* 抢不回来也不影响输入 */
        }
    };

    const focusEditorEnd = entry => {
        const editor = entry.editor;
        if (!editor) return;
        try {
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (err) {
            /* 聚焦失败不影响编辑 */
        }
    };

    /** 收集编辑器里所有可放光标的位置（<br> 与文本节点），按点击的 y 取最近的 */
    const placeCaretAtClosestAnchor = (editor, clientY) => {
        const candidates = [];
        const walk = node => {
            if (node.nodeType === 3) {
                if (node.nodeValue.length > 0) {
                    try {
                        const rect = node.getBoundingClientRect();
                        if (rect.height) {
                            candidates.push({y: rect.top + rect.height / 2, node, offset: Math.floor(node.nodeValue.length / 2)});
                        }
                    } catch (err) {
                        /* 忽略测量失败 */
                    }
                }
            } else if (node.nodeType === 1) {
                if (node.tagName === 'BR') {
                    try {
                        const rect = node.getBoundingClientRect();
                        candidates.push({y: rect.top + (rect.height ? rect.height / 2 : 0), node, offset: 0});
                    } catch (err) {
                        /* 忽略测量失败 */
                    }
                } else if (node.classList && node.classList.contains('rw-cb-snippet')) {
                    return; // 积木子树里没有可编辑位置
                } else {
                    for (const child of Array.from(node.childNodes)) walk(child);
                }
            }
        };
        walk(editor);
        if (!candidates.length) {
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            return range;
        }
        let best = candidates[0];
        if (typeof clientY === 'number') {
            for (const candidate of candidates) {
                if (Math.abs(candidate.y - clientY) < Math.abs(best.y - clientY)) best = candidate;
            }
        }
        const range = document.createRange();
        range.setStart(best.node, best.offset);
        range.collapse(true);
        return range;
    };

    /** 光标落在积木行（不可编辑）里时，挪到这一行的前面或后面 */
    const fixCaretRange = (range, clientX, clientY) => {
        const container = range.startContainer;
        let element = null;
        if (container.nodeType === 1) element = container;
        else if (container.parentElement) element = container.parentElement;
        const block = element && element.closest ? element.closest('[data-rw-snippet]') : null;
        if (block) {
            const rect = block.getBoundingClientRect();
            const goBefore = typeof clientY === 'number' && clientY < rect.top + (rect.height / 2);
            const fixed = document.createRange();
            if (goBefore) fixed.setStartBefore(block);
            else fixed.setStartAfter(block);
            fixed.collapse(true);
            return fixed;
        }

        // 已经在一个具体可编辑位置（文本节点或 <br>）上了，保持
        if (container.nodeType === 3 || (container.nodeType === 1 && container.tagName === 'BR')) {
            return range;
        }

        // 光标落在容器元素上（editor 本身、空盒）：浏览器不会在这种位置画光标，
        // 把它放到最近的可编辑锚点（积木上/下方、末尾的 <br> 等）
        const editor = element && element.closest ? element.closest('.rw-cb-editor') : null;
        if (editor) return placeCaretAtClosestAnchor(editor, clientY);
        return range;
    };

    /** 按点击坐标把光标放进编辑器；落点不可用时兜底到最近的可编辑锚点 */
    const placeCaretByPoint = (entry, clientX, clientY) => {
        const editor = entry.editor;
        if (!editor) return;
        editor.focus();
        let range = null;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(clientX, clientY);
        } else if (document.caretPositionFromPoint) {
            const position = document.caretPositionFromPoint(clientX, clientY);
            if (position) {
                range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
                range.collapse(true);
            }
        }
        const selection = window.getSelection();
        if (!selection) return;
        if (range && editor.contains(range.startContainer)) {
            selection.removeAllRanges();
            selection.addRange(fixCaretRange(range, clientX, clientY));
            return;
        }
        // 点击落点没法定位（死区/空隙/外缘）：放在最近锚点，保证光标常闪
        selection.removeAllRanges();
        selection.addRange(placeCaretAtClosestAnchor(editor, clientY));
    };

    /** 单击预览的位置在编辑器里定位到同一处（两边布局一致，坐标可以直传） */
    const focusEditorAt = (entry, clientX, clientY) => {
        placeCaretByPoint(entry, clientX, clientY);
    };

    /**
     * 片段在编辑器里单独占一行（块级），而不是塞进文本流里。
     * 内联的 contenteditable=false 元素会把光标卡在一侧、方向键直接跳过它；
     * 当成独立一行之后，前后各有一处可输入，上下键和鼠标都能自由切换。
     */
    const createEditorSnippetEl = (entry, xml, index) => {
        const wrap = document.createElement('div');
        wrap.className = 'rw-cb-snippet rw-cb-snippet-editing';
        wrap.contentEditable = 'false';
        wrap.dataset.rwSnippet = String(index);
        wrap.__rwXml = xml;
        wrap.title = '编辑态下不可拖动；切回预览即可拖到工作区';

        const svg = renderSnippetSvg(xml);
        if (svg) {
            wrap.appendChild(svg);
        } else {
            const broken = document.createElement('span');
            broken.className = 'rw-cb-snippet-broken';
            broken.textContent = '（这段积木暂时未渲染）';
            wrap.appendChild(broken);
            // 编辑态也调度 retry（flushRetryQueue 会 rebuild preview，再切回预览态时就能看到真 svg 了）
            scheduleRetry(xml, entry);
        }

        const remove = document.createElement('button');
        remove.className = 'rw-cb-snippet-delete';
        remove.type = 'button';
        remove.textContent = '✕';
        remove.title = '删除这一段积木';
        remove.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
        });
        remove.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            wrap.remove();
            ensureEditableAnchors(entry.editor);
            entry.editorDirty = true;
            syncEditorToComment(entry);
        });
        wrap.appendChild(remove);
        return wrap;
    };

    /**
     * 保证每个片段行的前面、后面各有一处能打字的地方，结尾也要能打字。
     * 缺了锚点，浏览器就没有可以放光标的位置——表现就是「只能在某一面打字」。
     */
    const isEditableAnchor = node => {
        if (!node) return false;
        if (node.nodeType === 3) return node.nodeValue.length > 0;
        if (node.nodeType === 1 && node.tagName === 'BR') return true;
        return false;
    };

    const ensureEditableAnchors = editor => {
        if (!editor) return;
        for (const row of Array.from(editor.querySelectorAll('[data-rw-snippet]'))) {
            if (!isEditableAnchor(row.previousSibling)) {
                editor.insertBefore(document.createElement('br'), row);
            }
            if (!isEditableAnchor(row.nextSibling)) {
                editor.insertBefore(document.createElement('br'), row.nextSibling);
            }
        }
        if (!isEditableAnchor(editor.lastChild)) {
            editor.appendChild(document.createElement('br'));
        }
    };

    /** 注释文本 -> 编辑器内容：文本保持原文，围栏换成画好的积木 */
    const buildEditor = entry => {
        const editor = entry.editor;
        if (!editor) return;
        editor.textContent = '';
        let snippetIndex = -1;
        let afterSnippet = false;
        for (const part of splitParts(entry.comment.getText())) {
            if (part.type === 'blocks') {
                snippetIndex += 1;
                editor.appendChild(createEditorSnippetEl(entry, part.content, snippetIndex));
                afterSnippet = true;
                continue;
            }
            let content = part.content;
            if (afterSnippet && content.startsWith('\n')) {
                // 这个换行是围栏自带的（序列化时会再补上），吞掉它才保证
                // 「编辑 -> 保存」不会一次多一个换行
                content = content.slice(1);
            }
            afterSnippet = false;
            if (content) editor.appendChild(document.createTextNode(content));
        }
        ensureEditableAnchors(editor);
    };

    /** 编辑器内容 -> 注释文本（与 partsToText 保持一致的围栏写法，往返稳定） */
    const serializeEditor = editor => {
        let text = '';
        const nodes = editor.childNodes || [];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                text += node.nodeValue || '';
            } else if (node.nodeType === 1) {
                if (node.dataset && node.dataset.rwSnippet !== undefined && node.__rwXml) {
                    text += `${FENCE_OPEN}\n${String(node.__rwXml).trim()}\n${FENCE_CLOSE}\n`;
                } else if (node.tagName === 'BR') {
                    // 这些 <br> 只是给光标留的位置（片段前后、末尾），不算内容
                    continue;
                } else {
                    // 浏览器自己插的节点（比如 Enter 生成的 div）
                    text += `${node.textContent || ''}\n`;
                }
            }
        }
        return text;
    };

    const syncEditorToComment = entry => {
        if (!entry.editor || !entry.editorDirty) return;
        entry.editorDirty = false;
        const text = serializeEditor(entry.editor);
        if (entry.textarea.value !== text) entry.textarea.value = text;
        // setText 内部会判重，没有变化不会重复触发事件
        entry.comment.setText(text);
    };

    const scheduleSync = entry => {
        if (entry.syncTimer) window.clearTimeout(entry.syncTimer);
        entry.syncTimer = window.setTimeout(() => {
            entry.syncTimer = null;
            syncEditorToComment(entry);
        }, 400);
    };

    const autoGrow = entry => {
        const comment = entry.comment;
        if (!comment || typeof comment.setSize !== 'function') return;
        let size = null;
        try {
            size = comment.getHeightWidth();
        } catch (err) {
            return;
        }
        if (!size) return;
        const needed = entry.preview.scrollHeight + 32 + 24;
        if (needed > size.height + 8) {
            try {
                comment.setSize(size.width, Math.min(Math.max(needed, size.height), 1200));
            } catch (err) {
                /* 尺寸调整失败不影响使用 */
            }
        }
    };

    /**
     * 预览层是绝对定位的覆盖层，尺寸得自己给：textarea 一旦被隐藏，
     * body 里就没有占流的元素了，高度会塌成 0，内容只剩 padding 撑出的窄条。
     * 尺寸优先沿用内核给 textarea 算好的那份（完全一致），拿不到再用 foreignObject 推。
     */
    const syncPreviewSize = entry => {
        const preview = entry.preview;
        const textarea = entry.textarea;
        if (!preview) return;

        let width = null;
        let height = null;
        let margin = '12px';

        if (textarea.style.width && textarea.style.height) {
            // 内核量好的尺寸，最准
            width = textarea.style.width;
            height = textarea.style.height;
            margin = textarea.style.margin || margin;
        } else {
            const root = entry.root;
            const foWidth = root && root.getAttribute ? parseFloat(root.getAttribute('width')) : NaN;
            const foHeight = root && root.getAttribute ? parseFloat(root.getAttribute('height')) : NaN;
            if (foWidth && foHeight) {
                const inset = 24; // textarea 的 12px margin × 2
                width = `${Math.max(foWidth - inset, 40)}px`;
                height = `${Math.max(foHeight - inset, 40)}px`;
            } else {
                // 连 foreignObject 都还没量过：用注释自己的记录尺寸兜底
                let size = null;
                try {
                    size = entry.comment.getHeightWidth ? entry.comment.getHeightWidth() : null;
                } catch (err) {
                    size = null;
                }
                if (!size || !size.width || !size.height) return;
                width = `${Math.max(size.width - 26, 40)}px`; // 边框 2 + margin 24
                height = `${Math.max(size.height - 32 - 26, 40)}px`; // 再减顶栏 32
            }
        }

        for (const layer of [preview, entry.editor]) {
            if (!layer) continue;
            layer.style.width = width;
            layer.style.height = height;
            layer.style.margin = margin;
        }
    };

    const refresh = entry => {
        if (addon.self.disabled) return;
        syncPreviewSize(entry);
        buildPreview(entry);
        if (entry.editing) return;
        autoGrow(entry);
    };

    const setMode = (entry, editing, point) => {
        entry.editing = !!editing;
        // textarea 一直藏着：它只负责给内核量尺寸，真正编辑用的是 contenteditable
        entry.textarea.style.display = 'none';
        entry.preview.style.display = editing ? 'none' : '';
        if (entry.editor) entry.editor.style.display = editing ? '' : 'none';
        syncPreviewSize(entry);
        if (editing) {
            buildEditor(entry);
            if (point) focusEditorAt(entry, point.x, point.y);
            else focusEditorEnd(entry);
        } else {
            syncEditorToComment(entry);
            refresh(entry);
        }
    };

    /* ------------------------------------------------------------------ */
    /* 注释 DOM 挂载                                                       */
    /* ------------------------------------------------------------------ */

    const attachComment = root => {
        const comment = root.__rwComment;
        if (!comment || entries.has(comment)) return;
        const body = root.querySelector('body') || root.querySelector('.scratchCommentBody') ||
            root.firstElementChild;
        const textarea = root.querySelector('textarea');
        if (!body || !textarea) return;
        root.dataset.rwProcessed = 'true';

        const preview = document.createElement('div');
        preview.className = 'rw-cb-preview';
        body.appendChild(preview);

        // 编辑用的混合编辑器：文字是 Markdown 原文，围栏直接画成积木
        const editor = document.createElement('div');
        editor.className = 'rw-cb-editor';
        editor.contentEditable = 'true';
        editor.spellcheck = false;
        editor.style.display = 'none';
        body.appendChild(editor);

        const entry = {
            comment,
            root,
            body,
            textarea,
            preview,
            editor,
            editorDirty: false,
            syncTimer: null,
            editing: false
        };
        entries.set(comment, entry);

        // 立刻 buildPreview 让注释一挂上来就渲染（包括积木片段），
        // 再切到预览态 —— 不依赖用户手动点击或 scratch 的默认显示逻辑
        try {
            buildPreview(entry);
            setMode(entry, false);
        } catch (_e) {
            console.warn("[comment-blocks] attach 后预览初始化失败", _e);
        }

        preview.addEventListener('click', e => {
            if (addon.self.disabled) return;
            if (e.target.closest('.rw-cb-snippet')) return;
            setMode(entry, true, {x: e.clientX, y: e.clientY});
        });
        preview.addEventListener('dblclick', e => {
            e.stopPropagation();
        });

        editor.addEventListener('keydown', e => {
            // 编辑注释时 Delete / Backspace 只删文字，不删积木
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopPropagation();
                return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                // 自己插换行，别让浏览器生成 <div>，否则往返序列化会走样
                e.preventDefault();
                insertTextAtCaret(entry, '\n');
                entry.editorDirty = true;
                scheduleSync(entry);
            }
        }, true);

        // 编辑态里点哪儿都要把光标落到可见位置：不再依赖浏览器自动放置的
        // caret（点中死区/空隙时它常常干脆不放光标），而是按点击坐标重新算，
        // 这样光标才稳定出现。拖选文字时（有展开选区）保留选区，不抢光标。
        editor.addEventListener('mouseup', e => {
            if (addon.self.disabled) return;
            ensureEditorFocused(entry);
            const selection = window.getSelection();
            if (selection && selection.rangeCount && !selection.isCollapsed) return;
            placeCaretByPoint(entry, e.clientX, e.clientY);
        });

        editor.addEventListener('keyup', () => {
            if (addon.self.disabled) return;
            ensureEditorFocused(entry);
        });

        // 粘贴只取纯文本，避免把外部 HTML 带进来
        editor.addEventListener('paste', e => {
            if (!e.clipboardData) return;
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            if (text) insertTextAtCaret(entry, text);
            entry.editorDirty = true;
            scheduleSync(entry);
        });

        editor.addEventListener('input', () => {
            if (addon.self.disabled) return;
            entry.editorDirty = true;
            ensureEditorFocused(entry);
            scheduleSync(entry);
        });

        root.addEventListener('mouseleave', () => {
            if (addon.self.disabled) return;
            // 鼠标移开且焦点也丢了，退回预览态
            if (entry.editing && document.activeElement !== entry.editor) setMode(entry, false);
        });

        editor.addEventListener('blur', () => {
            window.setTimeout(() => {
                if (addon.self.disabled || !entry.editing) return;
                const active = document.activeElement;
                // 焦点还在编辑器里（比如落到了某段积木上）就继续编辑，光标不要停
                if (active && (active === entry.editor || entry.editor.contains(active))) return;
                if (active && entry.root.contains(active)) return;
                setMode(entry, false);
            }, 250);
        });

        setMode(entry, false);
    };

    /** 插件加载前就已经存在的注释：补上 DOM -> comment 的关联 */
    const linkExistingComments = () => {
        const ws = getMainWorkspace();
        if (!ws || typeof ws.getTopComments !== 'function') return;
        const comments = ws.getTopComments(false) || [];
        for (const comment of comments) {
            if (!comment || comment.__rwLinked) continue;
            // scratch-blocks 原生 API：所有 comment 都有 foreignObject_ 和 textarea_
            let root = null;
            if (comment.foreignObject_) {
                root = comment.foreignObject_;
            } else if (comment.textarea_ && comment.textarea_.parentElement && comment.textarea_.parentElement.parentElement) {
                root = comment.textarea_.parentElement.parentElement;
            }
            // 不再硬依赖 scratchCommentForeignObject 这个 class 名：
            // scratch-gui 可能会改它，scratch-blocks 原生也不加。
            // 只要有 foreignObject_ 或 textarea_ 就能确定是注释的 DOM。
            if (!root || root.nodeType !== 1 || root.tagName.toLowerCase() !== 'foreignObject') continue;
            root.__rwComment = comment;
            comment.__rwLinked = true;
        }
    };

    const processCommentElements = () => {
        if (addon.self.disabled) return;
        for (const entry of Array.from(entries.values())) {
            if (!entry.root.isConnected) entries.delete(entry.comment);
        }
        linkExistingComments();

        // 只在气泡画布里找注释。优先用 bubbleCanvas（性能好），找不到就扫 document。
        // 选择器兼容各种版本：scratch-gui 加的 scratchCommentForeignObject、
        // scratch-blocks 原生里的 bubble svg 容器、以及最稳妥的 foreignObject 兜底。
        const scope = bubbleCanvas || document;
        const selectors = [
            '.scratchCommentForeignObject:not([data-rw-processed])',
            'foreignObject.blocklyComment:not([data-rw-processed])',
            'foreignObject[data-blockly="comment"]:not([data-rw-processed])',
            'foreignObject:not([data-rw-processed]):has(> body textarea.blocklyCommentTextarea)',
            // 最终兜底：foreignObject 里面含 textarea 的就是注释（scratch-blocks 原生结构）
            'foreignObject:not([data-rw-processed]):has(> body > textarea)'
        ];
        let nodes = [];
        for (const sel of selectors) {
            try {
                nodes = Array.from(scope.querySelectorAll(sel));
                if (nodes.length) break;
            } catch (_e) { /* :has 等选择器可能不被旧浏览器支持，跳过 */ }
        }
        // 最最兜底：扫描所有 foreignObject，看里面有没有 textarea
        if (!nodes.length) {
            try {
                const allFO = scope.querySelectorAll('foreignObject:not([data-rw-processed])');
                nodes = Array.from(allFO).filter(fo => fo.querySelector('textarea'));
            } catch (_e) { /* ignore */ }
        }

        for (const node of nodes) {
            // 主动查一次：如果 __rwComment 还没挂上（installEditorPatches 或
            // linkExistingComments 可能因为时序错过了），就从内部 textarea_
            // 反查 comment 对象。
            if (!node.__rwComment) {
                // 方法 1：遍历主工作区的 comments，找 foreignObject_ === node 的
                const ws = getMainWorkspace();
                if (ws && typeof ws.getTopComments === 'function') {
                    const all = ws.getTopComments(false) || [];
                    for (const c of all) {
                        if (c && c.foreignObject_ === node) {
                            node.__rwComment = c;
                            c.__rwLinked = true;
                            break;
                        }
                    }
                }
            }
            if (!node.__rwComment) continue;
            attachComment(node);
        }
    };

    /* ------------------------------------------------------------------ */
    /* 拖出：注释片段 -> 工作区真积木                                        */
    /* ------------------------------------------------------------------ */

    const startSnippetDrag = (entry, xml, e) => {
        const ws = getMainWorkspace();
        if (!ws) return;
        const start = getClientXY(e);
        if (!start) return;
        let ghost = null;
        let moved = false;
        let touchActive = false; // 触摸事件里要阻止页面滚动

        const isTouch = typeof e.type === 'string' && e.type.startsWith('touch');

        const onMove = event => {
            if (isTouch) event.preventDefault(); // 阻止触摸拖拽时页面滚动/缩放
            const point = getClientXY(event);
            if (!point) return;
            if (!moved && Math.abs(point.x - start.x) < DRAG_THRESHOLD &&
                Math.abs(point.y - start.y) < DRAG_THRESHOLD) return;
            if (!moved) {
                moved = true;
                ghost = document.createElement('div');
                ghost.className = 'rw-cb-drag-ghost';
                const svg = renderSnippetSvg(xml);
                if (svg) ghost.appendChild(svg);
                // 注释里的积木画在工作区 SVG 里，会跟着工作区缩放；浮层挂在 body 上
                // 用的是屏幕像素，不跟着缩就会显得比注释里大一圈。
                const scale = ws.scale || 1;
                ghost.style.transform = `scale(${scale})`;
                ghost.style.transformOrigin = 'top left';
                document.body.appendChild(ghost);
            }
            ghost.style.left = `${point.x + 10}px`;
            ghost.style.top = `${point.y + 10}px`;
        };

        const onUp = event => {
            window.removeEventListener('mousemove', onMove, true);
            window.removeEventListener('mouseup', onUp, true);
            window.removeEventListener('touchmove', onMove, true);
            window.removeEventListener('touchend', onUp, true);
            window.removeEventListener('touchcancel', onUp, true);
            touchActive = false;
            if (ghost) ghost.remove();
            ghost = null;
            if (!moved) return;
            const point = getClientXY(event);
            if (!point || !isOverWorkspace(ws, point.x, point.y)) return;
            // 落在其它注释上则忽略（避免误落）
            if (findCommentAt(point.x, point.y)) return;
            dropSnippetToWorkspace(ws, xml, screenToWorkspace(ws, point.x, point.y));
        };

        window.addEventListener('mousemove', onMove, true);
        window.addEventListener('mouseup', onUp, true);
        // 触摸也要挂；onMove 里会 preventDefault 阻止滚动
        if (isTouch) {
            touchActive = true;
            window.addEventListener('touchmove', onMove, {capture: true, passive: false});
            window.addEventListener('touchend', onUp, true);
            window.addEventListener('touchcancel', onUp, true);
        }
    };

    /* ------------------------------------------------------------------ */
    /* 拖入：工作区积木 -> 注释                                             */
    /* ------------------------------------------------------------------ */

    const findCommentAt = (clientX, clientY) => {
        const ws = getMainWorkspace();
        if (!ws || typeof ws.getTopComments !== 'function') return null;
        const point = screenToWorkspace(ws, clientX, clientY);
        const comments = ws.getTopComments(false) || [];
        for (const comment of comments) {
            if (!comment) continue;
            try {
                if (typeof comment.isMinimized === 'function' && comment.isMinimized()) continue;
            } catch (err) {
                continue;
            }
            let rect = null;
            try {
                rect = comment.getBoundingRectangle();
            } catch (err) {
                continue;
            }
            if (!rect || !rect.topLeft || !rect.bottomRight) continue;
            if (point.x < rect.topLeft.x || point.x > rect.bottomRight.x) continue;
            if (point.y < rect.topLeft.y || point.y > rect.bottomRight.y) continue;
            return {comment, index: snippetIndexAt(comment, clientX, clientY)};
        }
        return null;
    };

    const snippetIndexAt = (comment, clientX, clientY) => {
        const entry = entries.get(comment);
        if (!entry) return -1;
        const nodes = entry.preview.querySelectorAll('.rw-cb-snippet');
        for (const node of nodes) {
            const rect = node.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom) {
                return Number(node.dataset.snippetIndex);
            }
        }
        return -1;
    };

    const restoreDraggedBlock = (block, startXY, restore) => {
        try {
            if (restore && restore.out && block.outputConnection) {
                restore.out.connect(block.outputConnection);
                return;
            }
            if (restore && restore.prev && block.previousConnection) {
                restore.prev.connect(block.previousConnection);
                return;
            }
            if (startXY) block.moveTo(startXY.x, startXY.y);
        } catch (err) {
            /* 还原失败时保持现状即可 */
        }
    };

    const installDragPatches = () => {
        const Dragger = Blockly.BlockDragger;
        if (!Dragger || Dragger.prototype.__rwPatched) return;
        Dragger.prototype.__rwPatched = true;

        // 从积木栏拖拽时内核会新建一个副本，在这里给副本打标记，
        // 松手时才知道这块是"刚从积木栏拿出来的新块"，可以放心收进注释。
        const Gesture = Blockly.Gesture;
        if (Gesture && typeof Gesture.prototype.updateIsDraggingFromFlyout_ === 'function' &&
            !Gesture.prototype.__rwFlyoutPatched) {
            Gesture.prototype.__rwFlyoutPatched = true;
            const originalUpdateFromFlyout = Gesture.prototype.updateIsDraggingFromFlyout_;
            Gesture.prototype.updateIsDraggingFromFlyout_ = function () {
                const result = originalUpdateFromFlyout.call(this);
                if (result && this.targetBlock_) {
                    this.targetBlock_.__rwFromFlyout = true;
                }
                return result;
            };
        }

        const originalStart = Dragger.prototype.startBlockDrag;
        Dragger.prototype.startBlockDrag = function (delta) {
            const block = this.draggingBlock_;
            try {
                this.__rwRestore = block ? {
                    prev: block.previousConnection ? block.previousConnection.targetConnection : null,
                    out: block.outputConnection ? block.outputConnection.targetConnection : null
                } : null;
            } catch (err) {
                this.__rwRestore = null;
            }
            return originalStart.call(this, delta);
        };

        const originalEnd = Dragger.prototype.endBlockDrag;
        Dragger.prototype.endBlockDrag = function (e, delta) {
            const block = this.draggingBlock_;
            const startXY = this.startXY_;
            const restore = this.__rwRestore;
            let hit = null;
            let xml = null;
            if (block && !this.wouldDeleteBlock_) {
                const point = getClientXY(e);
                if (point) {
                    hit = findCommentAt(point.x, point.y);
                    if (hit) xml = blockToXml(block);
                }
            }
            const result = originalEnd.call(this, e, delta);
            if (hit && xml) {
                // 只有「刚从积木栏拿出来的孤立方块」才收进注释（工作区不留）。
                // 其它一律保留原积木：一整条积木链、或者从脚本中间拖出来的，
                // 都只是在注释里存一份副本，原样留在工作区。
                const gesture = this.workspace_ ? this.workspace_.currentGesture_ : null;
                const fromFlyout = !!(block.__rwFromFlyout || (gesture && gesture.flyout_));
                const isLoose = !block.getParent() && !block.getNextBlock();
                if (fromFlyout && isLoose) {
                    try {
                        block.dispose(false);
                    } catch (err) {
                        console.warn('[comment-blocks] 收进注释时删除原积木失败', err);
                    }
                } else {
                    restoreDraggedBlock(block, startXY, restore);
                }
                insertSnippet(hit.comment, xml, hit.index);
            }
            return result;
        };
    };

    /* ------------------------------------------------------------------ */
    /* 原型补丁：DOM 关联 + 折叠标题                                        */
    /* ------------------------------------------------------------------ */

    const installEditorPatches = () => {
        const wrap = proto => {
            if (!proto || proto.__rwEditorPatched) return;
            proto.__rwEditorPatched = true;
            const original = proto.createEditor_;
            proto.createEditor_ = function () {
                const result = original.call(this);
                const target = (result && result.commentEditor) ? result.commentEditor : result;
                if (target) target.__rwComment = this;
                return result;
            };
        };
        if (Blockly.ScratchBlockComment) wrap(Blockly.ScratchBlockComment.prototype);
        if (Blockly.WorkspaceCommentSvg) wrap(Blockly.WorkspaceCommentSvg.prototype);
        if (Blockly.WorkspaceComment) wrap(Blockly.WorkspaceComment.prototype);
    };

    /**
     * hook setVisible —— scratch-blocks 里 ScratchBlockComment.setVisible(true)
     * 是 DOM 最终被创建 + 挂到 bubble_ 树上的唯一入口。不管是：
     *   a) 运行时右键新建（setCommentText 里直接调）
     *   b) sb3 反序列化完统一 render（block.rendered 变 true 后间接调）
     *   c) 双击折叠标题再展开
     * 这条 hook 全能覆盖。DOM 一挂好，立刻让 processCommentElements 扫一遍，
     * 避免原来依赖"MutationObserver 扫 bubbleCanvas + 3 秒定时器"的时序误差。
     */
    const installVisiblePatches = () => {
        const wrapSetVisible = proto => {
            if (!proto || proto.__rwVisiblePatched) return;
            proto.__rwVisiblePatched = true;
            const original = proto.setVisible;
            proto.setVisible = function (visible) {
                const wasVisible = this.isVisible && this.isVisible();
                const result = original.call(this, visible);
                if (visible && !wasVisible) {
                    // DOM 刚挂好（setVisible(true) → createEditor_ → ScratchBubble 构造 → 挂树）
                    // 立刻让我们的 attach 流程扫一遍。用 rAF 让 DOM 先进入浏览器布局。
                    const root = this.foreignObject_ || (this.bubble_ && this.bubble_.foreignObject_);
                    if (root) {
                        // 万一之前 attach 过但 DOM 后来被 dispose 重建了：先清掉 processed 标记
                        if (root.dataset && root.dataset.rwProcessed) delete root.dataset.rwProcessed;
                        root.__rwComment = this;
                    }
                    window.requestAnimationFrame(() => {
                        processCommentElements();
                    });
                }
                return result;
            };
        };
        if (Blockly.ScratchBlockComment) wrapSetVisible(Blockly.ScratchBlockComment.prototype);
        if (Blockly.Comment) wrapSetVisible(Blockly.Comment.prototype); // 兜底
        if (Blockly.WorkspaceComment) wrapSetVisible(Blockly.WorkspaceComment.prototype);
    };

    const installLabelPatches = () => {
        const wrap = proto => {
            if (!proto || proto.__rwLabelPatched) return;
            proto.__rwLabelPatched = true;
            const original = proto.getLabelText;
            proto.getLabelText = function () {
                const label = original.call(this) || '';
                let count = 0;
                try {
                    count = countSnippets(this.getText ? this.getText() : '');
                } catch (err) {
                    count = 0;
                }
                return count > 0 ? `${label} ⟨${count} 段积木⟩` : label;
            };
        };
        if (Blockly.ScratchBlockComment) wrap(Blockly.ScratchBlockComment.prototype);
        if (Blockly.WorkspaceCommentSvg) wrap(Blockly.WorkspaceCommentSvg.prototype);
    };

    /** 注释被缩放时，把新尺寸同步给预览层 */
    const installResizePatches = () => {
        const wrap = (proto, method) => {
            if (!proto || typeof proto[method] !== 'function' || proto[`__rw_${method}`]) return;
            proto[`__rw_${method}`] = true;
            const original = proto[method];
            proto[method] = function () {
                const result = original.apply(this, arguments);
                const entry = entries.get(this);
                if (entry) syncPreviewSize(entry);
                return result;
            };
        };
        if (Blockly.ScratchBlockComment) wrap(Blockly.ScratchBlockComment.prototype, 'resizeBubble_');
        if (Blockly.WorkspaceCommentSvg) wrap(Blockly.WorkspaceCommentSvg.prototype, 'resizeComment_');
    };

    /* ------------------------------------------------------------------ */
    /* 启动与清理                                                          */
    /* ------------------------------------------------------------------ */

    installEditorPatches();
    installVisiblePatches();
    installLabelPatches();
    installResizePatches();
    installDragPatches();

    // 注释只画在气泡画布上，监听它就够了。监听整个 body 会在渲染几万块积木时
    // 被每个 SVG 节点的插入反复触发，那是实打实的加载期热点。
    const getBubbleCanvas = () => {
        try {
            const ws = getMainWorkspace();
            return ws && ws.getBubbleCanvas ? ws.getBubbleCanvas() : null;
        } catch (err) {
            return null;
        }
    };

    let bubbleCanvas = null;
    await new Promise(resolve => {
        const attempt = triesLeft => {
            bubbleCanvas = getBubbleCanvas();
            if (bubbleCanvas || triesLeft <= 0) {
                resolve();
                return;
            }
            window.setTimeout(() => attempt(triesLeft - 1), 300);
        };
        attempt(40);
    });

    /**
     * 收集所有 comment 对象：不管是工作区便签（WorkspaceComment）
     * 还是附着在积木上的气泡（ScratchBlockComment）。
     */
    const collectAllComments = () => {
        const all = new Set();
        const ws = getMainWorkspace();
        if (!ws) return all;
        try {
            if (typeof ws.getTopComments === 'function') {
                for (const c of (ws.getTopComments(false) || [])) if (c) all.add(c);
            }
            if (typeof ws.getTopBlocks === 'function') {
                for (const block of (ws.getTopBlocks(false) || [])) {
                    if (block.comment) all.add(block.comment);
                    let child = block.getNextBlock && block.getNextBlock();
                    while (child) {
                        if (child.comment) all.add(child.comment);
                        child = child.getNextBlock && child.getNextBlock();
                    }
                }
            }
        } catch (_e) { /* ignore */ }
        return all;
    };

    /**
     * 用户说的"直接检测注释里有没有积木标签" —— 这是核心扫描器：
     *   1. 遍历所有 comment 对象
     *   2. 直接从 comment 对象读取 text（不依赖 scratch-blocks DOM）
     *   3. 用 SNIPPET_REGEX 检测 ```blocks 围栏
     *   4. 如果检测到 → 立即确保 scratch DOM 挂出来 → 触发 attach + 渲染
     *
     * 这样绕开了 scratch-blocks 的反序列化时序 bug：
     * 无论 setVisible 有没有被调过、block.rendered 是不是 true、foreignObject_
     * 有没有挂上 DOM 树 —— 只要 comment.text 里有 ```blocks，我们就保证它能被渲染。
     */
    const scanCommentsAndEnsureRender = () => {
        const comments = collectAllComments();
        for (const c of comments) {
            let text = '';
            try {
                // getText() 在 textarea_ 没挂上时返回 this.text_，挂上后返回 textarea.value
                // 所以这条路径在反序列化早期也能拿到正确的字符串
                text = typeof c.getText === 'function' ? c.getText() : (c.text_ || '');
            } catch (_e) { text = c.text_ || ''; }

            const hasSnippets = SNIPPET_REGEX.test(text);
            SNIPPET_REGEX.lastIndex = 0;

            if (!hasSnippets) continue;

            // 1) 片段检测到了 → 先确保 scratch DOM 挂出来
            const needsVisible = !c.foreignObject_ || !c.foreignObject_.isConnected;
            if (needsVisible && typeof c.setVisible === 'function') {
                try {
                    const isVis = c.isVisible && c.isVisible();
                    if (!isVis) {
                        c.setVisible(true);
                    } else {
                        // visible 但 DOM 又没了：强制重挂
                        c.setVisible(false);
                        c.setVisible(true);
                    }
                } catch (_e) { /* ignore */ }
            }

            // 2) 如果 DOM 还没完全挂好（刚 setVisible 还没进下一帧），先跳过 attach，
            //    等下一个 tick 再来 —— DOM 一挂上我们的 processCommentElements 就会接住
            if (!c.foreignObject_ || !c.foreignObject_.isConnected) continue;

            const root = c.foreignObject_;
            // 3) attach 我们的预览层（如果还没 attach 过）
            if (!root.__rwComment) root.__rwComment = c;
            root.__rwComment = c;
            if (typeof root.dataset !== 'undefined' && root.dataset.rwProcessed !== 'true') {
                // 让 processCommentElements 扫到它
            }
            // 直接触发一次 attach 尝试 —— 即使刚 setVisible，body/textarea 应该也已经在
            const ws = getMainWorkspace();
            if (ws && !entries.has(c)) {
                // body + textarea 是 scratch-blocks 原生的结构，setVisible 之后肯定有了
                const body = root.querySelector('body') || root.querySelector('.scratchCommentBody');
                const textarea = root.querySelector('textarea');
                if (body && textarea) {
                    attachComment(root);
                }
            }

            // 4) 如果已经 attach 过了（entry 在 entries 里），强制 refresh 一次 ——
            //    可能之前 renderSnippetSvg 因为 opcode 没加载完失败了，现在重试
            const entry = entries.get(c);
            if (entry) {
                // 先清掉所有片段的缓存让它们强制重绘
                const matches = text.match(SNIPPET_REGEX);
                if (matches) {
                    for (const m of matches) {
                        const xmlMatch = /```blocks[ \t]*\r?\n([\s\S]*?)\r?\n?```/.exec(m);
                        if (xmlMatch) snippetSvgCache.delete(xmlMatch[1]);
                    }
                }
                refresh(entry);
            }
        }
    };

    const observer = new MutationObserver(() => {
        if (addon.self.disabled) return;
        window.setTimeout(() => {
            scanCommentsAndEnsureRender();
            processCommentElements();
        }, 40);
    });
    if (bubbleCanvas) {
        observer.observe(bubbleCanvas, {childList: true, subtree: true});
    }

    // 每 500ms 扫一次 comment.text —— 不管 scratch-blocks 的状态怎样，
    // 只要字符串里有 ```blocks，我们就保证它能被渲染
    const SCAN_INTERVAL = 500;
    const timer = window.setInterval(() => {
        scanCommentsAndEnsureRender();
        processCommentElements();
    }, SCAN_INTERVAL);
    window.setTimeout(() => {
        scanCommentsAndEnsureRender();
        processCommentElements();
    }, 300);

    const globalClick = event => {
        if (addon.self.disabled) return;
        for (const entry of entries.values()) {
            if (!entry.editing) continue;
            if (entry.root.contains(event.target)) continue;
            setMode(entry, false);
        }
    };
    document.addEventListener('mousedown', globalClick, true);

    // Ctrl/Cmd + M 切换编辑 / 预览
    const globalKeydown = event => {
        if (addon.self.disabled) return;
        if (!(event.ctrlKey || event.metaKey) || (event.key || '').toLowerCase() !== 'm') return;
        for (const entry of entries.values()) {
            if (entry.editing || entry.root.contains(document.activeElement)) {
                event.preventDefault();
                setMode(entry, !entry.editing);
                break;
            }
        }
    };
    document.addEventListener('keydown', globalKeydown, true);

    addon.self.addEventListener('disabled', () => {
        observer.disconnect();
        window.clearInterval(timer);
        document.removeEventListener('mousedown', globalClick, true);
        document.removeEventListener('keydown', globalKeydown, true);
        reduxListener.removeEventListener('statechanged', onLocaleChanged);
        // 清掉渲染相关的内部状态，免得下次 dynamic enable 又从脏状态起步
        retryQueue.length = 0;
        retryScheduled = false;
        snippetSvgCache.clear();
        for (const entry of entries.values()) {
            if (entry.syncTimer) window.clearTimeout(entry.syncTimer);
            entry.preview.remove();
            if (entry.editor) entry.editor.remove();
            entry.textarea.style.display = '';
        }
        entries.clear();
    });

    // 语言切换时：对所有空注释重建 preview → msg('default-comment') 会拿到新翻译
    let lastLocale = null;
    const reduxListener = addon.tab.redux;
    const onLocaleChanged = e => {
        const next = e.detail.next && e.detail.next.locales && e.detail.next.locales.locale;
        if (!next || next === lastLocale) return;
        lastLocale = next;
        for (const entry of entries.values()) {
            // refresh 会先 buildPreview，空注释的 placeholder 就用到新翻译了
            refresh(entry);
        }
    };
    reduxListener.addEventListener('statechanged', onLocaleChanged);

    addon.self.addEventListener('reenabled', () => {
        window.setTimeout(processCommentElements, 300);
    });
}

// @ts-check
/* eslint-disable */

/**
 * CN Code 注释编程插件
 * 当注释第一行为 #cn.code 时，每行文本实时搜索并插入最匹配的积木。
 * 弹窗复用 middle-click-popup 的渲染管线（renderMenuItem），确保积木预览正确显示。
 * 链式连接仅使用 Blockly 原生的 nextConnection.connect()，让 Blockly 自动堆叠。
 */

import { BlockTypeInfo } from '../middle-click-popup/BlockTypeInfo.js';
import { performSearch } from '../middle-click-popup/searchUtils.js';
import WorkspaceQuerier from '../middle-click-popup/WorkspaceQuerier.js';
import { renderMenuItem, calculateActualHeight } from '../middle-click-popup/renderingUtils.js';
import { handleBlockSelection } from '../middle-click-popup/selectionUtils.js';
import { isAsciiPinyin, buildPinyinIndex, expandPinyinQuery, buildInitialIndex, matchInitialQuery } from './pinyin-utils.js';

const TAG = '#cn.code';
const PREVIEW_LIMIT = 100;

export default async function ({ addon, msg }) {
    const Blockly = await addon.tab.traps.getBlockly();
    const vm = addon.tab.traps.vm;

    let blockTypes = null;
    const querier = new WorkspaceQuerier();
    let workspaceChangeListener = null;
    let pollTimer = null;
    /** @type {Map<string, string[]>} 拼音→汉字列表 */
    let pinyinIndex = null;

    /** @type {Map<string, object[]>} 拼音首字母缩写→积木类型列表 */
    let initialIndex = null;

    /** @type {Map<string, {
     *   lineBlocks: Map<number, any>,
     *   lineLastText: Map<number, string>,
     *   initialWsPos: {x: number, y: number},
     *   initialScreenPos: {x: number, y: number},
     *   commentSized: boolean
     * }>} */
    const cnCodeStates = new Map();

    // ============ 弹窗（直接克隆 middle-click-popup 结构）============
    // 注入序号标签样式
    const numBtnStyle = document.createElement('style');
    numBtnStyle.textContent = `
        .cn-code-num-label {
            fill: white;
            font-size: 12px;
            font-weight: bold;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            text-anchor: middle;
            dominant-baseline: central;
            pointer-events: all;
            cursor: pointer;
        }
        .cn-code-num-bg {
            fill: #ff6b35;
            stroke: #e55a2b;
            stroke-width: 1;
            pointer-events: all;
            cursor: pointer;
            rx: 4;
            ry: 4;
        }
        .cn-code-num-bg:hover {
            fill: #ff8c42;
        }
        .sa-mcp-preview-container {
            padding-left: 26px;
            box-sizing: border-box;
        }
    `;
    document.head.appendChild(numBtnStyle);

    const popupRoot = document.body.appendChild(document.createElement('div'));
    popupRoot.classList.add('sa-mcp-root');
    popupRoot.dir = addon.tab.direction;
    popupRoot.style.display = 'none';

    const popupContainer = popupRoot.appendChild(document.createElement('div'));
    popupContainer.classList.add('sa-mcp-container');

    const popupInputContainer = popupContainer.appendChild(document.createElement('div'));
    popupInputContainer.classList.add(addon.tab.scratchClass('input_input-form'));
    popupInputContainer.classList.add('sa-mcp-input-wrapper');

    const popupInputSuggestion = popupInputContainer.appendChild(document.createElement('input'));
    popupInputSuggestion.classList.add('sa-mcp-input-suggestion');

    const popupInput = popupInputContainer.appendChild(document.createElement('input'));
    popupInput.classList.add('sa-mcp-input');
    popupInput.setAttribute('autocomplete', 'off');
    popupInput.readOnly = true;

    const popupResultBox = popupContainer.appendChild(document.createElement('div'));
    popupResultBox.classList.add('sa-mcp-result-box');
    popupResultBox.style.display = 'none';

    const popupPreviewContainer = popupContainer.appendChild(document.createElement('div'));
    popupPreviewContainer.classList.add('sa-mcp-preview-container');

    const popupStatusBar = popupContainer.appendChild(document.createElement('div'));
    popupStatusBar.classList.add('sa-mcp-status-bar');
    popupStatusBar.style.display = 'none';

    const popupPreviewScrollbarSVG = popupContainer.appendChild(
        document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    );
    popupPreviewScrollbarSVG.classList.add(
        'sa-mcp-preview-scrollbar',
        'blocklyScrollbarVertical',
        'blocklyMainWorkspaceScrollbar'
    );
    popupPreviewScrollbarSVG.style.display = 'none';

    const popupPreviewScrollbarBackground = popupPreviewScrollbarSVG.appendChild(
        document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    );
    popupPreviewScrollbarBackground.setAttribute('width', '11');
    popupPreviewScrollbarBackground.classList.add('blocklyScrollbarBackground');

    const popupPreviewScrollbarHandle = popupPreviewScrollbarSVG.appendChild(
        document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    );
    popupPreviewScrollbarHandle.setAttribute('rx', '3');
    popupPreviewScrollbarHandle.setAttribute('ry', '3');
    popupPreviewScrollbarHandle.setAttribute('width', '6');
    popupPreviewScrollbarHandle.setAttribute('x', '2.5');
    popupPreviewScrollbarHandle.classList.add('blocklyScrollbarHandle');

    const popupPreviewBlocks = popupPreviewContainer.appendChild(
        document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    );
    popupPreviewBlocks.classList.add('sa-mcp-preview-blocks');
    popupPreviewBlocks.setAttribute('overflow', 'visible');

    // 标题栏（用于拖动弹窗）
    const popupTitleBar = document.createElement('div');
    popupTitleBar.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'padding:6px 12px',
        'background:rgba(0,0,0,0.04)',
        'border-bottom:1px solid rgba(0,0,0,0.06)',
        'cursor:grab',
        'user-select:none',
        'font-size:12px',
        'color:#555',
        'font-weight:bold'
    ].join(';');
    popupTitleBar.textContent = 'CN Code 搜索';
    popupContainer.insertBefore(popupTitleBar, popupInputContainer);

    // 拖动状态
    let dragState = null;
    let savedPopupX = null;  // 用户拖到的 X 位置（持久化）

    popupTitleBar.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragState = {
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startLeft: popupRoot.offsetLeft,
            startTop: popupRoot.offsetTop,
            isDragging: false
        };
        popupTitleBar.style.cursor = 'grabbing';

        const onMouseMove = (ev) => {
            if (!dragState) return;
            const dx = ev.clientX - dragState.startMouseX;
            const dy = ev.clientY - dragState.startMouseY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                dragState.isDragging = true;
                const newLeft = dragState.startLeft + dx;
                const newTop = dragState.startTop + dy;
                popupRoot.style.left = newLeft + 'px';
                popupRoot.style.top = newTop + 'px';
                savedPopupX = newLeft;
            }
        };

        const onMouseUp = () => {
            popupTitleBar.style.cursor = 'grab';
            dragState = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    let previewScale = 0.56;
    let previewWidth = 480;
    let previewHeight = 0;
    let previewMaxHeight = 300;

    /** @type {Array<{block:any, svgBlock:SVGGElement, svgBackground:SVGRectElement, renderedBlock:any, height:number}>} */
    let queryPreviews = [];

    function showPopupAt(screenX, screenY) {
        previewScale = window.innerWidth * 0.00005 + 0.5;
        if (isNaN(previewScale) || !isFinite(previewScale) || previewScale <= 0) {
            previewScale = 0.56;
        }
        previewWidth = Math.min(window.innerWidth * 0.5, 500);
        previewMaxHeight = window.innerHeight * 0.4;

        popupContainer.style.width = `${previewWidth}px`;
        popupRoot.style.display = '';

        requestAnimationFrame(() => {
            const rect = popupRoot.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width - 10;
            const maxY = window.innerHeight - rect.height - 10;

            // X 轴：优先使用用户上次拖动保存的位置
            let targetX;
            if (savedPopupX !== null) {
                targetX = savedPopupX;
            } else {
                targetX = screenX;
            }
            targetX = Math.min(targetX, Math.max(10, maxX));

            // Y 轴：根据弹窗高度自动调整（注释位置基础上微调）
            let targetY = Math.min(screenY, Math.max(10, maxY));

            popupRoot.style.left = targetX + 'px';
            popupRoot.style.top = targetY + 'px';
        });
    }

    function hidePopup() {
        popupRoot.style.display = 'none';
    }

    function renderPopup(lineText, searchResult) {
        popupInput.value = lineText;
        popupStatusBar.style.display = '';

        if (!lineText || !lineText.trim()) {
            popupStatusBar.textContent = '等待输入积木名称...';
            while (popupPreviewBlocks.firstChild) popupPreviewBlocks.removeChild(popupPreviewBlocks.lastChild);
            queryPreviews = [];
            return;
        }

        const blockList = searchResult ? searchResult.blockList : [];

        // 清除旧预览
        while (popupPreviewBlocks.firstChild) popupPreviewBlocks.removeChild(popupPreviewBlocks.lastChild);
        queryPreviews = [];

        let y = 0;
        let visibleIndex = 0;

        for (let resultIdx = 0; resultIdx < blockList.length; resultIdx++) {
            const result = blockList[resultIdx];
            if (result.isHeader || result.isSprite || result.isCostume || result.isCustomBlock) continue;
            if (!result.block) continue;

            visibleIndex++;

            const svgBackground = popupPreviewBlocks.appendChild(
                document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            );
            const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            popupPreviewBlocks.appendChild(svgGroup);

            const { renderedBlock, height } = renderMenuItem(
                result, svgGroup, previewWidth, previewScale, Blockly, vm
            );

            if (!renderedBlock) continue;

            const actualHeight = calculateActualHeight(result, renderedBlock, height);

            svgBackground.classList.add('sa-mcp-preview-block-bg');
            svgGroup.classList.add('sa-mcp-preview-block');

            const BLOCK_GAP = 4;
            const topOffset = 4;
            // 第一块积木额外下移半个积木高度
            const firstBlockExtra = (y === 0) ? actualHeight * 0.5 : 0;
            const groupTranslateY = (y + topOffset + firstBlockExtra) * previewScale;
            const screenY = (y + topOffset + firstBlockExtra) * previewScale;

            svgBackground.setAttribute('transform', `translate(0, ${screenY})`);
            svgBackground.setAttribute('height', `${actualHeight * previewScale}px`);
            svgGroup.setAttribute('transform', `translate(0, ${groupTranslateY}) scale(${previewScale})`);

            // 在 SVG 内绘制序号标签（圆形背景 + 数字）
            const labelY = screenY + (actualHeight * previewScale) / 2;
            const labelX = -16;
            const numBg = popupPreviewBlocks.appendChild(
                document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            );
            numBg.setAttribute('x', labelX - 9);
            numBg.setAttribute('y', labelY - 9);
            numBg.setAttribute('width', '18');
            numBg.setAttribute('height', '18');
            numBg.setAttribute('rx', '4');
            numBg.setAttribute('ry', '4');
            numBg.classList.add('cn-code-num-bg');

            const numText = popupPreviewBlocks.appendChild(
                document.createElementNS('http://www.w3.org/2000/svg', 'text')
            );
            numText.setAttribute('x', labelX);
            numText.setAttribute('y', labelY);
            numText.classList.add('cn-code-num-label');
            numText.textContent = visibleIndex;

            queryPreviews.push({
                block: result.block,
                svgBlock: svgGroup,
                svgBackground,
                renderedBlock,
                height: actualHeight,
                index: visibleIndex
            });

            // 点击积木或序号可直接插入
            svgBackground.style.cursor = 'pointer';
            svgGroup.style.cursor = 'pointer';
            const insertHandler = (ev) => {
                ev.stopPropagation();
                insertBlockByIndex(visibleIndex);
            };
            svgBackground.addEventListener('click', insertHandler);
            svgGroup.addEventListener('click', insertHandler);
            numBg.addEventListener('click', insertHandler);
            numText.addEventListener('click', insertHandler);

            y += actualHeight + BLOCK_GAP + firstBlockExtra;
        }

        const totalHeight = (y + topOffset + 8) * previewScale;
        previewHeight = Math.min(Math.max(totalHeight, 40), previewMaxHeight);

        popupPreviewBlocks.setAttribute('height', `${totalHeight}px`);
        popupPreviewContainer.style.height = `${previewHeight}px`;
        popupPreviewScrollbarSVG.style.height = `${previewHeight}px`;
        popupPreviewScrollbarBackground.setAttribute('height', `${previewHeight}`);
        popupStatusBar.textContent = `${queryPreviews.length} 个结果`;

        // 高亮第一个
        if (queryPreviews.length > 0) {
            queryPreviews[0].svgBackground.classList.add('sa-mcp-preview-block-bg-selection');
            queryPreviews[0].svgBlock.classList.add('sa-mcp-preview-block-selection');
        }
    }

    // ============ 核心逻辑 ============

    function ensureBlockTypesLoaded(workspace) {
        if (blockTypes) return true;
        try {
            const toolbox = workspace.getToolbox();
            if (!toolbox || !toolbox.flyout_ || !toolbox.flyout_.getWorkspace()) return false;
            blockTypes = BlockTypeInfo.getBlocks(Blockly, vm, workspace, msg);
            if (!blockTypes || blockTypes.length === 0) { blockTypes = []; return false; }
            querier.indexWorkspace([...blockTypes]);
            blockTypes.sort((a, b) => {
                const prio = (block) => ['operators', 'data'].indexOf(block.category.name) - (block.id.startsWith('data_') ? 1 : 0);
                return prio(b) - prio(a);
            });
            // 构建拼音索引（只包含积木中实际出现的汉字）
            pinyinIndex = buildPinyinIndex(blockTypes);
            // 构建拼音首字母缩写索引（如 "计算" → "js"）
            initialIndex = buildInitialIndex(blockTypes);
            return true;
        } catch (e) {
            return false;
        }
    }

    function doSearch(text) {
        if (!text || !text.trim()) return null;
        if (!blockTypes || blockTypes.length === 0) return null;

        const trimmed = text.trim();

        // 拼音搜索：检测是否为纯 ASCII 拼音输入
        if (isAsciiPinyin(trimmed) && pinyinIndex) {
            const expansions = expandPinyinQuery(trimmed, pinyinIndex);
            if (expansions.length > 0) {
                // 用拼音扩展的汉字查询，合并去重
                const seen = new Set();
                const allBlockList = [];

                for (const expansion of expansions) {
                    try {
                        const result = performSearch(expansion, querier, blockTypes, vm, PREVIEW_LIMIT);
                        if (result && result.blockList) {
                            for (const item of result.blockList) {
                                if (item.block) {
                                    const key = item.block.typeInfo ? item.block.typeInfo.id : item.block.type;
                                    if (!seen.has(key)) {
                                        seen.add(key);
                                        allBlockList.push(item);
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }

                if (allBlockList.length > 0) {
                    return { blockList: allBlockList.slice(0, PREVIEW_LIMIT), limited: false };
                }
            }

            // 拼音首字母匹配：如输入 "js" 匹配 "计算"
            if (initialIndex) {
                const initialMatches = matchInitialQuery(trimmed, initialIndex);
                if (initialMatches.length > 0) {
                    const allBlockList = initialMatches
                        .slice(0, PREVIEW_LIMIT)
                        .map(blockType => ({ block: blockType }));
                    return { blockList: allBlockList, limited: false };
                }
            }
        }

        // 正常搜索
        try {
            return performSearch(trimmed, querier, blockTypes, vm, PREVIEW_LIMIT);
        } catch (e) {
            return null;
        }
    }

    function insertBlockByIndex(index) {
        if (!queryPreviews[index - 1]) return;
        const preview = queryPreviews[index - 1];
        const blockType = preview.block;
        if (!blockType) return;

        // 获取积木的 type ID
        const blockTypeId = blockType.typeInfo ? blockType.typeInfo.id : blockType.type;

        const workspace = Blockly.getMainWorkspace();
        if (!workspace) return;

        // 找到当前活跃的 cn-code 注释
        const allComments = [];
        try {
            if (workspace.getTopComments) {
                const comments = workspace.getTopComments(false);
                if (Array.isArray(comments)) allComments.push(...comments);
            }
            for (const b of workspace.getAllBlocks(false)) {
                if (b.comment) allComments.push(b.comment);
            }
        } catch (e) {}

        for (const comment of allComments) {
            try {
                const text = comment.getText ? comment.getText() : (comment.text || '');
                if (!text || !text.startsWith(TAG)) continue;

                const state = cnCodeStates.get(comment.id);
                if (!state) continue;

                // 获取最后一行
                const lines = text.split('\n');
                const dataLines = lines.slice(1);
                const lastIdx = dataLines.length - 1;

                if (lastIdx < 0) continue;

                const trimmed = (dataLines[lastIdx] || '').trim();
                if (!trimmed) continue;

                // 创建积木并替换当前行
                const existingBlock = state.lineBlocks.get(lastIdx);
                if (existingBlock) safeDispose(existingBlock);

                const newBlock = createBlockInstance(blockType);
                if (newBlock) {
                    state.lineBlocks.set(lastIdx, newBlock);
                    state.lineLastText.set(lastIdx, trimmed);
                    state.linePinnedIndex.set(lastIdx, blockTypeId);

                    // 重建链
                    const commentPos = getCommentWSPos(workspace, comment.id);
                    const refWsPos = state.initialWsPos || commentPos;
                    const basePos = refWsPos
                        ? { x: refWsPos.x + 320, y: refWsPos.y }
                        : { x: 100, y: 100 };
                    buildChain(state, basePos.x, basePos.y);
                }
                break;
            } catch (e) {}
        }
    }

    function getCommentText(workspace, commentId) {
        try {
            if (workspace.getCommentById) {
                const c = workspace.getCommentById(commentId);
                if (c && c.getText) return c.getText();
            }
            for (const b of workspace.getAllBlocks(false)) {
                if (b.comment && b.comment.id === commentId) {
                    return b.comment.getText ? b.comment.getText() : (b.comment.text || '');
                }
            }
        } catch (e) {}
        return null;
    }

    function getCommentWSPos(workspace, commentId) {
        try {
            if (workspace.getCommentById) {
                const c = workspace.getCommentById(commentId);
                if (c && c.getXY) return c.getXY();
            }
            for (const b of workspace.getAllBlocks(false)) {
                if (b.comment && b.comment.id === commentId) {
                    return b.getRelativeToSurfaceXY();
                }
            }
        } catch (e) {}
        return null;
    }

    function wsToScreen(workspace, wsPos) {
        const m = workspace.getMetrics();
        return {
            x: wsPos.x * workspace.scale + m.absoluteLeft,
            y: wsPos.y * workspace.scale + m.absoluteTop
        };
    }

    /**
     * 创建积木实例（不插入工作区）
     */
    function createBlockInstance(blockInstance) {
        const workspace = Blockly.getMainWorkspace();
        if (!workspace || !blockInstance) return null;
        try {
            Blockly.Events.disable();
            const newBlock = blockInstance.createWorkspaceForm();
            Blockly.scratchBlocksUtils.changeObscuredShadowIds(newBlock);
            Blockly.Events.enable();
            return newBlock;
        } catch (e) {
            console.error('[CN Code] 创建积木实例失败:', e);
            try { Blockly.Events.enable(); } catch (e2) {}
            return null;
        }
    }

    function safeDispose(block) {
        if (!block) return;
        try {
            Blockly.Events.disable();
            try { block.nextConnection && block.nextConnection.disconnect(); } catch (e) {}
            try { block.previousConnection && block.previousConnection.disconnect(); } catch (e) {}
            block.dispose(false, true);
        } catch (e) {}
        try { Blockly.Events.enable(); } catch (e) {}
    }

    /**
     * 核心：用 Blockly 原生连接构建积木链
     * 只移动链头到目标位置，其余由 Blockly 自动堆叠
     */
    function buildChain(state, baseX, baseY) {
        const entries = [];
        for (const [idx, block] of state.lineBlocks) {
            entries.push({ idx, block });
        }
        entries.sort((a, b) => a.idx - b.idx);

        if (entries.length === 0) return;

        // 第一步：确保所有积木正确连接
        for (let k = 1; k < entries.length; k++) {
            const prevBlock = entries[k - 1].block;
            const currBlock = entries[k].block;
            try {
                const prevNext = prevBlock.nextConnection;
                const currPrev = currBlock.previousConnection;
                if (prevNext && currPrev) {
                    // 如果还没连接，连接它们
                    if (!currPrev.isConnected()) {
                        prevNext.connect(currPrev);
                    }
                }
            } catch (e) {
                console.warn('[CN Code] 链接失败:', e);
            }
        }

        // 第二步：移动链头到目标位置，Blockly 自动堆叠后续
        const headBlock = entries[0].block;
        try {
            Blockly.Events.disable();
            const headPos = headBlock.getRelativeToSurfaceXY();
            headBlock.moveBy(baseX - headPos.x, baseY - headPos.y);
            Blockly.Events.enable();
        } catch (e) {}

        // 第三步：触发 Blockly 重新计算布局
        try {
            const workspace = Blockly.getMainWorkspace();
            if (workspace && workspace.render) {
                workspace.render();
            }
        } catch (e) {}
    }

    function processCommentText(workspace, commentId, text) {
        if (!text) { hidePopup(); return; }

        const lines = text.split('\n');
        const firstLine = lines[0].trim();

        if (firstLine !== TAG) {
            if (cnCodeStates.has(commentId)) cnCodeStates.delete(commentId);
            hidePopup();
            return;
        }

        if (!ensureBlockTypesLoaded(workspace)) {
            popupStatusBar.textContent = '加载积木中...';
            popupStatusBar.style.display = '';
            showPopupAt(window.innerWidth / 2 - 150, 100);
            return;
        }

        const dataLines = lines.slice(1);
        const numLines = dataLines.length;

        let state = cnCodeStates.get(commentId);
        if (!state) {
            state = {
                lineBlocks: new Map(),
                lineLastText: new Map(),
                linePinnedIndex: new Map(),
                initialWsPos: null,
                initialScreenPos: null,
                commentSized: false
            };
            cnCodeStates.set(commentId, state);
        }

        // 获取注释位置
        const commentPos = getCommentWSPos(workspace, commentId);

        // 保存初始位置（只保存第一次）
        if (commentPos && !state.initialWsPos) {
            state.initialWsPos = { x: commentPos.x, y: commentPos.y };
            state.initialScreenPos = wsToScreen(workspace, commentPos);
        }

        // 自动调大注释初始大小
        if (!state.commentSized && commentPos) {
            try {
                const comment = workspace.getCommentById ? workspace.getCommentById(commentId) : null;
                if (comment && comment.setSize) {
                    comment.setSize(280, 180);
                    state.commentSized = true;
                }
            } catch (e) {}
        }

        // 使用保存的初始工作区位置（防止积木移动导致位置丢失）
        const refWsPos = state.initialWsPos || commentPos;
        
        // 积木链起点：注释右侧
        const basePos = refWsPos
            ? { x: refWsPos.x + 320, y: refWsPos.y }
            : { x: 100, y: 100 };

        // 弹窗位置：注释右侧，距离更远（使用初始屏幕坐标 + 偏移）
        let screenPos;
        if (state.initialScreenPos) {
            screenPos = {
                x: state.initialScreenPos.x + 450,
                y: state.initialScreenPos.y
            };
        } else if (commentPos) {
            screenPos = wsToScreen(workspace, { x: commentPos.x + 450, y: commentPos.y });
        } else {
            screenPos = { x: window.innerWidth / 2 - 150, y: 100 };
        }

        // 当前行搜索 → 弹窗
        const currentLine = dataLines[numLines - 1] || '';
        const searchResult = doSearch(currentLine);
        if (currentLine.trim() && searchResult) {
            showPopupAt(screenPos.x, screenPos.y);
            renderPopup(currentLine, searchResult);
        } else {
            hidePopup();
        }

        // 逐行处理积木
        let blocksChanged = false;

        for (let i = 0; i < numLines; i++) {
            const lineText = dataLines[i];
            const trimmed = lineText ? lineText.trim() : '';

            if (!trimmed) {
                if (state.lineBlocks.has(i)) {
                    safeDispose(state.lineBlocks.get(i));
                    state.lineBlocks.delete(i);
                    state.lineLastText.delete(i);
                    state.linePinnedIndex.delete(i);
                    blocksChanged = true;
                }
                continue;
            }

            const lastText = state.lineLastText.get(i);
            const existingBlock = state.lineBlocks.get(i);

            if (lastText === trimmed && existingBlock) {
                    // 文本没变且已有积木，保留 pinned index
                    continue;
                }
                // 文本变了，清除旧的 pinned index
                if (lastText !== trimmed) {
                    state.linePinnedIndex.delete(i);
                }

            const result = doSearch(trimmed);
            if (!result) {
                if (existingBlock) {
                    safeDispose(existingBlock);
                    state.lineBlocks.delete(i);
                    blocksChanged = true;
                }
                state.lineLastText.set(i, trimmed);
                continue;
            }

            // 找积木：优先使用用户手动选中的 type ID
            const blockList = result.blockList;
            let match = null;
            const pinnedTypeId = state.linePinnedIndex.get(i);
            if (pinnedTypeId) {
                for (const item of blockList) {
                    if (item.isHeader || item.isSprite || item.isCostume || item.isCustomBlock) continue;
                    if (!item.block) continue;
                    const id = item.block.typeInfo ? item.block.typeInfo.id : item.block.type;
                    if (id === pinnedTypeId) { match = item.block; break; }
                }
            }
            if (!match) {
                for (const item of blockList) {
                    if (item.isHeader || item.isSprite || item.isCostume || item.isCustomBlock) continue;
                    if (item.block) { match = item.block; break; }
                }
            }

            if (!match) {
                if (existingBlock) {
                    safeDispose(existingBlock);
                    state.lineBlocks.delete(i);
                    blocksChanged = true;
                }
                state.lineLastText.set(i, trimmed);
                continue;
            }

            // 类型没变
            const matchTypeId = match.typeInfo ? match.typeInfo.id : match.type;
            if (existingBlock && existingBlock.type === matchTypeId) {
                state.lineLastText.set(i, trimmed);
                continue;
            }

            if (existingBlock) {
                safeDispose(existingBlock);
                state.lineBlocks.delete(i);
            }

            const newBlock = createBlockInstance(match);
            if (newBlock) {
                state.lineBlocks.set(i, newBlock);
                state.lineLastText.set(i, trimmed);
                blocksChanged = true;
            }
        }

        // 清理多余行
        for (const [idx, block] of [...state.lineBlocks]) {
            if (idx >= numLines) {
                safeDispose(block);
                state.lineBlocks.delete(idx);
                state.lineLastText.delete(idx);
                state.linePinnedIndex.delete(idx);
                blocksChanged = true;
            }
        }

        // 重建链
        if (blocksChanged) {
            buildChain(state, basePos.x, basePos.y);
        }

        try { workspace.setResizesEnabled(true); } catch (e) {}
    }

    // ============ 事件监听 ============

    function onWorkspaceChange(event) {
        if (event.type !== 'comment_change' && event.type !== 'comment_create') return;
        const workspace = Blockly.getMainWorkspace();
        if (!workspace) return;
        try {
            const commentId = event.commentId;
            if (!commentId) return;
            const text = getCommentText(workspace, commentId);
            if (!text) return;
            processCommentText(workspace, commentId, text);
        } catch (e) {
            console.error('[CN Code] 事件处理失败:', e);
        }
    }

    const lastPollTexts = new Map();

    function pollingFallback() {
        const workspace = Blockly.getMainWorkspace();
        if (!workspace) return;
        try {
            const allComments = [];
            if (workspace.getTopComments) {
                const comments = workspace.getTopComments(false);
                if (Array.isArray(comments)) allComments.push(...comments);
            }
            for (const b of workspace.getAllBlocks(false)) {
                if (b.comment) allComments.push(b.comment);
            }

            for (const comment of allComments) {
                try {
                    const text = comment.getText ? comment.getText() : (comment.text || '');
                    const id = comment.id;
                    if (!text || !id) continue;
                    if (!text.startsWith(TAG)) {
                        if (lastPollTexts.has(id)) lastPollTexts.delete(id);
                        continue;
                    }
                    const lastText = lastPollTexts.get(id);
                    if (lastText !== text) {
                        lastPollTexts.set(id, text);
                        processCommentText(workspace, id, text);
                    }
                } catch (e) {}
            }
        } catch (e) {}
    }

    let textareaObserver = null;
    function setupTextareaListener() {
        if (textareaObserver) textareaObserver.disconnect();
        textareaObserver = new MutationObserver(() => {
            const textareas = document.querySelectorAll(
                '.scratchCommentTextarea, .blocklyCommentTextarea'
            );
            for (const ta of textareas) {
                if (ta._cnCodeListener) continue;
                ta._cnCodeListener = true;
                ta.addEventListener('input', () => {
                    setTimeout(pollingFallback, 0);
                });
            }
        });
        textareaObserver.observe(document.body, { childList: true, subtree: true });
    }

    function setup() {
        const workspace = Blockly.getMainWorkspace();
        if (!workspace) { setTimeout(setup, 500); return; }

        if (workspaceChangeListener) {
            try { workspace.removeChangeListener(workspaceChangeListener); } catch (e) {}
        }
        workspaceChangeListener = onWorkspaceChange;
        workspace.addChangeListener(workspaceChangeListener);

        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(pollingFallback, 150);

        setupTextareaListener();

        console.log('[CN Code] 插件已加载');
    }

    addon.tab.addEventListener('urlChange', () => {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        if (textareaObserver) { textareaObserver.disconnect(); textareaObserver = null; }
        cnCodeStates.clear();
        blockTypes = null;
        pinyinIndex = null;
        lastPollTexts.clear();
        hidePopup();
        setTimeout(setup, 100);
    });

    setup();
}

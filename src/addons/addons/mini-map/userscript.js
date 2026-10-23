// Mini Map addon：在自由窗口中显示脚本缩略图导航
// 预览逻辑：把工作区里每个积木的真实 <g> 节点克隆到窗口内的 <svg> 中，
// 用 viewBox 直接等比缩放。这样 C 型口、帽子、凹槽、文字都是编辑器里
// 本来的形状，不再依赖 canvas / Path2D 之类的解析。
// 点击或拖动缩略图 → 平移 workspace（不改变缩放），点哪里视野中心到哪里。

import WindowManager from '../../window-system/window-manager.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export default async function ({addon}) {
    let enabled = true;
    try {
        enabled = addon.settings.get('enable_minimap') !== false;
    } catch (e) {
        // ignore
    }
    if (!enabled) {
        return;
    }

    let mapWidth = 140;
    let mapHeight = 120;
    try {
        mapWidth = Math.max(80, Math.min(300, parseInt(addon.settings.get('width'), 10) || 140));
        mapHeight = Math.max(60, Math.min(240, parseInt(addon.settings.get('height'), 10) || 120));
    } catch (e) {
        // ignore
    }

    let Blockly = null;
    let workspace = null;
    try {
        Blockly = await addon.tab.traps.getBlockly();
        if (Blockly) {
            workspace = Blockly.getMainWorkspace();
        }
    } catch (e) {
        // ignore
    }

    let contentEl = null;
    let svgEl = null;
    let blocksGroup = null;
    let viewportRect = null;
    let dragging = false;
    let drawScheduled = false;
    let lastDrawTime = 0;
    let lastDrawKey = '';

    // 快照：只有积木真的变化时才重建
    let cacheDirty = true;
    let snapshot = null;
    let lastBuildTime = 0;
    let resizeObserver = null;
    let changeListenerWorkspace = null;

    // 小地图缩放：1 = 内容刚好铺满窗口；小于 1 时展示更大范围
    let viewZoom = 0.7;
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 3;
    let viewBoxState = null;
    let rafPending = false;

    const getMainWorkspace = () => {
        if (workspace) return workspace;
        try {
            if (Blockly) workspace = Blockly.getMainWorkspace();
        } catch (e) {
            // ignore
        }
        return workspace;
    };

    // 获取当前视口在 workspace 坐标系的位置
    const getViewport = () => {
        const ws = getMainWorkspace();
        if (!ws) return null;
        let m;
        try {
            m = ws.getMetrics();
        } catch (e) {
            return null;
        }
        if (!m) return null;
        return {
            x: m.viewLeft,
            y: m.viewTop,
            w: m.viewWidth,
            h: m.viewHeight
        };
    };

    // 重建预览快照：克隆每个非影子积木的真实 SVG 节点
    const buildSnapshot = () => {
        cacheDirty = false;
        const ws = getMainWorkspace();
        // 工作区还没准备好（例如打开窗口时编辑器仍在加载）：保留脏标记，下一轮重试
        if (!ws || !blocksGroup || !svgEl) {
            snapshot = null;
            cacheDirty = true;
            return;
        }

        let all = [];
        try {
            all = ws.getAllBlocks(false) || [];
        } catch (e) {
            all = [];
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let drawn = 0;
        const fragment = document.createDocumentFragment();

        for (const block of all) {
            try {
                // getAllBlocks 已经限定在当前工作区内，这里只排除工具箱里的预览块
                if (!block) continue;
                if (block.workspace && block.workspace.isFlyout) continue;
                // 影子块（输入槽里的数字块）在缩略图尺寸下只是噪点，跳过
                if (typeof block.isShadow === 'function' && block.isShadow()) continue;

                const root = typeof block.getSvgRoot === 'function' ? block.getSvgRoot() : null;
                if (!root) continue;
                const pos = block.getRelativeToSurfaceXY();
                if (!pos) continue;

                // 设备/时机不同，块可能还没完成渲染，getBBox 会返回 0；
                // 此时退回 Blockly 记录的宽高，避免整张图空白
                let width = 0;
                let height = 0;
                let offsetX = 0;
                let offsetY = 0;
                try {
                    const bbox = root.getBBox();
                    if (bbox && bbox.width > 0 && bbox.height > 0) {
                        width = bbox.width;
                        height = bbox.height;
                        offsetX = bbox.x;
                        offsetY = bbox.y;
                    }
                } catch (e) {
                    // ignore
                }
                if (!(width > 0) || !(height > 0)) {
                    try {
                        const hw = typeof block.getHeightWidth === 'function' ? block.getHeightWidth() : null;
                        if (hw && hw.width > 0 && hw.height > 0) {
                            width = hw.width;
                            height = hw.height;
                        }
                    } catch (e) {
                        // ignore
                    }
                }
                if (!(width > 0) || !(height > 0)) continue;

                const clone = root.cloneNode(true);
                clone.removeAttribute('id');
                fragment.appendChild(clone);
                drawn++;

                const x0 = pos.x + offsetX;
                const y0 = pos.y + offsetY;
                if (x0 < minX) minX = x0;
                if (y0 < minY) minY = y0;
                if (x0 + width > maxX) maxX = x0 + width;
                if (y0 + height > maxY) maxY = y0 + height;
            } catch (e) {
                // 单个积木异常不影响整张图
            }
        }

        // 清空旧的预览节点
        while (blocksGroup.firstChild) blocksGroup.removeChild(blocksGroup.firstChild);

        // 还没画出任何积木：可能是工作区尚未渲染，标记为脏等待下一轮重试
        if (!drawn) {
            snapshot = null;
            viewBoxState = null;
            cacheDirty = true;
            return;
        }

        blocksGroup.appendChild(fragment);

        // 留一圈空白，点击范围也包含这一点留白
        const pad = 12;
        minX -= pad;
        minY -= pad;
        maxX += pad;
        maxY += pad;
        const w = Math.max(1, maxX - minX);
        const h = Math.max(1, maxY - minY);

        snapshot = {minX, minY, w, h};
        applyViewBox();
    };

    // 按当前缩放比例计算并应用 viewBox（以内容中心为锚点）
    const applyViewBox = () => {
        if (!svgEl) return;
        if (!snapshot) {
            viewBoxState = null;
            svgEl.removeAttribute('viewBox');
            return;
        }
        const w = snapshot.w / viewZoom;
        const h = snapshot.h / viewZoom;
        viewBoxState = {
            x: snapshot.minX + (snapshot.w - w) / 2,
            y: snapshot.minY + (snapshot.h - h) / 2,
            w,
            h
        };
        svgEl.setAttribute('viewBox',
            `${viewBoxState.x} ${viewBoxState.y} ${viewBoxState.w} ${viewBoxState.h}`);
    };

    // 更新视野框（始终在积木图层之上）
    const updateViewportRect = () => {
        if (!viewportRect) return;
        const vp = getViewport();
        if (!snapshot || !vp) {
            viewportRect.setAttribute('display', 'none');
            return;
        }
        viewportRect.removeAttribute('display');
        viewportRect.setAttribute('x', vp.x);
        viewportRect.setAttribute('y', vp.y);
        viewportRect.setAttribute('width', Math.max(1, vp.w));
        viewportRect.setAttribute('height', Math.max(1, vp.h));
    };

    // 绘制（SVG 自身负责缩放，这里只处理快照和视野框）
    const draw = () => {
        if (!svgEl) return;

        const rect = svgEl.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return;

        const vp = getViewport();
        const vpKey = vp ? `${vp.x.toFixed(1)},${vp.y.toFixed(1)},${vp.w.toFixed(1)},${vp.h.toFixed(1)}` : 'none';
        const drawKey = `${Math.round(rect.width)}x${Math.round(rect.height)}|${vpKey}`;
        if (!cacheDirty && drawKey === lastDrawKey) return;
        lastDrawKey = drawKey;

        if (cacheDirty) {
            // 拖动积木时事件很密集，快照重建至少间隔 250ms，避免拖影卡顿
            const now = Date.now();
            if (now - lastBuildTime < 250) {
                setTimeout(scheduleDraw, 250);
                return;
            }
            lastBuildTime = now;
            buildSnapshot();
        }
        updateViewportRect();
    };

    // 节流绘制
    const scheduleDraw = () => {
        const now = Date.now();
        if (drawScheduled) return;
        if (now - lastDrawTime < 80) {
            drawScheduled = true;
            setTimeout(() => {
                drawScheduled = false;
                lastDrawTime = Date.now();
                draw();
            }, 80 - (now - lastDrawTime));
        } else {
            lastDrawTime = now;
            draw();
        }
    };

    // 缩略图坐标 → workspace 坐标（按 preserveAspectRatio="xMidYMid meet" 反算）
    const clientToWorkspace = (clientX, clientY) => {
        if (!svgEl || !viewBoxState) return null;
        const rect = svgEl.getBoundingClientRect();
        const scale = Math.min(rect.width / viewBoxState.w, rect.height / viewBoxState.h);
        const offsetX = (rect.width - viewBoxState.w * scale) / 2;
        const offsetY = (rect.height - viewBoxState.h * scale) / 2;
        return {
            x: viewBoxState.x + (clientX - rect.left - offsetX) / scale,
            y: viewBoxState.y + (clientY - rect.top - offsetY) / scale
        };
    };

    // 点击/拖动 → 平移 workspace，点哪里视野中心到哪里，不改变缩放
    const scrollTo = (clientX, clientY) => {
        const ws = getMainWorkspace();
        const point = clientToWorkspace(clientX, clientY);
        if (!point || !ws || !snapshot) return;

        // 只在脚本范围（含留白）内定位，空白角落点不过去
        const wx = Math.max(snapshot.minX, Math.min(snapshot.minX + snapshot.w, point.x));
        const wy = Math.max(snapshot.minY, Math.min(snapshot.minY + snapshot.h, point.y));

        const vp = getViewport();
        if (!vp) return;
        const targetViewLeft = wx - vp.w / 2;
        const targetViewTop = wy - vp.h / 2;

        try {
            if (ws.scrollbar) {
                if (ws.scrollbar.hScroll && ws.scrollbar.vScroll) {
                    ws.scrollbar.hScroll.set(targetViewLeft);
                    ws.scrollbar.vScroll.set(targetViewTop);
                } else if (typeof ws.scrollbar.set === 'function') {
                    ws.scrollbar.set(targetViewLeft, targetViewTop);
                }
            } else if (ws.scrollbar_ && ws.scrollbar_.set) {
                ws.scrollbar_.set(targetViewLeft, targetViewTop);
            }
        } catch (e) {
            try {
                if (typeof ws.scroll === 'function') {
                    ws.scroll(-targetViewLeft, -targetViewTop);
                }
            } catch (e2) {
                // ignore
            }
        }
        scheduleDraw();
    };

    // 创建自由窗口
    let miniMapWindow = null;

    const handlePointerDown = e => {
        dragging = true;
        try {
            svgEl.setPointerCapture(e.pointerId);
        } catch (err) {
            // ignore
        }
        scrollTo(e.clientX, e.clientY);
        e.preventDefault();
        e.stopPropagation();
    };
    const handlePointerMove = e => {
        if (!dragging) return;
        scrollTo(e.clientX, e.clientY);
        e.preventDefault();
    };
    const handlePointerUp = e => {
        dragging = false;
        try {
            if (svgEl.hasPointerCapture(e.pointerId)) svgEl.releasePointerCapture(e.pointerId);
        } catch (err) {
            // ignore
        }
    };

    // 监听工作区变化：积木增删改 → 标记缓存失效
    const attachWorkspaceListener = () => {
        const ws = getMainWorkspace();
        if (!ws || changeListenerWorkspace === ws) return;
        try {
            ws.addChangeListener(() => {
                cacheDirty = true;
                scheduleDraw();
            });
            // 滚轮平移/缩放时视野框立即跟随
            const svg = typeof ws.getParentSvg === 'function' ? ws.getParentSvg() : null;
            if (svg && !svg._rwMinimapWheelBound) {
                svg._rwMinimapWheelBound = true;
                svg.addEventListener('wheel', () => {
                    if (miniMapWindow && miniMapWindow.isVisible) scheduleDraw();
                }, {passive: true});
            }
            changeListenerWorkspace = ws;
        } catch (e) {
            // ignore
        }
    };

    const observeSize = () => {
        if (!contentEl || typeof ResizeObserver === 'undefined') return;
        if (resizeObserver) resizeObserver.disconnect();
        resizeObserver = new ResizeObserver(() => {
            lastDrawKey = '';
            // 放到下一帧再处理，避免在 ResizeObserver 回调里同步改布局
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                rafPending = false;
                scheduleDraw();
            });
        });
        resizeObserver.observe(contentEl);
    };

    // 复制工作区里的 <defs>（滤镜/裁剪等引用）
    const copyDefs = ws => {
        try {
            const sourceSvg = typeof ws.getParentSvg === 'function' ? ws.getParentSvg() : null;
            if (!sourceSvg) return;
            const defs = sourceSvg.querySelector('defs');
            if (defs && svgEl) svgEl.insertBefore(defs.cloneNode(true), svgEl.firstChild);
        } catch (e) {
            // ignore
        }
    };

    // 缩放小地图：只改变 viewBox，不重建积木快照
    const zoomBy = factor => {
        viewZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewZoom * factor));
        applyViewBox();
        lastDrawKey = '';
        scheduleDraw();
    };

    // 右下角悬浮缩放按钮
    const createZoomControls = () => {
        const controls = document.createElement('div');
        controls.className = 'rw-minimap-controls';

        const makeButton = (label, title, factor) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'rw-minimap-zoom-btn';
            button.textContent = label;
            button.title = title;
            button.setAttribute('aria-label', title);
            const stop = e => e.stopPropagation();
            button.addEventListener('pointerdown', stop);
            button.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                zoomBy(factor);
            });
            return button;
        };

        controls.appendChild(makeButton('+', '放大', 1.25));
        controls.appendChild(makeButton('−', '缩小', 0.8));
        contentEl.appendChild(controls);
    };

    const createUI = () => {
        miniMapWindow = WindowManager.createWindow({
            id: 'rw-minimap-window',
            title: 'Mini Map',
            width: mapWidth + 40,
            height: mapHeight + 80,
            minWidth: 120,
            minHeight: 100,
            className: 'rw-minimap-window',
            onClose: () => {}
        });

        contentEl = document.createElement('div');
        contentEl.className = 'rw-minimap-content';

        svgEl = document.createElementNS(SVG_NS, 'svg');
        svgEl.setAttribute('class', 'rw-minimap-svg');
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        blocksGroup = document.createElementNS(SVG_NS, 'g');
        blocksGroup.setAttribute('class', 'rw-minimap-blocks');
        svgEl.appendChild(blocksGroup);

        viewportRect = document.createElementNS(SVG_NS, 'rect');
        viewportRect.setAttribute('class', 'rw-minimap-viewport');
        viewportRect.setAttribute('display', 'none');
        svgEl.appendChild(viewportRect);

        contentEl.appendChild(svgEl);
        createZoomControls();
        miniMapWindow.setContent(contentEl);

        const ws = getMainWorkspace();
        if (ws) copyDefs(ws);

        // 指针事件同时兼容鼠标和手指
        svgEl.addEventListener('pointerdown', handlePointerDown);
        svgEl.addEventListener('pointermove', handlePointerMove);
        svgEl.addEventListener('pointerup', handlePointerUp);
        svgEl.addEventListener('pointercancel', handlePointerUp);
        svgEl.addEventListener('lostpointercapture', () => {
            dragging = false;
        });

        attachWorkspaceListener();
        observeSize();
        cacheDirty = true;
        scheduleDraw();
    };

    // 检测窗口是否仍然存活（未销毁）
    const isWindowAlive = () => miniMapWindow && miniMapWindow.element && miniMapWindow.element.parentNode;

    // 初始化窗口
    createUI();

    // 定时刷新：工作区/窗口尺寸/视野变化都会在这里补一次绘制，
    // 空闲时 draw() 会自行提前返回，不产生重绘
    setInterval(() => {
        if (!isWindowAlive()) return;
        attachWorkspaceListener();
        scheduleDraw();
    }, 300);

    // 暴露全局 API：toggle 显示/隐藏
    window.RWMiniMap = {
        toggle: () => {
            // 窗口已关闭（销毁）→ 重新创建
            if (!isWindowAlive()) {
                createUI();
                miniMapWindow.show();
                scheduleDraw();
                return;
            }
            if (miniMapWindow.isVisible) {
                miniMapWindow.hide();
            } else {
                miniMapWindow.show();
                scheduleDraw();
            }
        },
        show: () => {
            if (!isWindowAlive()) {
                createUI();
            }
            miniMapWindow.show();
            scheduleDraw();
        },
        hide: () => {
            if (!isWindowAlive()) return;
            miniMapWindow.hide();
        }
    };

    // 首次绘制延迟一点
    setTimeout(scheduleDraw, 800);
}

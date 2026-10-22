// Mini Map addon：在自由窗口中显示脚本缩略图导航
// 直接读取 Blockly 工作区中每个积木的真实路径（含 C 型口、帽子、凹槽），
// 绘制到离屏画布缓存；平移/缩放时只贴图 + 描边，开销与积木数量无关。
// 点击或拖动缩略图 → 平移 workspace（不改变缩放），点哪里视野中心到哪里。

import WindowManager from '../../window-system/window-manager.js';

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

    let canvas = null;
    let contentEl = null;
    let dragging = false;
    let drawScheduled = false;
    let lastDrawTime = 0;
    let eventsBound = false;

    // 缩略图几何缓存：只有积木真的变化时才重建
    let cacheDirty = true;
    let cachedLayer = null;
    let lastDrawKey = '';
    let resizeObserver = null;
    let changeListenerWorkspace = null;

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

    // 读取积木的真实外形路径与颜色
    const collectBlocks = () => {
        const ws = getMainWorkspace();
        if (!ws) return null;

        let all = [];
        try {
            all = ws.getAllBlocks(false) || [];
        } catch (e) {
            return null;
        }

        const blocks = [];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const block of all) {
            try {
                if (!block || block.workspace !== ws) continue;
                // 影子块（输入槽里的数字块）在缩略图尺寸下只是噪点，跳过
                if (typeof block.isShadow === 'function' && block.isShadow()) continue;

                const root = typeof block.getSvgRoot === 'function' ? block.getSvgRoot() : null;
                if (!root) continue;
                const pathEl = root.querySelector('.blocklyPath');
                if (!pathEl) continue;
                const d = pathEl.getAttribute('d');
                if (!d) continue;

                // getBBox 返回积木本地坐标（workspace 单位），不受缩放/滚动影响
                const bbox = pathEl.getBBox();
                if (!bbox || !(bbox.width > 0) || !(bbox.height > 0)) continue;

                const pos = block.getRelativeToSurfaceXY();
                if (!pos) continue;

                let color = '';
                try {
                    if (typeof block.getColour === 'function') {
                        const c = block.getColour();
                        if (typeof c === 'string' && c) color = c;
                    }
                } catch (e) {
                    // ignore
                }
                if (!color) {
                    const fill = window.getComputedStyle(pathEl).fill;
                    if (fill && fill !== 'none') color = fill;
                }
                if (!color) color = '#888888';

                blocks.push({
                    // 积木外层 <g> 的位置；路径 d 是积木本地坐标
                    px: pos.x,
                    py: pos.y,
                    bx: bbox.x,
                    by: bbox.y,
                    bw: bbox.width,
                    bh: bbox.height,
                    color,
                    path: new Path2D(d)
                });

                const x0 = pos.x + bbox.x;
                const y0 = pos.y + bbox.y;
                if (x0 < minX) minX = x0;
                if (y0 < minY) minY = y0;
                if (x0 + bbox.width > maxX) maxX = x0 + bbox.width;
                if (y0 + bbox.height > maxY) maxY = y0 + bbox.height;
            } catch (e) {
                // 单个积木异常不影响整张图
            }
        }

        if (blocks.length === 0) return null;
        return {blocks, minX, minY, maxX, maxY};
    };

    // 重建离屏缓存
    const buildLayer = () => {
        cacheDirty = false;
        const data = collectBlocks();
        if (!data) {
            cachedLayer = null;
            return;
        }

        // 留一圈空白，点击范围也包含这一点留白
        const pad = 12;
        const minX = data.minX - pad;
        const minY = data.minY - pad;
        const maxX = data.maxX + pad;
        const maxY = data.maxY + pad;
        const contentW = Math.max(1, maxX - minX);
        const contentH = Math.max(1, maxY - minY);

        // 离屏分辨率最多 2048，避免大作品占用过多内存
        const resolution = Math.min(1, 2048 / Math.max(contentW, contentH));
        const layer = document.createElement('canvas');
        layer.width = Math.max(1, Math.ceil(contentW * resolution));
        layer.height = Math.max(1, Math.ceil(contentH * resolution));
        const lctx = layer.getContext('2d');
        lctx.setTransform(resolution, 0, 0, resolution, -minX * resolution, -minY * resolution);

        for (const b of data.blocks) {
            try {
                lctx.save();
                lctx.translate(b.px, b.py);
                lctx.fillStyle = b.color;
                lctx.fill(b.path);
                lctx.restore();
            } catch (e) {
                // ignore
            }
        }

        cachedLayer = {canvas: layer, minX, minY, contentW, contentH};
    };

    // 绘制缩略图
    const draw = () => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        if (W < 2 || H < 2) return;

        const vp = getViewport();
        const vpKey = vp ? `${vp.x.toFixed(1)},${vp.y.toFixed(1)},${vp.w.toFixed(1)},${vp.h.toFixed(1)}` : 'none';
        const drawKey = `${Math.round(W)}x${Math.round(H)}|${vpKey}`;
        if (!cacheDirty && drawKey === lastDrawKey) return;
        lastDrawKey = drawKey;

        const dpr = window.devicePixelRatio || 1;
        const pixelW = Math.round(W * dpr);
        const pixelH = Math.round(H * dpr);
        if (canvas.width !== pixelW || canvas.height !== pixelH) {
            canvas.width = pixelW;
            canvas.height = pixelH;
        }

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, W, H);

        if (cacheDirty) buildLayer();

        const layer = cachedLayer;

        // 空工作区：只画视野方框
        if (!layer) {
            canvas._rwView = null;
            if (vp) {
                const pad = 24;
                const minX = vp.x - pad;
                const minY = vp.y - pad;
                const contentW = Math.max(1, vp.w + pad * 2);
                const contentH = Math.max(1, vp.h + pad * 2);
                const scale = Math.min((W - 8) / contentW, (H - 8) / contentH);
                const ox = (W - contentW * scale) / 2;
                const oy = (H - contentH * scale) / 2;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
                ctx.lineWidth = 1;
                ctx.strokeRect(ox + (vp.x - minX) * scale, oy + (vp.y - minY) * scale,
                    vp.w * scale, vp.h * scale);
            }
            return;
        }

        // 等比适配窗口，居中
        const padPx = 4;
        const scale = Math.min(
            (W - padPx * 2) / layer.contentW,
            (H - padPx * 2) / layer.contentH
        );
        const offsetX = padPx + (W - padPx * 2 - layer.contentW * scale) / 2;
        const offsetY = padPx + (H - padPx * 2 - layer.contentH * scale) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(
            layer.canvas,
            offsetX, offsetY,
            layer.contentW * scale, layer.contentH * scale
        );

        // 视野框
        if (vp) {
            const vx = offsetX + (vp.x - layer.minX) * scale;
            const vy = offsetY + (vp.y - layer.minY) * scale;
            const vw = vp.w * scale;
            const vh = vp.h * scale;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.lineWidth = 2;
            ctx.strokeRect(vx - 1, vy - 1, vw + 2, vh + 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 1;
            ctx.strokeRect(vx, vy, vw, vh);
        }

        // 保存当前变换用于点击定位
        canvas._rwView = {
            minX: layer.minX,
            minY: layer.minY,
            maxX: layer.minX + layer.contentW,
            maxY: layer.minY + layer.contentH,
            scale,
            offsetX,
            offsetY
        };
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

    // 点击/拖动 → 平移 workspace，点哪里视野中心到哪里，不改变缩放
    const scrollTo = (clientX, clientY) => {
        const ws = getMainWorkspace();
        const view = canvas && canvas._rwView;
        if (!canvas || !view || !ws) return;

        const rect = canvas.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;

        // 缩略图坐标 → workspace 坐标
        let wx = (px - view.offsetX) / view.scale + view.minX;
        let wy = (py - view.offsetY) / view.scale + view.minY;

        // 只在脚本范围（含留白）内定位，空白角落点不过去
        wx = Math.max(view.minX, Math.min(view.maxX, wx));
        wy = Math.max(view.minY, Math.min(view.maxY, wy));

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

    const handleCanvasDown = e => {
        dragging = true;
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch (err) {
            // ignore
        }
        scrollTo(e.clientX, e.clientY);
        e.preventDefault();
        e.stopPropagation();
    };
    const handleCanvasMove = e => {
        if (!dragging) return;
        scrollTo(e.clientX, e.clientY);
        e.preventDefault();
    };
    const handleCanvasUp = e => {
        dragging = false;
        try {
            if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
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
                if (miniMapWindow && miniMapWindow.isVisible) scheduleDraw();
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
        resizeObserver = new ResizeObserver(() => scheduleDraw());
        resizeObserver.observe(contentEl);
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
        canvas = document.createElement('canvas');
        canvas.className = 'rw-minimap-canvas';
        canvas.width = mapWidth;
        canvas.height = mapHeight;
        contentEl.appendChild(canvas);
        miniMapWindow.setContent(contentEl);

        // 指针事件同时兼容鼠标和手指
        canvas.addEventListener('pointerdown', handleCanvasDown);
        canvas.addEventListener('pointermove', handleCanvasMove);
        canvas.addEventListener('pointerup', handleCanvasUp);
        canvas.addEventListener('pointercancel', handleCanvasUp);
        canvas.addEventListener('lostpointercapture', () => {
            dragging = false;
        });

        eventsBound = true;
        attachWorkspaceListener();
        observeSize();
        cacheDirty = true;
        scheduleDraw();
    };

    // 检测窗口是否仍然存活（未销毁）
    const isWindowAlive = () => miniMapWindow && miniMapWindow.element && miniMapWindow.element.parentNode;

    // 初始化窗口
    createUI();

    // 定时清理事件绑定（窗口销毁后不再需要）
    window.addEventListener('beforeunload', () => {
        if (eventsBound && canvas) {
            canvas.removeEventListener('pointerdown', handleCanvasDown);
            canvas.removeEventListener('pointermove', handleCanvasMove);
            canvas.removeEventListener('pointerup', handleCanvasUp);
            canvas.removeEventListener('pointercancel', handleCanvasUp);
        }
        if (resizeObserver) resizeObserver.disconnect();
    });

    // 定时重绘：只在视野变化时真正重绘，空闲时不占用帧
    setInterval(() => {
        if (!isWindowAlive()) return;
        attachWorkspaceListener();
        if (miniMapWindow.isVisible) {
            scheduleDraw();
        }
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

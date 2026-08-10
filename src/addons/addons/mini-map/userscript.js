// Mini Map addon：在自由窗口中显示脚本缩略图导航
// 通过 VM.toJSON() 获取项目积木数据，按比例缩放绘制到 canvas
// 点击或拖动缩略图 → 滚动 workspace 到对应位置

import WindowManager from '../../window-system/window-manager.js';

// Scratch Blockly 积木类别颜色映射（用于缩略图着色）
const CATEGORY_COLORS = {
    'motion': '#4C97FF',
    'looks': '#9966FF',
    'sound': '#CF63CF',
    'event': '#FFBF00',
    'control': '#FFAB19',
    'sensing': '#5CB1D6',
    'operator': '#59C059',
    'data': '#FF8C1A',
    'procedures': '#FF6680',
    'argument': '#FF6680',
    'video': '#868DA5',
    'pen': '#0FBD8C',
    'music': '#999999',
    'text2speech': '#59C059',
    'translate': '#CF63CF',
    'makeymakey': '#FF8C1A',
    'microbit': '#FFBF00',
    'ev3': '#FF6680',
    'wedo2': '#4C97FF',
    'boost': '#59C059'
};

const getCategoryColor = opcode => {
    try {
        if (!opcode) return '#888888';
        const parts = opcode.split('_');
        const prefix = parts[0];
        if (CATEGORY_COLORS[prefix]) return CATEGORY_COLORS[prefix];
        // 检查是否是标准积木类别
        const standardPrefixes = ['motion', 'looks', 'sound', 'event', 'control',
            'sensing', 'operator', 'data', 'procedures', 'argument', 'video'];
        if (standardPrefixes.includes(prefix)) {
            return CATEGORY_COLORS[prefix] || '#888888';
        }
        // 扩展积木使用默认颜色
        return '#888888';
    } catch (e) {
        return '#888888';
    }
};

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

    // 提前获取 Blockly workspace
    let workspace = null;
    try {
        const Blockly = await addon.tab.traps.getBlockly();
        if (Blockly) {
            workspace = Blockly.getMainWorkspace();
        }
    } catch (e) {
        // ignore
    }

    let canvas = null;
    let collapsed = false;
    let dragging = false;
    let lastDrawTime = 0;
    let drawScheduled = false;
    let eventsBound = false;

    // 从 VM JSON 数据获取所有积木信息
    const getBlocksBounds = () => {
        let vm = null;
        try {
            vm = addon.tab.traps.vm;
        } catch (e) {
            return null;
        }
        if (!vm) return null;

        let projectJSON;
        try {
            projectJSON = JSON.parse(vm.toJSON());
        } catch (e) {
            return null;
        }
        if (!projectJSON || !projectJSON.targets) return null;

        const targets = projectJSON.targets;
        const blocks = [];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const target of targets) {
            const targetBlocks = target.blocks || {};
            for (const blockId in targetBlocks) {
                const block = targetBlocks[blockId];
                if (!block.opcode) continue;

                const x = block.x || 0;
                const y = block.y || 0;
                const color = getCategoryColor(block.opcode);

                blocks.push({x, y, w: 60, h: 30, color});
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x + 60 > maxX) maxX = x + 60;
                if (y + 30 > maxY) maxY = y + 30;
            }
        }

        if (blocks.length === 0) return null;
        return {blocks, minX, minY, maxX, maxY, contentWidth: maxX - minX, contentHeight: maxY - minY};
    };

    // 获取当前视口在 workspace 坐标系的位置
    const getViewport = () => {
        if (!workspace) return null;
        let m;
        try {
            m = workspace.getMetrics();
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

    // 绘制缩略图
    const draw = () => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // 清空
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, 0, W, H);

        const bounds = getBlocksBounds();
        if (!bounds) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无积木', W / 2, H / 2);
            return;
        }

        // 计算缩放：包含所有积木 + 一定的 padding
        const padding = 4;
        const scaleX = (W - padding * 2) / Math.max(1, bounds.contentWidth);
        const scaleY = (H - padding * 2) / Math.max(1, bounds.contentHeight);
        const scale = Math.min(scaleX, scaleY);

        // 居中偏移
        const offsetX = padding + (W - padding * 2 - bounds.contentWidth * scale) / 2;
        const offsetY = padding + (H - padding * 2 - bounds.contentHeight * scale) / 2;

        // 绘制每个积木
        for (const b of bounds.blocks) {
            const x = offsetX + (b.x - bounds.minX) * scale;
            const y = offsetY + (b.y - bounds.minY) * scale;
            const w = Math.max(1, b.w * scale);
            const h = Math.max(1, b.h * scale);
            ctx.fillStyle = b.color;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x, y, w, h);
        }
        ctx.globalAlpha = 1;

        // 绘制视口框
        const vp = getViewport();
        if (vp) {
            const vx = offsetX + (vp.x - bounds.minX) * scale;
            const vy = offsetY + (vp.y - bounds.minY) * scale;
            const vw = vp.w * scale;
            const vh = vp.h * scale;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 1;
            ctx.strokeRect(vx, vy, vw, vh);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.strokeRect(vx - 1, vy - 1, vw + 2, vh + 2);
        }

        // 保存当前缩放参数用于点击定位
        canvas._rwBounds = bounds;
        canvas._rwScale = scale;
        canvas._rwOffsetX = offsetX;
        canvas._rwOffsetY = offsetY;
    };

    // 节流绘制
    const scheduleDraw = () => {
        const now = Date.now();
        if (drawScheduled) return;
        if (now - lastDrawTime < 200) {
            drawScheduled = true;
            setTimeout(() => {
                drawScheduled = false;
                lastDrawTime = Date.now();
                draw();
            }, 200 - (now - lastDrawTime));
        } else {
            lastDrawTime = now;
            draw();
        }
    };

    // 点击/拖动 → 滚动 workspace
    const scrollTo = (clientX, clientY) => {
        if (!canvas || !canvas._rwBounds || !workspace) return;
        const rect = canvas.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        const bounds = canvas._rwBounds;
        const scale = canvas._rwScale;
        const offsetX = canvas._rwOffsetX;
        const offsetY = canvas._rwOffsetY;
        // 缩略图坐标 → workspace 坐标
        const wx = (px - offsetX) / scale + bounds.minX;
        const wy = (py - offsetY) / scale + bounds.minY;
        // 使 (wx, wy) 居中于视口
        const vp = getViewport();
        if (!vp) return;
        const targetViewLeft = wx - vp.w / 2;
        const targetViewTop = wy - vp.h / 2;
        // 通过 scrollbar 滚动
        try {
            if (workspace.scrollbar) {
                if (workspace.scrollbar.hScroll && workspace.scrollbar.vScroll) {
                    workspace.scrollbar.hScroll.set(targetViewLeft);
                    workspace.scrollbar.vScroll.set(targetViewTop);
                } else if (typeof workspace.scrollbar.set === 'function') {
                    workspace.scrollbar.set(targetViewLeft, targetViewTop);
                }
            } else if (workspace.scrollbar_ && workspace.scrollbar_.set) {
                workspace.scrollbar_.set(targetViewLeft, targetViewTop);
            }
        } catch (e) {
            try {
                if (typeof workspace.scroll === 'function') {
                    workspace.scroll(-targetViewLeft, -targetViewTop);
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
        scrollTo(e.clientX, e.clientY);
        e.preventDefault();
    };
    const handleCanvasMove = e => {
        if (!dragging) return;
        scrollTo(e.clientX, e.clientY);
    };
    const handleCanvasUp = () => {
        dragging = false;
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

        const content = document.createElement('div');
        content.className = 'rw-minimap-content';
        canvas = document.createElement('canvas');
        canvas.className = 'rw-minimap-canvas';
        canvas.width = mapWidth;
        canvas.height = mapHeight;
        content.appendChild(canvas);
        miniMapWindow.setContent(content);

        // 绑定画布事件
        canvas.addEventListener('mousedown', handleCanvasDown);

        // 只绑定一次全局拖动事件
        if (!eventsBound) {
            document.addEventListener('mousemove', handleCanvasMove);
            document.addEventListener('mouseup', handleCanvasUp);
            eventsBound = true;
        }
    };

    // 检测窗口是否仍然存活（未销毁）
    const isWindowAlive = () => miniMapWindow && miniMapWindow.element && miniMapWindow.element.parentNode;

    // 初始化窗口
    createUI();

    // 定时重绘（捕获积木变化）
    setInterval(() => {
        if (isWindowAlive() && miniMapWindow.isVisible) {
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

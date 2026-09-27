/**
 * 工作区裁剪：把视口外的积木真正从 DOM 里摘掉，而不是 display:none。
 *
 * scratch-blocks 自带的 IntersectionObserver 只做 display:none —— 浏览器对隐藏的
 * SVG 子树照样跑文字排版和样式计算，几万块积木时平移/缩放依然卡。这里把「隐藏」
 * 换成摘除 <g>，并补上三件配套的事：
 *
 *   1. 积木被摘掉后 getRelativeToSurfaceXY() 沿 parentNode 走会拿到 null 从而返回
 *      (0,0)，下一轮判定就全错了，所以摘除前缓存坐标、摘除后返回缓存。
 *      块的坐标相对 canvas 是稳定的（平移/缩放只改 canvas 的 transform），
 *      所以缓存是安全的；块被移动时必然在文档里，缓存会随之更新。
 *   2. observe/unobserve 原本是数组 indexOf / filter，加载几万个顶层块是 O(n^2)，
 *      这里用 Set 去重，只在真正有删除时才做一次数组清理。
 *   3. bringToFront() 依赖 parentNode，被摘掉的积木要先挂回去。
 */

const STORAGE_KEY = 'rw:block-culling';

let installed = false;

const isEnabled = () => {
    try {
        return window.localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch (err) {
        return true;
    }
};

const isInDocument = element => {
    if (!element) return false;
    // SVG 元素在部分浏览器上没有 isConnected，退化为查根节点
    if (typeof element.isConnected === 'boolean') return element.isConnected;
    let node = element;
    while (node.parentNode) {
        node = node.parentNode;
    }
    return !!(node.ownerDocument && node.ownerDocument.documentElement === node);
};

export default function installWorkspaceCulling (ScratchBlocks) {
    if (installed || !ScratchBlocks || !isEnabled()) return;

    const BlockSvg = ScratchBlocks.BlockSvg;
    const Observer = ScratchBlocks.IntersectionObserver;
    if (!BlockSvg || !Observer) return;
    installed = true;

    /* ------------------------------------------------------------------ */
    /* 1. 摘除 / 挂载                                                       */
    /* ------------------------------------------------------------------ */

    BlockSvg.prototype.setIntersects = function (intersects) {
        if (intersects === this.intersects_) return;

        const root = this.getSvgRoot();
        if (!root) {
            this.intersects_ = intersects;
            return;
        }
        // 以下几种情况绝不能摘：摘掉会让正在操作的积木凭空消失
        if (!intersects) {
            if (ScratchBlocks.selected === this) return;
            const workspace = this.workspace;
            if (workspace) {
                // 正在拖的积木（它可能已经被搬到 drag surface 上，不在 canvas 里）
                const surface = workspace.blockDragSurface_;
                if (surface && typeof surface.getCurrentBlock === 'function' &&
                    surface.getCurrentBlock() === root) {
                    return;
                }
                // 手势进行中：工作区拖拽 / 积木拖拽
                if (typeof workspace.isDragging === 'function' && workspace.isDragging()) return;
            }
        }

        this.intersects_ = intersects;

        if (intersects) {
            const next = this.__cullNextSibling;
            this.__cullParent = null;
            this.__cullNextSibling = null;

            // 挂回的位置按「现在」的父子关系算，不能用摘除时记下的那个：
            // 积木可能在摘除期间被接进了别的积木、或者从脚本里拆了出来，
            // 用旧位置会把它插到错误的层级上。
            const parentBlock = this.getParent ? this.getParent() : null;
            const parentSvg = parentBlock && parentBlock.getSvgRoot ? parentBlock.getSvgRoot() : null;
            const canvas = this.workspace && this.workspace.getCanvas ?
                this.workspace.getCanvas() : null;
            const parent = parentSvg || canvas;

            if (parent && isInDocument(parent)) {
                if (next && next.parentNode === parent) {
                    parent.insertBefore(root, next);
                } else {
                    parent.appendChild(root);
                }
            }
            root.style.display = '';
        } else {
            // 记住原来的位置，挂回去时插回同一个地方，保持绘制顺序不变
            this.__cullParent = root.parentNode;
            this.__cullNextSibling = root.nextSibling;
            if (root.parentNode) {
                root.parentNode.removeChild(root);
            }
        }
    };

    const originalBringToFront = BlockSvg.prototype.bringToFront;
    if (originalBringToFront) {
        BlockSvg.prototype.bringToFront = function () {
            const root = this.getSvgRoot();
            if (root && !root.parentNode) {
                // 被裁剪掉的积木先挂回文档再置顶
                this.setIntersects(true);
            }
            if (!root || !root.parentNode) return;
            return originalBringToFront.call(this);
        };
    }

    /* ------------------------------------------------------------------ */
    /* 2. 脱离文档时返回缓存坐标                                            */
    /* ------------------------------------------------------------------ */

    const originalGetXY = BlockSvg.prototype.getRelativeToSurfaceXY;
    BlockSvg.prototype.getRelativeToSurfaceXY = function () {
        const root = this.getSvgRoot ? this.getSvgRoot() : null;
        if (root && !root.parentNode && this.__culledXY) {
            return this.__culledXY.clone ? this.__culledXY.clone() :
                {x: this.__culledXY.x, y: this.__culledXY.y};
        }
        const xy = originalGetXY.call(this);
        if (xy) {
            this.__culledXY = xy.clone ? xy.clone() : {x: xy.x, y: xy.y};
        }
        return xy;
    };

    /* ------------------------------------------------------------------ */
    /* 3. 观察列表去 O(n^2)                                                */
    /* ------------------------------------------------------------------ */

    Observer.prototype.observe = function (block) {
        if (!block) return;
        if (!this.__observed) {
            this.__observed = new Set();
            if (Array.isArray(this.observing)) {
                for (const existing of this.observing) {
                    this.__observed.add(existing);
                }
            }
        }
        if (this.__observed.has(block)) return;
        this.__observed.add(block);
        if (Array.isArray(this.observing)) {
            this.observing.push(block);
        } else {
            this.observing = [block];
        }
    };

    Observer.prototype.unobserve = function (block) {
        if (!block || !this.__observed || !this.__observed.has(block)) return;
        this.__observed.delete(block);
        // 数组的清理推迟到下一次检查，避免加载期反复 O(n) 重建
        this.__needsCleanup = true;
    };

    const originalCheck = Observer.prototype.checkForIntersections;
    Observer.prototype.checkForIntersections = function () {
        if (this.__needsCleanup && Array.isArray(this.observing) && this.__observed) {
            this.observing = this.observing.filter(item => item && item.workspace && this.__observed.has(item));
            this.__needsCleanup = false;
        }
        return originalCheck.call(this);
    };
}

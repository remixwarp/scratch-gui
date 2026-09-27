import BlockInstance from './BlockInstance.js';
import BlockFlasher from './BlockFlasher.js';

const distance = (pos, next) => Math.sqrt(Math.pow(pos.left - next.left, 2) + Math.pow(pos.top - next.top, 2));

// Make these global so that every feature uses the same arrays.
const views = [];
let forward = [];

class NavigationHistory {
    constructor (ScratchBlocks) {
        this.ScratchBlocks = ScratchBlocks;
    }

    storeView (next, dist) {
        forward = [];
        const workspace = this.ScratchBlocks.getMainWorkspace();
        if (!workspace) return;

        const s = workspace.getMetrics();
        const pos = {left: s.viewLeft, top: s.viewTop};
        if (!next || distance(pos, next) > dist) {
            views.push(pos);
        }
    }

    peek () {
        return views.length > 0 ? views[views.length - 1] : null;
    }

    goBack () {
        const workspace = this.ScratchBlocks.getMainWorkspace();
        if (!workspace) return;

        const s = workspace.getMetrics();
        const pos = {left: s.viewLeft, top: s.viewTop};
        let view = this.peek();
        if (!view) return;

        if (distance(pos, view) < 64) {
            if (views.length > 1) {
                views.pop();
                forward.push(view);
            }
        }

        view = this.peek();
        if (!view) return;

        const sx = view.left - s.contentLeft;
        const sy = view.top - s.contentTop;
        workspace.scrollbar.set(sx, sy);
    }

    goForward () {
        const view = forward.pop();
        if (!view) return;

        views.push(view);

        const workspace = this.ScratchBlocks.getMainWorkspace();
        if (!workspace) return;

        const s = workspace.getMetrics();
        const sx = view.left - s.contentLeft;
        const sy = view.top - s.contentTop;
        workspace.scrollbar.set(sx, sy);
    }
}

export default class Utils {
    /**
     * @param {*} vm scratch-vm instance
     * @param {*} ScratchBlocks scratch-blocks module instance
     */
    constructor (vm, ScratchBlocks) {
        this.vm = vm;
        this.ScratchBlocks = ScratchBlocks;

        this.offsetX = 32;
        this.offsetY = 32;
        this.navigationHistory = new NavigationHistory(ScratchBlocks);

        /**
         * The workspace
         */
        this._workspace = null;
    }

    /**
     * Get the Scratch Editing Target
     * @returns {Target} the current editing target
     */
    getEditingTarget () {
        return this.vm.runtime.getEditingTarget();
    }

    /**
     * Set the current workspace (switches sprites)
     * @param {string} targetID ID of the target to switch to
     */
    setEditingTarget (targetID) {
        if (this.getEditingTarget().id !== targetID) {
            this.vm.setEditingTarget(targetID);
        }
    }

    /**
     * Returns the main workspace
     * @returns {Workspace} the current workspace
     */
    getWorkspace () {
        const currentWorkspace = this.ScratchBlocks.getMainWorkspace();
        if (currentWorkspace && currentWorkspace.getToolbox && currentWorkspace.getToolbox()) {
            // getMainWorkspace does not always return the 'real' workspace.
            // We can detect the correct one by whether it has a toolbox.
            this._workspace = currentWorkspace;
        }
        return this._workspace;
    }

    /**
     * Based on wksp.centerOnBlock(li.data.labelID);
     * @param {*|string|BlockInstance} blockOrId A Blockly Block, a block id, or a BlockInstance
     */
    scrollBlockIntoView (blockOrId) {
        const workspace = this.getWorkspace();
        if (!workspace) return;

        let block;

        if (blockOrId instanceof BlockInstance) {
            this.setEditingTarget(blockOrId.targetId);
            block = workspace.getBlockById(blockOrId.id);
        } else {
            block = blockOrId && blockOrId.id ? blockOrId : workspace.getBlockById(blockOrId);
        }

        if (!block) return;

        const root = block.getRootBlock();
        const base = this.getTopOfStackFor(block);
        const ePos = base.getRelativeToSurfaceXY();
        const rPos = root.getRelativeToSurfaceXY();
        const scale = workspace.scale;
        const x = rPos.x * scale;
        const y = ePos.y * scale;
        const xx = block.width + x;
        const yy = block.height + y;
        const s = workspace.getMetrics();

        if (
            x < s.viewLeft + this.offsetX - 4 ||
            xx > s.viewLeft + s.viewWidth ||
            y < s.viewTop + this.offsetY - 4 ||
            yy > s.viewTop + s.viewHeight
        ) {
            const sx = x - s.contentLeft - this.offsetX;
            const sy = y - s.contentTop - this.offsetY;

            this.navigationHistory.storeView(this.navigationHistory.peek(), 64);
            workspace.scrollbar.set(sx, sy);
            this.navigationHistory.storeView({left: sx, top: sy}, 64);
        }

        if (this.ScratchBlocks.hideChaff) {
            this.ScratchBlocks.hideChaff();
        }
        BlockFlasher.flash(block);
    }

    /**
     * Scroll a workspace comment into view and flash it.
     * @param {string} commentId ID of the comment
     */
    scrollCommentIntoView (commentId) {
        const workspace = this.getWorkspace();
        if (!workspace || typeof workspace.getCommentById !== 'function') return;

        const comment = workspace.getCommentById(commentId);
        if (!comment) return;

        // 挂在积木上的注释如果还没显示出来，先让它显示
        if (typeof comment.isVisible === 'function' && typeof comment.setVisible === 'function' &&
            !comment.isVisible()) {
            comment.setVisible(true);
        }

        // 折起来的注释先展开，否则跳过去也看不见内容
        if (typeof comment.isMinimized === 'function' && comment.isMinimized() &&
            typeof comment.setMinimized === 'function') {
            comment.setMinimized(false);
        }

        let x = null;
        let y = null;
        let width = 0;
        let height = 0;

        if (typeof comment.getBoundingRectangle === 'function') {
            let bounds = null;
            try {
                bounds = comment.getBoundingRectangle();
            } catch (err) {
                bounds = null;
            }
            const topLeft = bounds && bounds.topLeft;
            const bottomRight = bounds && bounds.bottomRight;
            if (topLeft && bottomRight) {
                x = topLeft.x;
                y = topLeft.y;
                width = bottomRight.x - topLeft.x;
                height = bottomRight.y - topLeft.y;
            }
        }
        if (x === null && typeof comment.getXY === 'function') {
            const pos = comment.getXY();
            if (pos) {
                x = pos.x;
                y = pos.y;
            }
        }
        if (x === null) return;

        const scale = workspace.scale;
        const s = workspace.getMetrics();
        const left = x * scale;
        const top = y * scale;
        const right = (x + width) * scale;
        const bottom = (y + height) * scale;

        if (
            left < s.viewLeft + this.offsetX - 4 ||
            right > s.viewLeft + s.viewWidth ||
            top < s.viewTop + this.offsetY - 4 ||
            bottom > s.viewTop + s.viewHeight
        ) {
            const sx = x - s.contentLeft - this.offsetX;
            const sy = y - s.contentTop - this.offsetY;

            this.navigationHistory.storeView(this.navigationHistory.peek(), 64);
            workspace.scrollbar.set(sx, sy);
            this.navigationHistory.storeView({left: sx, top: sy}, 64);
        }

        if (this.ScratchBlocks.hideChaff) {
            this.ScratchBlocks.hideChaff();
        }
        this.flashComment(comment);
    }

    /**
     * Flash a comment. Comments have no svgPath_, so an outline glow is used.
     * @param {*} comment the comment
     */
    flashComment (comment) {
        let svgRoot = null;
        if (typeof comment.getSvgRoot === 'function') {
            svgRoot = comment.getSvgRoot();
        }
        if (!svgRoot && comment.bubble_ && typeof comment.bubble_.getSvgRoot === 'function') {
            svgRoot = comment.bubble_.getSvgRoot();
        }
        if (!svgRoot || !svgRoot.style) return;

        let count = 4;
        let flashOn = true;
        const timer = setInterval(() => {
            svgRoot.style.filter = flashOn ? 'drop-shadow(0 0 6px #ffbf00)' : '';
            flashOn = !flashOn;
            count -= 1;
            if (count <= 0) {
                clearInterval(timer);
                svgRoot.style.filter = '';
            }
        }, 200);
    }

    /**
     * Find the top stack block of a stack
     * @param {*} block A Blockly block
     * @returns {*} The top stack block
     */
    getTopOfStackFor (block) {
        let base = block;
        while (base.getOutputShape() && base.getSurroundParent()) {
            base = base.getSurroundParent();
        }
        return base;
    }
}

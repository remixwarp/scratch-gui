/**
 * PointerE ops ↔ 编辑器积木编辑的桥接层。
 *
 * - 本地 Blockly 事件 → PointerE protocol 2 ops（create/delete/change/move/var 系列/comment 系列）
 * - 远端 ops → Blockly 事件回放（带抑制标记，不产生回环）
 * - 角色使用协议要求的稳定键 stage / sprite-0 / sprite-1 ...
 * - 字段级 [lamport, clientId] 版本比较，避免并发覆盖
 * - 拿不到 Blockly workspace 时退化为整项目 sb3 快照同步（state / state-request）
 */

const OP_TYPES = new Set([
    'create', 'delete', 'change', 'move',
    'var_create', 'var_delete', 'var_rename',
    'comment_create', 'comment_delete', 'comment_change'
]);

const getVM = () => {
    try {
        const state = window.ReduxStore && window.ReduxStore.getState && window.ReduxStore.getState();
        return state && state.scratchGui && state.scratchGui.vm || null;
    } catch (e) {
        return null;
    }
};

const getBlocks = () => {
    if (typeof window === 'undefined') return null;
    return window.ScratchBlocks || window.Blockly || null;
};

/** 稳定的角色键：舞台 = stage，其余按项目内顺序编号。 */
export const getStableTargetId = (vm, localId) => {
    if (!vm || !vm.runtime || !Array.isArray(vm.runtime.targets)) return null;
    const index = vm.runtime.targets.findIndex(t => t.id === localId);
    if (index < 0) return null;
    return vm.runtime.targets[index].isStage ? 'stage' : `sprite-${index - 1}`;
};

export const getLocalTargetId = (vm, stableId) => {
    if (!vm || !vm.runtime || !Array.isArray(vm.runtime.targets)) return null;
    if (stableId === 'stage') {
        const stage = vm.runtime.targets.find(t => t.isStage);
        return stage ? stage.id : null;
    }
    const match = /^sprite-(\d+)$/.exec(String(stableId || ''));
    if (!match) return null;
    const target = vm.runtime.targets[Number(match[1]) + 1];
    return target ? target.id : null;
};

const xmlToString = (blocks, xml) => {
    if (!xml) return '';
    if (typeof xml === 'string') return xml;
    try {
        return blocks.Xml.domToText(xml);
    } catch (e) {
        try {
            return blocks.Xml.blockToDom(xml).outerHTML;
        } catch (e2) {
            return '';
        }
    }
};

class PointerEOpsBridge {
    constructor (collab) {
        this.collab = collab;
        this.vm = null;
        this.workspace = null;
        this.remoteApplying = false;
        this.localSequence = 0;
        this.fieldVersions = new Map();
        this.cursorLayer = null;
        this.remoteCursors = new Map();
        this.pendingMove = null;
        this.moveTimer = null;
        this.running = false;
        this.unsubscribers = [];
    }

    _ensureWorkspace () {
        this.vm = this.vm || getVM();
        if (this.workspace) return this.workspace;
        const blocks = getBlocks();
        if (blocks && typeof blocks.getMainWorkspace === 'function') {
            this.workspace = blocks.getMainWorkspace();
        }
        return this.workspace;
    }

    _workspaceTargetId (event) {
        const vm = this.vm || getVM();
        const localId = (event && event.workspaceId) ||
            (this.workspace && this.workspace.targetId) ||
            (vm && vm.editingTarget && vm.editingTarget.id);
        return getStableTargetId(vm, localId) || 'stage';
    }

    /** 把一条 Blockly 事件转成 PointerE op；不可同步的事件返回 null。 */
    eventToOp (event) {
        if (!event || !OP_TYPES.has(event.type)) return null;
        const op = {type: event.type};
        const str = value => (typeof value === 'undefined' ? undefined : String(value));

        switch (event.type) {
            case 'create':
                op.blockId = event.blockId;
                op.xml = xmlToString(getBlocks(), event.xml);
                break;
            case 'delete':
                op.blockId = event.blockId;
                op.ids = Array.isArray(event.ids) ? event.ids.slice() : [event.blockId];
                break;
            case 'change':
                op.blockId = event.blockId;
                op.element = event.element;
                op.name = event.name;
                op.newValue = str(event.newValue);
                op.oldValue = str(event.oldValue);
                break;
            case 'move':
                op.blockId = event.blockId;
                op.newParentId = str(event.newParentId);
                op.newInputName = str(event.newInputName);
                op.newCoordinate = str(event.newCoordinate);
                op.oldParentId = str(event.oldParentId);
                op.oldInputName = str(event.oldInputName);
                op.oldCoordinate = str(event.oldCoordinate);
                break;
            case 'var_create':
            case 'var_delete':
            case 'var_rename':
                op.varId = event.varId;
                op.varName = event.varName;
                op.varType = event.varType;
                op.oldName = event.oldName;
                break;
            case 'comment_create':
            case 'comment_delete':
            case 'comment_change':
                op.commentId = event.commentId;
                op.blockId = event.blockId;
                op.text = event.text;
                op.width = event.width;
                op.height = event.height;
                op.minimized = event.minimized;
                break;
            default:
                return null;
        }
        if (!op.blockId && !op.varId && !op.commentId) return null;
        return op;
    }

    _versionKey (targetId, op) {
        return [
            targetId,
            op.blockId || op.varId || op.commentId || '',
            op.element || '',
            op.name || ''
        ].join(':');
    }

    _bumpVersion (targetId, op) {
        const key = this._versionKey(targetId, op);
        const prev = this.fieldVersions.get(key);
        const next = [(prev ? prev[0] : 0) + 1, this.collab.clientId || 'local'];
        this.fieldVersions.set(key, next);
        op.v = next;
        return next;
    }

    _isStale (targetId, op) {
        if (!op.v || !Array.isArray(op.v)) return false;
        const key = this._versionKey(targetId, op);
        const local = this.fieldVersions.get(key);
        if (!local) {
            this.fieldVersions.set(key, op.v);
            return false;
        }
        if (op.v[0] < local[0]) return true;
        if (op.v[0] === local[0] && String(op.v[1]) === String(local[1])) return true;
        this.fieldVersions.set(key, op.v);
        return false;
    }

    _onLocalEvent = event => {
        if (!this.running || this.remoteApplying || event.isUiEvent) return;
        const op = this.eventToOp(event);
        if (!op) return;
        const targetId = this._workspaceTargetId(event);
        this._bumpVersion(targetId, op);

        // 拖动坐标高频事件节流：过程中只发最后一次，松手时由 Blockly 的连接变化补发
        if (event.type === 'move' && op.newCoordinate && !op.newParentId) {
            this.pendingMove = {targetId, op};
            if (this.moveTimer) return;
            this.moveTimer = setTimeout(() => {
                this.moveTimer = null;
                const pending = this.pendingMove;
                this.pendingMove = null;
                if (pending) this.collab.sendOps(pending.targetId, [pending.op]);
            }, 90);
            return;
        }

        this.collab.sendOps(targetId, [op]);
    };

    /** 应用一条远端 op（Blockly 事件回放）。 */
    applyRemoteOp (targetId, op) {
        if (!op || !OP_TYPES.has(op.type)) return false;
        if (this._isStale(targetId, op)) return false;
        const workspace = this._ensureWorkspace();
        const blocks = getBlocks();
        if (!workspace || !blocks || !blocks.Events || !blocks.Events.fromJson) return false;

        const json = Object.assign({}, op, {type: op.type});
        delete json.v;
        if (json.xml && !/^<block/.test(json.xml)) {
            json.xml = `<xml>${json.xml}</xml>`;
        }

        this.remoteApplying = true;
        try {
            const event = blocks.Events.fromJson(json, workspace);
            if (event) {
                if (op.type === 'move') {
                    if (op.newCoordinate) event.newCoordinate = String(op.newCoordinate).split(',').map(Number);
                    if (op.oldCoordinate) event.oldCoordinate = String(op.oldCoordinate).split(',').map(Number);
                    if (op.newParentId) event.newParentId = op.newParentId;
                    if (op.oldParentId) event.oldParentId = op.oldParentId;
                    if (op.newInputName) event.newInputName = op.newInputName;
                    if (op.oldInputName) event.oldInputName = op.oldInputName;
                }
                if (op.xml && !event.xml) {
                    const dom = blocks.Xml.textToDom(`<xml>${op.xml}</xml>`);
                    event.xml = dom.firstChild;
                }
                blocks.Events.fire(event);
            }
            return true;
        } catch (e) {
            return false;
        } finally {
            this.remoteApplying = false;
        }
    }

    /** 导出整项目 sb3 base64（快照模式）。 */
    exportSnapshot () {
        const vm = this.vm || getVM();
        if (!vm || typeof vm.saveProjectSb3 !== 'function') return Promise.resolve(null);
        return vm.saveProjectSb3().then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = String(reader.result || '');
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        })).catch(() => null);
    }

    importSnapshot (base64) {
        const vm = this.vm || getVM();
        if (!vm || !base64 || typeof vm.loadProject !== 'function') return Promise.resolve(false);
        try {
            const binary = atob(String(base64).replace(/\s/g, ''));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return vm.loadProject(new Blob([bytes], {type: 'application/zip'}))
                .then(() => true)
                .catch(() => false);
        } catch (e) {
            return Promise.resolve(false);
        }
    }

    /** 最小光标图层：按积木相对坐标还原远端光标。 */
    _ensureCursorLayer () {
        if (this.cursorLayer) return this.cursorLayer;
        const workspace = this._ensureWorkspace();
        const canvas = workspace && workspace.getCanvas && workspace.getCanvas();
        if (!canvas) return null;
        const parent = canvas.parentElement;
        if (!parent) return null;
        const layer = document.createElement('div');
        layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
        parent.appendChild(layer);
        this.cursorLayer = layer;
        return layer;
    }

    showRemoteCursor (message) {
        const layer = this._ensureCursorLayer();
        if (!layer || !message || !message.clientId) return;
        let el = this.remoteCursors.get(message.clientId);
        if (!el) {
            el = document.createElement('div');
            el.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;transition:left .08s linear,top .08s linear;';
            el.innerHTML = '<span data-pe-cursor-name style="font:11px sans-serif;background:#4c97ff;color:#fff;padding:2px 6px;border-radius:6px;display:inline-block;transform:translateY(-14px)"></span>' +
                '<span data-pe-cursor-arrow style="display:block;width:0;height:0;border-left:7px solid #4c97ff;border-top:5px solid transparent;border-bottom:5px solid transparent"></span>';
            layer.appendChild(el);
            this.remoteCursors.set(message.clientId, el);
        }
        el.querySelector('[data-pe-cursor-name]').textContent = message.name || '协作者';

        const vm = this.vm || getVM();
        const localId = getLocalTargetId(vm, message.targetId);
        const blocks = getBlocks();
        const workspace = this.workspace;
        let x = Number(message.x || 0);
        let y = Number(message.y || 0);
        if (message.anchorId && blocks && workspace && blocks.Events) {
            const anchor = workspace.getBlockById && workspace.getBlockById(message.anchorId);
            if (anchor && anchor.getBoundingRectangle) {
                const rect = anchor.getBoundingRectangle();
                x = rect.left + (Number(message.anchorX || 0) * rect.width);
                y = rect.top + (Number(message.anchorY || 0) * rect.height);
            }
        }
        if (workspace && workspace.getScale) {
            const scale = workspace.getScale();
            x *= scale;
            y *= scale;
        }
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.display = message.visible === false ? 'none' : 'block';
        // targetId 不匹配的协作者光标淡化，避免指错角色
        el.style.opacity = localId && vm && vm.editingTarget && vm.editingTarget.id === localId ? '1' : '0.45';
    }

    removeRemoteCursor (clientId) {
        const el = this.remoteCursors.get(clientId);
        if (el && el.parentNode) el.parentNode.removeChild(el);
        this.remoteCursors.delete(clientId);
    }

    /** 启动桥接：监听工作区与协作消息。 */
    start () {
        if (this.running) return;
        this.running = true;
        const workspace = this._ensureWorkspace();
        if (workspace && workspace.addChangeListener) {
            workspace.addChangeListener(this._onLocalEvent);
            this.workspaceListener = workspace;
        }

        this.unsubscribers.push(this.collab.on('ops', message => {
            const targetId = message.targetId || 'stage';
            const ops = Array.isArray(message.ops) ? message.ops : [];
            ops.forEach(op => this.applyRemoteOp(targetId, op));
        }));

        this.unsubscribers.push(this.collab.on('presence', message => {
            this.showRemoteCursor(message);
        }));

        this.unsubscribers.push(this.collab.on('sync-state', message => {
            const snapshots = Array.isArray(message.snapshots) ? message.snapshots : [];
            const ops = Array.isArray(message.ops) ? message.ops : [];
            ops.forEach(op => this.applyRemoteOp(op.targetId || message.targetId || 'stage', op));
            if (snapshots.length) {
                const mine = snapshots.find(s => s.targetId === 'stage');
                if (mine && mine.data) this.importSnapshot(mine.data);
            }
        }));

        this.unsubscribers.push(this.collab.on('state', message => {
            if (message.from && message.from === this.collab.clientId) return;
            if (message.data) this.importSnapshot(message.data);
        }));

        this.unsubscribers.push(this.collab.on('disconnected', () => {
            this.remoteCursors.forEach((el, id) => this.removeRemoteCursor(id));
        }));
    }

    stop () {
        this.running = false;
        if (this.workspaceListener && this.workspaceListener.removeChangeListener) {
            this.workspaceListener.removeChangeListener(this._onLocalEvent);
        }
        this.workspaceListener = null;
        this.unsubscribers.forEach(fn => fn && fn());
        this.unsubscribers = [];
        if (this.moveTimer) clearTimeout(this.moveTimer);
        if (this.cursorLayer && this.cursorLayer.parentNode) {
            this.cursorLayer.parentNode.removeChild(this.cursorLayer);
        }
        this.cursorLayer = null;
        this.remoteCursors.clear();
    }
}

export default PointerEOpsBridge;

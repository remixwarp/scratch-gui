import {
    installExtensionUrlRecorder,
    buildExtensionMetaForXmlDom,
    composePayloadText,
    parsePayloadText,
    getMissingExtensionDefinitions,
    loadExtensionDefinition
} from './block-payload.js';
import {getFormattedMessage} from '../git/i18n.js';

let systemClipboardActive = false;

const DRAG_STORAGE_KEY = 'mw:block-drag-payload';
const DRAG_PAYLOAD_TTL = 15000;
const DRAG_MIN_DISTANCE = 12;
const DRAG_MIN_DURATION = 120;

const WINDOW_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const isFirefox = () => typeof navigator !== 'undefined' &&
        typeof navigator.userAgent === 'string' &&
        navigator.userAgent.includes('Firefox');

const canWriteText = () => !isFirefox() &&
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    navigator.clipboard.writeText;

const canReadText = () => !isFirefox() &&
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    navigator.clipboard.readText;

/* ------------------------------------------------------------------ */
/* 扩展补充安装                                                        */
/* ------------------------------------------------------------------ */

/** 本次会话里已经询问过的扩展 ID，用户拒绝后不再反复弹窗 */
const askedExtensionIds = new Set();

const confirmLoadExtension = id => {
    const message = id ?
        getFormattedMessage(
            'mw.clipboard.ext-confirm',
            'The copied blocks use the "{id}" extension, which is not loaded. Add it?',
            {id}
        ) :
        getFormattedMessage(
            'mw.clipboard.ext-confirm-unknown',
            'The copied blocks use an extension that is not loaded. Add it?'
        );
    try {
        // eslint-disable-next-line no-alert
        return window.confirm(message);
    } catch (e) {
        return false;
    }
};

const ensureExtensionsLoaded = async (vm, meta) => {
    if (!vm || !vm.extensionManager || !meta) return false;
    const missing = getMissingExtensionDefinitions(vm, meta);
    if (!missing.length) return false;

    let loadedAny = false;
    for (const def of missing) {
        if (!def || !def.id || askedExtensionIds.has(def.id)) continue;
        askedExtensionIds.add(def.id);
        if (!confirmLoadExtension(def.id)) continue;
        const ok = await loadExtensionDefinition(vm, def);
        if (ok) loadedAny = true;
    }
    return loadedAny;
};

/* ------------------------------------------------------------------ */
/* 工作区定位                                                          */
/* ------------------------------------------------------------------ */

const tagWorkspaceSvg = workspace => {
    if (!workspace || typeof workspace.getParentSvg !== 'function') return;
    const svg = workspace.getParentSvg();
    if (svg) svg.__rwWorkspace = workspace;
};

const getWorkspaceAtPoint = (clientX, clientY) => {
    if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return null;
    let el = null;
    try {
        el = document.elementFromPoint(clientX, clientY);
    } catch (e) {
        return null;
    }
    while (el) {
        if (el.tagName === 'svg' && el.__rwWorkspace) return el.__rwWorkspace;
        el = el.parentNode;
    }
    return null;
};

const screenToWorkspace = (workspace, clientX, clientY) => {
    const svg = workspace.getParentSvg();
    const canvas = workspace.getCanvas ? workspace.getCanvas() : svg;
    if (!svg || !canvas || typeof svg.createSVGPoint !== 'function') return {x: 0, y: 0};
    const matrix = canvas.getScreenCTM && canvas.getScreenCTM();
    if (!matrix) return {x: 0, y: 0};
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const local = point.matrixTransform(matrix.inverse());
    return {x: local.x, y: local.y};
};

const setTopLevelPosition = (xmlDom, x, y) => {
    if (!xmlDom) return;
    const children = xmlDom.childNodes || [];
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.nodeType === 1 && child.nodeName.toLowerCase() === 'block') {
            child.setAttribute('x', String(Math.round(x)));
            child.setAttribute('y', String(Math.round(y)));
        }
    }
};

/* ------------------------------------------------------------------ */
/* 拖拽载荷                                                            */
/* ------------------------------------------------------------------ */

const writeDragPayload = (ScratchBlocks, vm, block) => {
    if (!block || !ScratchBlocks.Xml) return;
    try {
        const dom = ScratchBlocks.Xml.blockToDom(block, true);
        const xmlText = ScratchBlocks.Xml.domToText(dom);
        const meta = buildExtensionMetaForXmlDom(vm, dom);
        const text = composePayloadText(xmlText, meta);
        if (!text) return;

        // 跨窗口传输的主通道：localStorage（同源窗口共享，且不受剪贴板权限影响）
        try {
            localStorage.setItem(DRAG_STORAGE_KEY, JSON.stringify({
                text,
                ts: Date.now(),
                from: WINDOW_ID
            }));
        } catch (e) { /* localStorage 不可用时仍然写系统剪贴板 */ }

        if (canWriteText()) {
            navigator.clipboard.writeText(text).catch(() => {});
        }
    } catch (e) {
        /* 序列化失败不影响正常拖拽 */
    }
};

const readDragPayload = () => {
    try {
        const raw = localStorage.getItem(DRAG_STORAGE_KEY);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (!payload || typeof payload.text !== 'string') return null;
        if (!payload.ts || Date.now() - payload.ts > DRAG_PAYLOAD_TTL) return null;
        return payload;
    } catch (e) {
        return null;
    }
};

const clearDragPayload = () => {
    try {
        localStorage.removeItem(DRAG_STORAGE_KEY);
    } catch (e) { /* ignore */ }
};

/* ------------------------------------------------------------------ */
/* 安装                                                                */
/* ------------------------------------------------------------------ */

const installSystemClipboardForBlocks = (ScratchBlocks, vm) => {
    if (!ScratchBlocks || ScratchBlocks.__mistwarpSystemBlocksClipboardInstalled) return;
    ScratchBlocks.__mistwarpSystemBlocksClipboardInstalled = true;

    installExtensionUrlRecorder(vm);

    let readAccessDenied = false;
    let writeAccessDenied = false;

    // 给每个注入出来的工作区 SVG 打标记，跨窗口落点才能找回它的 workspace。
    if (!ScratchBlocks.__rwWorkspaceTagInstalled) {
        ScratchBlocks.__rwWorkspaceTagInstalled = true;
        if (typeof ScratchBlocks.inject === 'function') {
            const originalInject = ScratchBlocks.inject;
            ScratchBlocks.inject = function (...args) {
                const workspace = originalInject.apply(this, args);
                tagWorkspaceSvg(workspace);
                return workspace;
            };
        }
    }

    const serializeClipboardXmlToText = (xml, meta) => {
        if (!ScratchBlocks.Xml || !ScratchBlocks.Xml.domToText) return null;
        if (!xml) return null;

        try {
            // 保留 x/y：粘贴时能落在原来的工作区坐标，与编辑器内部复制行为一致
            const xmlText = ScratchBlocks.Xml.domToText(xml);
            return composePayloadText(xmlText, meta);
        } catch (e) {
            return null;
        }
    };

    const parseClipboardTextToBlockXml = text => {
        if (!ScratchBlocks.Xml || !ScratchBlocks.Xml.textToDom) return null;
        const parsed = parsePayloadText(text);
        if (!parsed.xmlText) return null;
        // 只接受积木 XML，普通文本不劫持粘贴
        if (!/^<xml[\s>]/i.test(parsed.xmlText) && !/^<(?:block|shadow|comment)[\s>]/i.test(parsed.xmlText)) {
            return null;
        }

        try {
            const wrapped = /^<xml[\s>]/i.test(parsed.xmlText) ?
                parsed.xmlText :
                `<xml>${parsed.xmlText}</xml>`;
            const xmlDom = ScratchBlocks.Xml.textToDom(wrapped);
            for (let child = xmlDom.firstChild; child; child = child.nextSibling) {
                if (child.nodeType === 1) return {xml: child, meta: parsed.meta};
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const pasteFromCurrentClipboardXml = () => {
        if (!ScratchBlocks.clipboardXml_) return;
        let workspace = ScratchBlocks.clipboardSource_;
        if (!workspace) workspace = ScratchBlocks.mainWorkspace;
        if (!workspace) return;
        if (workspace.isFlyout) workspace = workspace.targetWorkspace;
        ScratchBlocks.Events.setGroup(true);
        workspace.paste(ScratchBlocks.clipboardXml_);
        ScratchBlocks.Events.setGroup(false);
    };

    /* ---------------- 复制：同时写系统剪贴板 ---------------- */

    const originalCopy = ScratchBlocks.copy_;
    const originalOnKeyDown = ScratchBlocks.onKeyDown_;

    ScratchBlocks.copy_ = function (toCopy, ...args) {
        const result = originalCopy.apply(this, [toCopy, ...args]);

        // 注释不走积木载荷；粘贴正在进行时也不再回写
        if (
            systemClipboardActive ||
            writeAccessDenied ||
            !canWriteText() ||
            !toCopy ||
            (toCopy.isComment === true)
        ) {
            return result;
        }

        const meta = buildExtensionMetaForXmlDom(vm, ScratchBlocks.clipboardXml_);
        ScratchBlocks.__mistwarpSystemClipboardExtensionMeta = meta;
        const text = serializeClipboardXmlToText(ScratchBlocks.clipboardXml_, meta);

        if (text) {
            navigator.clipboard.writeText(text)
                .catch(err => {
                    if (err && err.name === 'NotAllowedError') {
                        writeAccessDenied = true;
                    }
                });
        }

        return result;
    };

    /* ---------------- 粘贴：优先读系统剪贴板 ---------------- */

    ScratchBlocks.onKeyDown_ = function (e) {
        const isPasteShortcut = (e.ctrlKey || e.metaKey) && !e.altKey && e.keyCode === 86;
        if (!isPasteShortcut) {
            return originalOnKeyDown.call(this, e);
        }

        if (!canReadText() || readAccessDenied) {
            return pasteFromCurrentClipboardXml();
        }

        if (!ScratchBlocks.mainWorkspace ||
        ScratchBlocks.mainWorkspace.options.readOnly ||
        ScratchBlocks.utils.isTargetInput(e) ||
        (ScratchBlocks.mainWorkspace.rendered && !ScratchBlocks.mainWorkspace.isVisible()) ||
        ScratchBlocks.mainWorkspace.isDragging()) {
            return;
        }

        systemClipboardActive = true;

        navigator.clipboard.readText()
            .then(async text => {
                const parsed = parseClipboardTextToBlockXml(text);
                if (!parsed || !parsed.xml) {
                    // 系统剪贴板里不是积木：沿用编辑器内部剪贴板
                    systemClipboardActive = false;
                    return pasteFromCurrentClipboardXml();
                }

                const {xml, meta} = parsed;

                ScratchBlocks.clipboardXml_ = xml;
                ScratchBlocks.clipboardSource_ = ScratchBlocks.mainWorkspace;
                ScratchBlocks.__mistwarpSystemClipboardExtensionMeta = meta;

                // 跨编辑器粘贴：先按载荷里的扩展信息补装（会弹窗询问）
                await ensureExtensionsLoaded(vm, meta);

                pasteFromCurrentClipboardXml();
            })
            .catch(err => {
                if (err && err.name === 'NotAllowedError') {
                    readAccessDenied = true;
                }
                pasteFromCurrentClipboardXml();
            })
            .finally(() => {
                systemClipboardActive = false;
            });
    };

    /* ---------------- 拖拽：写剪贴板 + 跨窗口落板 ---------------- */

    const Dragger = ScratchBlocks.BlockDragger;
    /** 本次拖拽的起始工作区：同窗口跨工作区拖拽时用来区分源 / 目标 */
    let dragSourceWorkspace = null;
    if (Dragger && !Dragger.prototype.__rwSystemClipboardPatched) {
        Dragger.prototype.__rwSystemClipboardPatched = true;
        const originalStartDrag = Dragger.prototype.startBlockDrag;
        Dragger.prototype.startBlockDrag = function (...args) {
            const block = this.draggingBlock_;
            dragSourceWorkspace = block && block.workspace ? block.workspace : null;
            let isInsertionMarker = false;
            try {
                isInsertionMarker = !!(block && typeof block.isInsertionMarker === 'function' &&
                    block.isInsertionMarker());
            } catch (e) {
                isInsertionMarker = false;
            }
            if (block && !isInsertionMarker) {
                writeDragPayload(ScratchBlocks, vm, block);
            }
            return originalStartDrag.apply(this, args);
        };
    }

    if (!ScratchBlocks.__rwCrossWindowDropInstalled && typeof document !== 'undefined') {
        ScratchBlocks.__rwCrossWindowDropInstalled = true;

        let pointerDown = null;
        /**
         * 从别的窗口拖进来的状态。有些浏览器在按住鼠标期间会把事件锁在起
         * 始窗口，所以本窗口不一定收得到 pointerup —— 需要靠 move 补判定。
         */
        let foreignDrag = null;

        const getPoint = e => {
            if (e.clientX != null && e.clientY != null) return {x: e.clientX, y: e.clientY};
            if (e.changedTouches && e.changedTouches[0]) {
                return {
                    x: e.changedTouches[0].clientX,
                    y: e.changedTouches[0].clientY
                };
            }
            return null;
        };

        /** 真正落板：读载荷 -> 还原积木 -> 装扩展 -> 粘贴到目标工作区 */
        const finishDrop = (clientX, clientY) => {
            const payload = readDragPayload();
            if (!payload) return;

            const workspace = getWorkspaceAtPoint(clientX, clientY);

            if (payload.from === WINDOW_ID) {
                // 同一窗口内：只有拖到「另一个工作区」（分离出来的积木区）才处理，
                // 否则就是普通拖拽，顺带把载荷清掉，避免它变成陈旧数据。
                if (!workspace || workspace === dragSourceWorkspace) {
                    if (workspace === dragSourceWorkspace) clearDragPayload();
                    return;
                }
            }

            if (!workspace || workspace.isFlyout || (workspace.options && workspace.options.readOnly)) return;

            const parsed = parseClipboardTextToBlockXml(payload.text);
            if (!parsed || !parsed.xml) return;

            clearDragPayload();
            foreignDrag = null;

            const local = screenToWorkspace(workspace, clientX, clientY);
            setTopLevelPosition(parsed.xml, local.x, local.y);

            ensureExtensionsLoaded(vm, parsed.meta).then(() => {
                try {
                    ScratchBlocks.Events.setGroup(true);
                    workspace.paste(parsed.xml);
                } catch (err) {
                    /* 目标工作区已销毁等情况忽略 */
                } finally {
                    ScratchBlocks.Events.setGroup(false);
                }
            });
        };

        const onPointerDown = e => {
            pointerDown = {
                x: e.clientX,
                y: e.clientY,
                ts: Date.now()
            };
        };

        const onPointerMove = e => {
            if (e.buttons) {
                // 按住鼠标进入本窗口：可能是一次跨窗口拖拽
                if (!foreignDrag) {
                    const payload = readDragPayload();
                    if (payload && payload.from !== WINDOW_ID) {
                        foreignDrag = {ts: Date.now()};
                    }
                }
                return;
            }
            // 按键已松开但本窗口没收到 pointerup（事件被起始窗口吞掉）：
            // 鼠标重新回到本窗口时补一次落板。
            if (foreignDrag && Date.now() - foreignDrag.ts < 4000) {
                finishDrop(e.clientX, e.clientY);
            }
        };

        const onPointerUp = e => {
            const down = pointerDown;
            pointerDown = null;

            const point = getPoint(e);
            if (!point) return;

            if (!down) {
                // 拖拽从另一个窗口开始：本窗口没有 pointerdown，直接落板
                if (foreignDrag) finishDrop(point.x, point.y);
                return;
            }

            const distance = Math.hypot(point.x - down.x, point.y - down.y);
            const duration = Date.now() - down.ts;
            if (distance < DRAG_MIN_DISTANCE || duration < DRAG_MIN_DURATION) return;

            finishDrop(point.x, point.y);
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('pointermove', onPointerMove, true);
        document.addEventListener('pointerup', onPointerUp, true);
        // 触摸端兜底：部分浏览器 pointerup 的坐标会被清空
        document.addEventListener('touchend', e => {
            const touch = e.changedTouches && e.changedTouches[0];
            if (!touch) return;
            onPointerUp({clientX: touch.clientX, clientY: touch.clientY});
        }, true);
    }
};

export default installSystemClipboardForBlocks;

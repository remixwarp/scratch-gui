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
    const setOnBlock = node => {
        if (node && node.nodeType === 1 && node.nodeName.toLowerCase() === 'block') {
            node.setAttribute('x', String(Math.round(x)));
            node.setAttribute('y', String(Math.round(y)));
            return true;
        }
        return false;
    };
    // 单个顶层积木：直接给它设坐标；<xml> 包裹时逐个设其下的顶层积木
    if (setOnBlock(xmlDom)) return;
    const children = xmlDom.childNodes || [];
    for (let i = 0; i < children.length; i++) {
        setOnBlock(children[i]);
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
        } catch (e) { /* localStorage 不可用时不影响拖拽 */ }
        // 拖拽不写入系统剪贴板，避免覆盖用户自己的剪贴板内容
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

    // 最近一次「复制积木」写入的载荷，用于右键空白处的粘贴菜单
    let copiedBlockText = null;
    let copiedBlockMeta = null;

    // 给每个注入出来的工作区 SVG 打标记，跨窗口落点才能找回它的 workspace。
    if (!ScratchBlocks.__rwWorkspaceTagInstalled) {
        ScratchBlocks.__rwWorkspaceTagInstalled = true;
        if (typeof ScratchBlocks.inject === 'function') {
            const originalInject = ScratchBlocks.inject;
            const wrappedInject = function (...args) {
                const workspace = originalInject.apply(this, args);
                try {
                    tagWorkspaceSvg(workspace);
                } catch (e) {
                    /* 打标记失败不影响注入 */
                }
                return workspace;
            };
            // scratch-blocks 会把 bindDocumentEvents_ 等挂在 inject 函数自身上，
            // Blockly.init_ 里会调用 Blockly.inject.bindDocumentEvents_()。
            // 直接替换 inject 会让这些属性丢失，导致注入中途抛错、积木盒不出现。
            for (const key of Object.getOwnPropertyNames(originalInject)) {
                if (key === 'length' || key === 'name' || key === 'prototype' || key === 'arguments' || key === 'caller') continue;
                try {
                    wrappedInject[key] = originalInject[key];
                } catch (e) {
                    /* 只读属性忽略 */
                }
            }
            ScratchBlocks.inject = wrappedInject;
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

    /** 记录积木载荷（右键粘贴菜单据此判断剪贴板里是否有积木） */
    const rememberBlockPayload = xml => {
        if (!xml) return null;
        try {
            const meta = buildExtensionMetaForXmlDom(vm, xml);
            const text = serializeClipboardXmlToText(xml, meta);
            if (!text) return null;
            copiedBlockText = text;
            copiedBlockMeta = meta;
            ScratchBlocks.__mistwarpSystemClipboardExtensionMeta = meta;
            return text;
        } catch (e) {
            return null;
        }
    };

    const writeBlocksToSystemClipboard = text => {
        if (!text || writeAccessDenied || !canWriteText()) return;
        navigator.clipboard.writeText(text)
            .catch(err => {
                if (err && err.name === 'NotAllowedError') {
                    writeAccessDenied = true;
                }
            });
    };

    ScratchBlocks.copy_ = function (toCopy, ...args) {
        const result = originalCopy.apply(this, [toCopy, ...args]);

        // 注释不走积木载荷；粘贴正在进行时也不再回写
        if (
            systemClipboardActive ||
            !toCopy ||
            (toCopy.isComment === true)
        ) {
            return result;
        }

        writeBlocksToSystemClipboard(rememberBlockPayload(ScratchBlocks.clipboardXml_));
        return result;
    };

    // 右键积木里的「复制」走 ContextMenu.blockDuplicateOption，
    // 它不经过 copy_，这里在回调里补写一次积木数据
    const BlockContextMenu = ScratchBlocks.ContextMenu;
    if (
        BlockContextMenu &&
        typeof BlockContextMenu.blockDuplicateOption === 'function' &&
        !BlockContextMenu.__rwDuplicateClipboardPatched
    ) {
        BlockContextMenu.__rwDuplicateClipboardPatched = true;
        const originalDuplicateOption = BlockContextMenu.blockDuplicateOption;
        BlockContextMenu.blockDuplicateOption = function (block, event) {
            const option = originalDuplicateOption.call(this, block, event);
            if (!option || typeof option.callback !== 'function' || !block || block.isComment === true) {
                return option;
            }
            const originalCallback = option.callback;
            option.callback = function (...args) {
                try {
                    if (ScratchBlocks.Xml) {
                        writeBlocksToSystemClipboard(
                            rememberBlockPayload(ScratchBlocks.Xml.blockToDom(block, true))
                        );
                    }
                } catch (e) {
                    /* 序列化失败不影响复制 */
                }
                return originalCallback.apply(this, args);
            };
            return option;
        };
    }

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

    /* ---------------- 右键空白处：粘贴积木 ---------------- */

    const WorkspaceSvg = ScratchBlocks.WorkspaceSvg;
    const ContextMenu = ScratchBlocks.ContextMenu;
    if (
        ContextMenu &&
        typeof ContextMenu.show === 'function' &&
        !ContextMenu.__rwBlockPastePatched
    ) {
        ContextMenu.__rwBlockPastePatched = true;

        // 工作区空白处右键时的目标工作区与点击位置
        let workspaceMenuTarget = null;
        if (WorkspaceSvg && typeof WorkspaceSvg.prototype.showContextMenu_ === 'function') {
            const originalWorkspaceContextMenu = WorkspaceSvg.prototype.showContextMenu_;
            WorkspaceSvg.prototype.showContextMenu_ = function (e) {
                workspaceMenuTarget = {
                    workspace: this,
                    point: e && e.clientX != null ? {x: e.clientX, y: e.clientY} : null
                };
                try {
                    return originalWorkspaceContextMenu.call(this, e);
                } finally {
                    workspaceMenuTarget = null;
                }
            };
        }

        const resolveWorkspaceMenuTarget = e => {
            if (workspaceMenuTarget) return workspaceMenuTarget;
            // 兜底：按手势判断是否是空白处右键
            const gesture = ScratchBlocks.mainWorkspace && ScratchBlocks.mainWorkspace.currentGesture_;
            if (
                gesture &&
                !gesture.targetBlock_ &&
                !gesture.flyout_ &&
                !gesture.startBubble_
            ) {
                return {
                    workspace: ScratchBlocks.mainWorkspace,
                    point: e && e.clientX != null ? {x: e.clientX, y: e.clientY} : null
                };
            }
            return null;
        };

        const pasteBlocksFromMenu = (target, event) => {
            const workspace = target && target.workspace;
            if (!workspace) return;

            let parsed = null;
            if (copiedBlockText) parsed = parseClipboardTextToBlockXml(copiedBlockText);
            if (!parsed && ScratchBlocks.clipboardXml_) {
                parsed = {
                    xml: ScratchBlocks.clipboardXml_,
                    meta: copiedBlockMeta || ScratchBlocks.__mistwarpSystemClipboardExtensionMeta
                };
            }
            if (!parsed || !parsed.xml) return;

            const point = (target && target.point) ||
                (event && event.clientX != null ? {x: event.clientX, y: event.clientY} : null);
            if (point) {
                try {
                    const local = screenToWorkspace(workspace, point.x, point.y);
                    setTopLevelPosition(parsed.xml, local.x, local.y);
                } catch (err) {
                    /* 定位失败时按载荷原坐标粘贴 */
                }
            }

            ensureExtensionsLoaded(vm, parsed.meta).then(() => {
                try {
                    ScratchBlocks.Events.setGroup(true);
                    workspace.paste(parsed.xml);
                } catch (err) {
                    /* 工作区已销毁等情况忽略 */
                } finally {
                    ScratchBlocks.Events.setGroup(false);
                }
            });
        };

        const originalContextMenuShow = ContextMenu.show;
        ContextMenu.show = function (e, menuOptions, rtl, opt_workspace) {
            const target = resolveWorkspaceMenuTarget(e);
            if (
                target &&
                menuOptions &&
                (copiedBlockText || ScratchBlocks.clipboardXml_)
            ) {
                menuOptions.push({
                    text: getFormattedMessage('mw.clipboard.paste', '粘贴'),
                    enabled: true,
                    callback: () => pasteBlocksFromMenu(target, e)
                });
            }
            return originalContextMenuShow.apply(this, arguments);
        };
    }

    /* ---------------- 拖拽：跨窗口落板（不写系统剪贴板） ---------------- */

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

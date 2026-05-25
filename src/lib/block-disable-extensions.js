let copyJsCodeExtensionInitialized = false;

/**
 * Default template for #code JS comment (used for workspace-level comments)
 */
const JS_CODE_TEMPLATE = `#code
// 您的 JavaScript 代码
console.log("Hello from JS!");
target.setXY(100, 50);`;

/**
 * Stores the last known right-click event for accurate workspace comment positioning.
 * @type {?MouseEvent}
 */
let lastContextMenuEvent = null;

/**
 * Find the VM target that owns a given block ID.
 * @param {*} vm The Scratch VM instance.
 * @param {string} blockId The block ID.
 * @returns {*|null} The target, or null.
 */
const findTargetForBlock = (vm, blockId) => {
    for (const target of vm.runtime.targets) {
        if (target.blocks.getBlock(blockId)) {
            return target;
        }
    }
    return null;
};

/**
 * Create/update an informational compiled-JS reference comment on the
 * hat block of a chain. Does NOT use #code prefix — that would cause
 * double-wrapping (inner function never called → blocks become no-ops).
 * @param {*} vm The Scratch VM instance.
 * @param {*} scratchBlock The ScratchBlocks block that was right-clicked.
 */
const createJsCodeForBlockChain = (vm, scratchBlock) => {
    // DEFER compilation to avoid blocking the context menu / UI thread.
    // Without setTimeout, vm.getBlockCompiledSource() runs a full synchronous
    // IR + JS compilation which freezes the UI for hundreds of milliseconds.
    setTimeout(() => {
        try {
            const blockId = scratchBlock.id;

            // 1. Find the VM target that owns this block
            const target = findTargetForBlock(vm, blockId);
            if (!target) {
                console.warn('Cannot find target for block:', blockId);
                return;
            }

            // 2. Find the top-level (hat) block of the chain
            const topBlockId = target.blocks.getTopLevelScript(blockId);
            if (!topBlockId) {
                console.warn('Could not find top-level script for block:', blockId);
                return;
            }

            // 3. Get the compiled JS source code for the entire chain
            if (typeof vm.getBlockCompiledSource !== 'function') {
                console.warn('vm.getBlockCompiledSource is not available');
                return;
            }
            const jsCode = vm.getBlockCompiledSource(topBlockId);
            if (!jsCode) {
                console.warn('Could not compile JS source for block chain:', topBlockId);
                if (window.addon && window.addon.tab && window.addon.tab.redux && window.addon.tab.redux.dispatch) {
                    window.addon.tab.redux.dispatch({
                        type: 'alerts/addAlert',
                        message: '无法为此积木链生成 JS 代码（可能不是帽子积木开头）',
                        alertType: 'warn'
                    });
                }
                return;
            }

            // 4. Build the comment text as informational (NOT #code).
            //    #code is designed for user-written JS; storing the
            //    compiled factory string as #code causes double-wrapping:
            //    the 02engine wraps it again → inner function never called
            //    → blocks become a no-op (green flag does nothing).
            //    We store the raw compiled JS as a reference comment so
            //    the block chain still compiles & runs normally.
            const commentText = '/* Compiled JS */\n' + jsCode;

            // 5. Find the ScratchBlocks block for the hat block
            const ScratchBlocks = window.ScratchBlocks || window.Blockly;
            if (!ScratchBlocks || !ScratchBlocks.mainWorkspace) {
                console.warn('ScratchBlocks not available');
                return;
            }

            const hatBlock = ScratchBlocks.mainWorkspace.getBlockById(topBlockId);
            if (!hatBlock) {
                console.warn('Could not find ScratchBlocks hat block for:', topBlockId);
                return;
            }

            // 6. Set the comment text on the hat block (BlockSvg.setCommentText
            //    creates a ScratchBlockComment and makes it visible automatically)
            hatBlock.setCommentText(commentText);

            // Mark project as changed
            vm.runtime.emitProjectChanged();

            console.log('Created compiled-JS reference comment on hat block:', topBlockId, 'for chain containing:', blockId);

            // Informational notification — this is a reference comment,
            // not executable #code (avoids double-wrapping issue)
            if (window.addon && window.addon.tab && window.addon.tab.redux && window.addon.tab.redux.dispatch) {
                window.addon.tab.redux.dispatch({
                    type: 'alerts/addAlert',
                    message: '已为此积木链生成编译参考代码（不影响正常执行）',
                    alertType: 'info'
                });
            }
        } catch (error) {
            console.error('Error creating JS Code for block chain:', error);
        }
    }, 200); // 200ms defer — enough for the context menu to close first
};

/**
 * Create a free-floating workspace comment (not attached to any block)
 * containing the #code template. Uses WorkspaceCommentSvg for rendered
 * SVG workspaces so the comment actually appears on screen.
 * @param {*} vm The Scratch VM instance.
 * @param {?MouseEvent} [optEvent] Optional mouse event for positioning.
 */
const createWorkspaceJsCodeComment = (vm, optEvent) => {
    try {
        const ScratchBlocks = window.ScratchBlocks || window.Blockly;
        if (!ScratchBlocks || !ScratchBlocks.mainWorkspace) {
            console.warn('ScratchBlocks not available for workspace comment');
            return;
        }

        const workspace = ScratchBlocks.mainWorkspace;
        const Blockly = ScratchBlocks;

        // --- Calculate position in workspace coordinates ---
        const event = optEvent || lastContextMenuEvent;
        let commentX = 200;
        let commentY = 200;

        if (event && event.clientX !== undefined) {
            // Use the same positioning logic as Blockly's built-in
            // ContextMenu.workspaceCommentOption
            try {
                const injectionDiv = workspace.getInjectionDiv();
                if (injectionDiv) {
                    const boundingRect = injectionDiv.getBoundingClientRect();
                    const clientOffsetPixels = new goog.math.Coordinate(
                        event.clientX - boundingRect.left,
                        event.clientY - boundingRect.top
                    );
                    const mainOffsetPixels = workspace.getOriginOffsetInPixels();
                    const finalOffsetPixels = goog.math.Coordinate.difference(
                        clientOffsetPixels, mainOffsetPixels
                    );
                    const finalOffsetMainWs = finalOffsetPixels.scale(1 / workspace.scale);
                    commentX = finalOffsetMainWs.x;
                    commentY = finalOffsetMainWs.y;
                }
            } catch (posErr) {
                // Fallback: try gesture position
                try {
                    const gesture = workspace.currentGesture_;
                    if (gesture && typeof gesture.getPosition === 'function') {
                        const mousePos = gesture.getPosition();
                        if (mousePos) {
                            commentX = mousePos.x / workspace.scale;
                            commentY = mousePos.y / workspace.scale;
                        }
                    }
                } catch (e) { /* use default */ }
            }
        } else {
            // No event available — position at center of viewport
            try {
                const scroll = workspace.scrollX !== undefined ? workspace.scrollX : 0;
                const scrollY = workspace.scrollY !== undefined ? workspace.scrollY : 0;
                const w = workspace.getWidth ? workspace.getWidth() : 600;
                const h = workspace.getHeight ? workspace.getHeight() : 400;
                commentX = (w / 2 + scroll) / workspace.scale;
                commentY = (h / 2 + scrollY) / workspace.scale;
            } catch (e) { /* use default */ }
        }

        // --- Use WorkspaceCommentSvg for SVG workspaces ---
        // Blockly.WorkspaceComment is the headless data-model class.
        // Blockly.WorkspaceCommentSvg extends it and adds SVG rendering.
        // The constructor parameters: (workspace, content, height, width, minimized, opt_id)
        const DEFAULT_SIZE = Blockly.WorkspaceCommentSvg.DEFAULT_SIZE || 200;

        // Disable events during creation so we fire only one create event at the end
        const disabled = Blockly.Events.isEnabled();
        if (disabled) {
            Blockly.Events.disable();
        }

        let comment;
        try {
            comment = new Blockly.WorkspaceCommentSvg(
                workspace, JS_CODE_TEMPLATE, DEFAULT_SIZE, DEFAULT_SIZE, false
            );
        } catch (e) {
            // Fallback: try WorkspaceComment (headless)
            comment = new Blockly.WorkspaceComment(
                workspace, JS_CODE_TEMPLATE, DEFAULT_SIZE, DEFAULT_SIZE, false
            );
        }

        comment.moveBy(commentX, commentY);

        if (workspace.rendered) {
            if (typeof comment.initSvg === 'function') {
                comment.initSvg();
            }
            if (typeof comment.render === 'function') {
                comment.render(false);
            }
            if (typeof comment.select === 'function') {
                comment.select();
            }
        }

        if (disabled) {
            Blockly.Events.enable();
        }

        // Fire the create event (matches built-in pattern)
        Blockly.WorkspaceComment.fireCreateEvent(comment);

        // Mark project as changed
        if (vm && vm.runtime && typeof vm.runtime.emitProjectChanged === 'function') {
            vm.runtime.emitProjectChanged();
        }

        console.log('Created workspace JS Code comment at', commentX, commentY);

        if (window.addon && window.addon.tab && window.addon.tab.redux && window.addon.tab.redux.dispatch) {
            window.addon.tab.redux.dispatch({
                type: 'alerts/addAlert',
                message: '已创建 JS Code 工作区注释',
                alertType: 'info'
            });
        }
    } catch (error) {
        console.error('Error creating workspace JS Code comment:', error);
    }
};

const initializeBlockDisableExtension = vm => {
    if (copyJsCodeExtensionInitialized) return;
    copyJsCodeExtensionInitialized = true;

    console.log('Initializing Copy JS Code extension with VM:', vm);

    // ============================================================
    // Capture right-click events for workspace comment positioning
    // ============================================================
    const captureContextMenuEvent = (e) => {
        lastContextMenuEvent = e;
    };
    document.addEventListener('contextmenu', captureContextMenuEvent, true);

    // ============================================================
    // PATH 1: Addons API (preferred)
    // ============================================================
    if (window.addon && window.addon.tab && window.addon.tab.createBlockContextMenu) {
        console.log('Using addons API for context menu');

        // --- Block right-click menu ---
        window.addon.tab.createBlockContextMenu((items, ctx) => {
            const block = ctx && ctx.block ? ctx.block : ctx;
            if (!block || typeof block.getPreviousBlock !== 'function') return items;

            const isHatBlock = !block.getPreviousBlock();

            // "为此积木链创建 JS Code" — for ALL blocks (finds the hat block of the chain)
            items.push({
                enabled: true,
                text: '\u4e3a\u6b64\u79ef\u6728\u94fe\u521b\u5efa JS Code',
                callback: () => {
                    // Defers compilation via setTimeout inside createJsCodeForBlockChain
                    createJsCodeForBlockChain(vm, block);
                },
                separator: false
            });

            // "Copy JS Code" — only for hat blocks
            if (isHatBlock && vm.getBlockCompiledSource) {
                items.push({
                    enabled: true,
                    text: 'Copy JS Code',
                    callback: () => {
                        // Also defer this compilation to avoid UI freeze
                        setTimeout(() => {
                            try {
                                const jsCode = vm.getBlockCompiledSource(block.id);
                                if (jsCode) {
                                    navigator.clipboard.writeText(jsCode).then(() => {
                                        console.log('JavaScript code copied to clipboard:', jsCode);
                                        if (window.addon && window.addon.tab && window.addon.tab.redux && window.addon.tab.redux.dispatch) {
                                            window.addon.tab.redux.dispatch({
                                                type: 'alerts/addAlert',
                                                message: 'JavaScript code copied to clipboard',
                                                alertType: 'info'
                                            });
                                        }
                                    }).catch(err => {
                                        console.error('Failed to copy to clipboard:', err);
                                    });
                                } else {
                                    console.warn('No compiled JavaScript code available for block:', block.id);
                                }
                            } catch (error) {
                                console.error('Error getting compiled JavaScript code:', error);
                            }
                        }, 100);
                    },
                    separator: false
                });
            }

            return items;
        }, {blocks: true});

        // --- Workspace right-click menu ---
        window.addon.tab.createBlockContextMenu((items, block) => {
            // block is null when right-clicking on empty workspace
            if (block) return items;

            items.push({
                enabled: true,
                text: '\u521b\u5efa JS Code',
                callback: () => {
                    // Use captured contextmenu event for accurate position
                    createWorkspaceJsCodeComment(vm, lastContextMenuEvent);
                },
                separator: false
            });

            return items;
        }, {workspace: true});

    } else {
        // ============================================================
        // PATH 2: Fallback — direct Blockly context menu patching
        // ============================================================
        console.warn('Addon API not available, using fallback context menu');

        const ScratchBlocks = window.ScratchBlocks || window.Blockly;
        if (ScratchBlocks && ScratchBlocks.ContextMenu && ScratchBlocks.ContextMenu.show && typeof ScratchBlocks.ContextMenu.show === 'function') {
            console.log('Patching ScratchBlocks.ContextMenu.show');
            const originalShow = ScratchBlocks.ContextMenu.show;
            ScratchBlocks.ContextMenu.show = function (event, items, rtl) {
                // Store event for workspace comment positioning
                if (event) {
                    lastContextMenuEvent = event;
                }

                const gesture = ScratchBlocks.mainWorkspace && ScratchBlocks.mainWorkspace.currentGesture_;
                const block = gesture && gesture.targetBlock_;

                if (block) {
                    // --- Block right-click ---
                    // "为此积木链创建 JS Code" — for ALL blocks
                    items.push({
                        enabled: true,
                        text: '\u4e3a\u6b64\u79ef\u6728\u94fe\u521b\u5efa JS Code',
                        callback: () => {
                            // Defers compilation via setTimeout inside createJsCodeForBlockChain
                            createJsCodeForBlockChain(vm, block);
                        },
                        separator: false
                    });

                    // "Copy JS Code" — only for hat blocks
                    const isHatBlock = !block.getPreviousBlock();
                    if (isHatBlock && vm.getBlockCompiledSource) {
                        items.push({
                            enabled: true,
                            text: 'Copy JS Code',
                            callback: () => {
                                setTimeout(() => {
                                    try {
                                        const jsCode = vm.getBlockCompiledSource(block.id);
                                        if (jsCode) {
                                            navigator.clipboard.writeText(jsCode).then(() => {
                                                console.log('JavaScript code copied to clipboard:', jsCode);
                                            }).catch(err => {
                                                console.error('Failed to copy to clipboard:', err);
                                            });
                                        } else {
                                            console.warn('No compiled JS code available for block:', block.id);
                                            navigator.clipboard.writeText(block.id).catch(() => {});
                                        }
                                    } catch (error) {
                                        console.error('Error getting compiled JavaScript code:', error);
                                    }
                                }, 100);
                            },
                            separator: false
                        });
                    }
                } else {
                    // --- Workspace right-click (no block) ---
                    items.push({
                        enabled: true,
                        text: '\u521b\u5efa JS Code',
                        callback: () => {
                            // event is captured in lastContextMenuEvent above
                            createWorkspaceJsCodeComment(vm, lastContextMenuEvent);
                        },
                        separator: false
                    });
                }

                return originalShow.call(this, event, items, rtl);
            };
        } else {
            console.warn('ScratchBlocks/Blockly not available for context menu patching');
        }
    }
};

export default initializeBlockDisableExtension;

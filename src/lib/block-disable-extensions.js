let copyJsCodeExtensionInitialized = false;

/**
 * Default template for #code JS block comment.
 * When placed on a hat block, the compiler will use this code directly
 * instead of compiling the visual block stack.
 */
const JS_CODE_TEMPLATE = `#code
// 您的 JavaScript 代码写在这里
// 可用变量: target, runtime, stage
// 可用函数: retire() 结束脚本
console.log("Hello from JS!");
retire();
return;`;

/**
 * Create or replace a block comment with the #code template.
 * @param {*} block Blockly BlockSvg instance.
 * @param {*} vm The Scratch VM instance.
 */
const createBlockJsCodeComment = (block, vm) => {
    try {
        if (!block || typeof block.setCommentText !== 'function') {
            console.warn('Block does not support comments');
            return;
        }

        // If the block already has a comment, prepend #code template
        // so existing content isn't lost.
        const existingComment = block.comment;
        if (existingComment && typeof existingComment.getText === 'function') {
            const existingText = existingComment.getText() || '';
            if (!existingText.includes('#code')) {
                block.setCommentText(`${JS_CODE_TEMPLATE}\n\n/* 原有注释 */\n${existingText}`);
            } else {
                // Already has #code, just ensure it's visible
                existingComment.setVisible(true);
            }
        } else {
            block.setCommentText(JS_CODE_TEMPLATE);
        }

        if (vm && vm.runtime && typeof vm.runtime.emitProjectChanged === 'function') {
            vm.runtime.emitProjectChanged();
        }

        console.log('Created #code block comment on block', block.id);

        if (window.addon && window.addon.tab && window.addon.tab.redux && window.addon.tab.redux.dispatch) {
            window.addon.tab.redux.dispatch({
                type: 'alerts/addAlert',
                message: '已在积木上创建 #code 注释（点击积木旁气泡查看）',
                alertType: 'info'
            });
        }
    } catch (error) {
        console.error('Error creating block JS Code comment:', error);
    }
};

const initializeBlockDisableExtension = vm => {
    if (copyJsCodeExtensionInitialized) return;
    copyJsCodeExtensionInitialized = true;

    console.log('Initializing Copy JS Code extension with VM:', vm);

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

            // "Copy JS Code" — only for hat blocks
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

            // "创建 JS Code" — create a #code block comment on the hat block
            if (isHatBlock) {
                items.push({
                    enabled: true,
                    text: '\u521b\u5efa JS Code',
                    callback: () => {
                        createBlockJsCodeComment(block, vm);
                    },
                    separator: false
                });
            }

            return items;
        }, {blocks: true});

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
                const gesture = ScratchBlocks.mainWorkspace && ScratchBlocks.mainWorkspace.currentGesture_;
                const block = gesture && gesture.targetBlock_;

                if (block) {
                    const isHatBlock = !block.getPreviousBlock();

                    // "Copy JS Code" — only for hat blocks
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

                    // "创建 JS Code" — create a #code block comment on the hat block
                    if (isHatBlock) {
                        items.push({
                            enabled: true,
                            text: '\u521b\u5efa JS Code',
                            callback: () => {
                                createBlockJsCodeComment(block, vm);
                            },
                            separator: false
                        });
                    }
                }

                return originalShow.call(this, event, items, rtl);
            };
        } else {
            console.warn('ScratchBlocks/Blockly not available for context menu patching');
        }
    }
};

export default initializeBlockDisableExtension;

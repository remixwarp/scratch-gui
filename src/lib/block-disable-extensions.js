let copyJsCodeExtensionInitialized = false;

const initializeBlockDisableExtension = vm => {
    if (copyJsCodeExtensionInitialized) return;
    copyJsCodeExtensionInitialized = true;

    console.log('Initializing Copy JS Code extension with VM:', vm);
    
    const Blockly = window.Blockly || window.ScratchBlocks;
    if (!Blockly || !Blockly.BlockSvg || !Blockly.BlockSvg.prototype.showContextMenu_) {
        console.warn('Blockly not available, cannot initialize Copy JS Code extension');
        return;
    }

    const originalShowContextMenu = Blockly.BlockSvg.prototype.showContextMenu_;
    Blockly.BlockSvg.prototype.showContextMenu_ = function(e) {
        if (this.workspace.options.readOnly || !this.contextMenu) {
            return originalShowContextMenu.call(this, e);
        }

        const menuOptions = [];
        
        const isHatBlock = !this.getPreviousBlock();
        console.log('Checking Copy JS Code option:', {
            blockId: this.id,
            blockType: this.type,
            isHatBlock: isHatBlock,
            hasGetBlockCompiledSource: !!vm.getBlockCompiledSource
        });

        if (isHatBlock && vm.getBlockCompiledSource) {
            menuOptions.push({
                enabled: true,
                text: 'Copy JS Code',
                callback: () => {
                    try {
                        const jsCode = vm.getBlockCompiledSource(this.id);
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
                            console.warn('No compiled JavaScript code available for block:', this.id);
                        }
                    } catch (error) {
                        console.error('Error getting compiled JavaScript code:', error);
                    }
                },
                separator: true
            });
        }

        if (this.customContextMenu) {
            this.customContextMenu(menuOptions);
        }
        
        Blockly.ContextMenu.show(e, menuOptions, this.RTL);
        Blockly.ContextMenu.currentBlock = this;
    };
};

export default initializeBlockDisableExtension;
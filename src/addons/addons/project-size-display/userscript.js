export default async function ({ addon, console, msg }) {
    const vm = addon.tab.traps.vm;

    let sizeDisplay;
    let handler = null;
    let isLoading = false;

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getProjectSize() {
        try {
            const projectJSON = vm.toJSON();
            const jsonString = typeof projectJSON === 'string' ? projectJSON : JSON.stringify(projectJSON);
            const textEncoder = new TextEncoder();
            return textEncoder.encode(jsonString).length;
        } catch (e) {
            console.warn('[Project Size Display] Failed to calculate project size:', e);
            return 0;
        }
    }

    function getBlockCount() {
        let total = 0;
        
        const targets = vm.runtime.targets || [];
        targets.forEach(target => {
            const sprite = target.sprite || target;
            const blocks = sprite.blocks ? Object.values(sprite.blocks._blocks) : [];
            total += blocks.filter(block => !block.shadow).length;
        });
        
        return total;
    }

    function getSelectedTargetStorageSize() {
        if (!vm.editingTarget) return '-';
        const target = vm.editingTarget;
        if (target.isStage) return '-';
        
        const sprite = target.sprite || target;
        let totalSize = 0;
        
        if (sprite.costumes && Array.isArray(sprite.costumes)) {
            sprite.costumes.forEach(costume => {
                if (costume.asset && costume.asset.data && costume.asset.data.byteLength) {
                    totalSize += costume.asset.data.byteLength;
                }
            });
        }
        
        if (sprite.sounds && Array.isArray(sprite.sounds)) {
            sprite.sounds.forEach(sound => {
                if (sound.asset && sound.asset.data && sound.asset.data.byteLength) {
                    totalSize += sound.asset.data.byteLength;
                }
            });
        }
        
        return totalSize > 0 ? formatFileSize(totalSize) : '-';
    }

    function updateDisplay() {
        if (!sizeDisplay) return;

        try {
            const blockCount = getBlockCount();
            const projectSize = getProjectSize();
            const targetSize = getSelectedTargetStorageSize();

            const blocksText = msg('blocks-count') || '积木数';
            const sizeText = msg('project-size') || '大小';
            
            sizeDisplay.querySelector('.sa-project-size-blocks').innerText = `${blocksText}: ${blockCount}`;
            sizeDisplay.querySelector('.sa-project-size-project').innerText = `${sizeText}: ${targetSize}/${formatFileSize(projectSize)}`;
        } catch (e) {
            console.error('[Project Size Display] Error updating display:', e);
            sizeDisplay.innerText = msg('error');
        }
    }

    async function init() {
        while (true) {
            const scrollWrapper = await addon.tab.waitForElement('[class*="sprite-selector_scroll-wrapper_"]', {
                markAsSeen: true,
                reduxEvents: [
                    "scratch-gui/mode/SET_PLAYER",
                    "fontsLoaded/SET_FONTS_LOADED",
                    "scratch-gui/locales/SELECT_LOCALE"
                ],
                reduxCondition: (state) => !state.scratchGui.mode.isPlayerOnly
            });

            const spriteSelector = scrollWrapper.parentElement;
            
            const existingDisplay = spriteSelector.querySelector('.sa-project-size-display');
            if (existingDisplay) {
                existingDisplay.remove();
            }

            sizeDisplay = document.createElement('div');
            sizeDisplay.className = 'sa-project-size-display';
            addon.tab.displayNoneWhileDisabled(sizeDisplay);

            sizeDisplay.innerHTML = `
                <div class="sa-project-size-blocks"></div>
                <div class="sa-project-size-project"></div>
            `;

            spriteSelector.appendChild(sizeDisplay);

            updateDisplay();

            let debounce;
            if (handler) {
                vm.off("PROJECT_CHANGED", handler);
                vm.runtime.off("PROJECT_LOADED", handler);
            }
            handler = async () => {
                if (isLoading) return;
                clearTimeout(debounce);
                debounce = setTimeout(updateDisplay, 100);
            };
            vm.on("PROJECT_CHANGED", handler);
            vm.runtime.on("PROJECT_LOADED", () => {
                isLoading = false;
                updateDisplay();
            });
            
            if (addon.tab.redux) {
                addon.tab.redux.addEventListener("statechanged", (e) => {
                    const actionType = e.detail.action.type;
                    if (actionType.startsWith("scratch-gui/project-state/") && 
                        (actionType.includes("LOADING") || actionType.includes("START"))) {
                        isLoading = true;
                    }
                });
            }

            await addon.tab.waitForElement('[class*="sprite-selector_scroll-wrapper_"]', {
                markAsSeen: true,
                reduxEvents: ["scratch-gui/mode/SET_PLAYER"],
                reduxCondition: (state) => !state.scratchGui.mode.isPlayerOnly
            });
        }
    }

    if (vm.editingTarget) {
        init();
    } else {
        let timeout = setTimeout(function () {
            init();
            clearTimeout(timeout);
        }, 1000);
    }
}

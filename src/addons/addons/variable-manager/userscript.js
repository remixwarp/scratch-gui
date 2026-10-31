/**
 * 变量管理器（旧版 addon → 已替换为 React 版）
 *
 * 原生窗口实现已被 React 版变量管理器（src/components/variable-manager，
 * 菜单栏 Tools → Variable Manager）完全替换，此文件仅保留舞台头部按钮，
 * 点击时转发到新版弹窗（window.__mistwarpVariableManagerToggle），
 * 避免"新旧两版并存"。
 */
export default async function ({ addon }) {
    // Create the Variable Manager button in the stage header
    const variableManagerButtonOuter = document.createElement('div');
    variableManagerButtonOuter.className = 'sa-variable-manager-container';
    const variableManagerButton = document.createElement('div');
    variableManagerButton.className = addon.tab.scratchClass('button_outlined-button', 'stage-header_stage-button');

    variableManagerButton.style.userSelect = 'none';
    variableManagerButton.style.webkitUserSelect = 'none';
    variableManagerButton.style.mozUserSelect = 'none';
    variableManagerButton.style.msUserSelect = 'none';

    const variableManagerButtonContent = document.createElement('div');
    variableManagerButtonContent.className = addon.tab.scratchClass('button_content');

    let svgContent = addon.self.getResource('/icon.svg');
    svgContent = svgContent.replace(/currentColor/g, 'var(--text-primary)');

    const variableManagerButtonImage = document.createElement('div');
    variableManagerButtonImage.className = addon.tab.scratchClass('stage-header_stage-button-icon');
    variableManagerButtonImage.draggable = false;
    variableManagerButtonImage.style.width = '20px';
    variableManagerButtonImage.style.height = '20px';
    variableManagerButtonImage.innerHTML = svgContent;
    variableManagerButtonContent.appendChild(variableManagerButtonImage);
    variableManagerButton.appendChild(variableManagerButtonContent);
    variableManagerButtonOuter.appendChild(variableManagerButton);

    const toggle = () => {
        if (typeof window.__mistwarpVariableManagerToggle === 'function') {
            window.__mistwarpVariableManagerToggle();
        }
    };
    variableManagerButton.addEventListener('click', toggle);

    // Wait for the stage header to load and add our button next to the debugger
    while (true) {
        await addon.tab.waitForElement(
            '[class^="stage-header_stage-size-row"], [class^="stage-header_fullscreen-buttons-row_"]',
            {
                markAsSeen: true,
                reduxEvents: [
                    'scratch-gui/mode/SET_PLAYER',
                    'scratch-gui/mode/SET_FULL_SCREEN',
                    'fontsLoaded/SET_FONTS_LOADED',
                    'scratch-gui/locales/SELECT_LOCALE'
                ],
                reduxCondition: state => !state.scratchGui.mode.isPlayerOnly
            }
        );

        if (addon.tab.editorMode === 'editor') {
            addon.tab.appendToSharedSpace({
                space: 'stageHeader',
                element: variableManagerButtonOuter,
                order: 1
            });
        } else {
            variableManagerButtonOuter.remove();
        }
    }
}

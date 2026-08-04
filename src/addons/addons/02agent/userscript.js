import React from 'react';
import ReactDOM from 'react-dom';
import Agent, { registerSettingsWindow, registerUpdateSettingsWindow } from './index.tsx';
import { createSettingsWindow, updateSettingsWindow } from './components/SettingsWindow.tsx';

const AgentHost = ({addonApi, windowWidth, windowHeight}) => {
    const addon = addonApi.addon;
    const msg = addonApi.msg;
    const vm = addon.tab.traps.vm;
    const [workspace, setWorkspace] = React.useState(() => addon.tab.traps.getWorkspace() || null);
    const getEditorThemeMode = React.useCallback(() => {
        const theme = addon.tab.redux?.state?.scratchGui?.theme?.theme;
        return typeof theme?.isDark === 'function' && theme.isDark() ? 'dark' : 'light';
    }, [addon]);
    const [editorThemeMode, setEditorThemeMode] = React.useState(getEditorThemeMode);

    React.useEffect(() => {
        let disposed = false;
        addon.tab.traps.getBlockly().then(ScratchBlocks => {
            if (disposed) return;
            if (!window.Blockly) {
                window.Blockly = ScratchBlocks;
            }
            if (!window.ScratchBlocks) {
                window.ScratchBlocks = ScratchBlocks;
            }
            setWorkspace(addon.tab.traps.getWorkspace() || ScratchBlocks.getMainWorkspace?.() || null);
        }).catch(error => {
            console.error('[Bilup Nova] Failed to initialize Blockly hooks', error);
        });
        return () => {
            disposed = true;
        };
    }, [addon]);

    React.useEffect(() => {
        const redux = addon.tab.redux;
        if (!redux) return undefined;
        redux.initialize?.();
        const handleStateChanged = () => setEditorThemeMode(getEditorThemeMode());
        redux.addEventListener?.('statechanged', handleStateChanged);
        handleStateChanged();
        return () => redux.removeEventListener?.('statechanged', handleStateChanged);
    }, [addon, getEditorThemeMode]);

    return <Agent vm={vm} workspace={workspace} editorThemeMode={editorThemeMode} windowWidth={windowWidth} windowHeight={windowHeight} msg={msg} />;
};

let agentWindow = null;
let hostElement = null;
let WindowManager = null;

const initWindowManager = async () => {
    if (WindowManager) return WindowManager;

    try {
        const windowManagerModule = await import('../../window-system/window-manager.js');
        WindowManager = windowManagerModule.default;
        return WindowManager;
    } catch (e) {
        console.warn('[Bilup Nova] Could not load window manager:', e);
        return null;
    }
};

const createAgentWindow = async (addonApi) => {
    if (agentWindow && agentWindow.isVisible) {
        agentWindow.show().bringToFront();
        return;
    }

    const WM = await initWindowManager();
    if (!WM) {
        console.error('[Bilup Nova] Window manager not available');
        return;
    }

    const initialX = Math.max(24, Math.min(window.innerWidth - 824, 50));
    const initialY = Math.max(24, Math.min(window.innerHeight - 624, 50));

    hostElement = document.createElement('div');
    hostElement.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;

    agentWindow = WM.createWindow({
        id: 'nova-agent',
        title: 'Bilup Nova',
        width: 800,
        height: 600,
        minWidth: 400,
        minHeight: 300,
        maxWidth: Math.min(window.innerWidth * 0.9, 1400),
        maxHeight: Math.min(window.innerHeight * 0.9, 1000),
        className: 'sa-nova-agent-window',
        x: initialX,
        y: initialY,
        onClose: () => {
            if (hostElement) {
                ReactDOM.unmountComponentAtNode(hostElement);
                hostElement = null;
            }
            agentWindow = null;
        },
        onResize: (width, height) => {
            if (hostElement) {
                ReactDOM.render(
                    <AgentHost addonApi={addonApi} windowWidth={width} windowHeight={height} />,
                    hostElement
                );
            }
        }
    });

    ReactDOM.render(
        <AgentHost addonApi={addonApi} windowWidth={800} windowHeight={600} />,
        hostElement
    );

    agentWindow.setContent(hostElement);
    agentWindow.show();
};

export default async ({addon, msg}) => {
    const vm = addon.tab.traps.vm;
    if (!vm) {
        console.warn('[Bilup Nova] VM is not ready, skipping mount');
        return;
    }

    registerSettingsWindow(createSettingsWindow);
    registerUpdateSettingsWindow(updateSettingsWindow);

    let agentButton = null;

    while (true) {
        const elem = await addon.tab
            .waitForElement('div[class*="menu-bar_file-group"] > div:last-child:not(.sa-nova)', {
                markAsSeen: true,
                reduxEvents: [
                    'scratch-gui/mode/SET_PLAYER',
                    'fontsLoaded/SET_FONTS_LOADED',
                    'scratch-gui/locales/SELECT_LOCALE'
                ]
            });

        if (!agentButton) {
            agentButton = Object.assign(document.createElement('div'), {
                className: `sa-nova ${elem.className}`
            });

            agentButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot-message-square-icon lucide-bot-message-square"><path d="M12 6V2H8"/><path d="M15 11v2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M9 11v2"/></svg>
                <span>Bilup Nova</span>
            `;

            agentButton.addEventListener('click', async () => {
                await createAgentWindow({addon, msg});
            });
        }

        elem.parentElement.appendChild(agentButton);
    }
};

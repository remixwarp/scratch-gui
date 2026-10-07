import React from 'react';
import ReactDOM from 'react-dom';

import ConsoleWindow from '../../components/mw-panels/console-window.jsx';
import WindowManager from '../../addons/window-system/window-manager';

let terminalWindow = null;
let container = null;

const getLocale = () => {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const locale = store.getState().locales && store.getState().locales.locale;
            if (locale) return locale;
        }
    } catch (e) {
        // ignore
    }
    return 'en';
};

const openFractchTerminalWindow = () => {
    if (terminalWindow) {
        terminalWindow.show().bringToFront();
        return;
    }

    container = document.createElement('div');
    container.style.cssText = 'height: 100%; display: flex; flex-direction: column; min-height: 0;';

    terminalWindow = WindowManager.createWindow({
        id: 'mw-fractch-terminal-window',
        title: getLocale() === 'zh-cn' ? '终端' : 'Terminal',
        width: 640,
        height: 430,
        minWidth: 360,
        minHeight: 200,
        className: 'mw-fractch-terminal-window',
        onClose: () => {
            if (container) ReactDOM.unmountComponentAtNode(container);
            terminalWindow = null;
            container = null;
        }
    });

    terminalWindow.setContent(container);

    // 工具菜单的「终端」窗口显示与多工作区「控制台」一致的运行时日志
    ReactDOM.render(
        React.createElement(ConsoleWindow, {locale: getLocale()}),
        container
    );

    terminalWindow.center();
    terminalWindow.show();
};

export default openFractchTerminalWindow;

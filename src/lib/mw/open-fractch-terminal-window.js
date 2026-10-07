import React from 'react';
import ReactDOM from 'react-dom';

import TerminalPanel from '../../components/mw-panels/terminal-panel.jsx';
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

// 工具菜单的「终端」按钮：打开一个交互式终端窗口（带命令行），
// 支持查看/编辑当前作品文件（模仿超级重构读取项目文件并修改应用）。
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

    ReactDOM.render(
        React.createElement(TerminalPanel),
        container
    );

    terminalWindow.center();
    terminalWindow.show();
};

export default openFractchTerminalWindow;

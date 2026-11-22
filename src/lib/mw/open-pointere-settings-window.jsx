/**
 * PointerE 设置自由窗口（对标编辑器现有的自由窗口行为）。
 *
 *   import openPointereSettingsWindow from './mw/open-pointere-settings-window.jsx';
 *   openPointereSettingsWindow();
 */

import React from 'react';
import ReactDOM from 'react-dom';

import WindowManager from '../../addons/window-system/window-manager.js';
import PointereSettingsPanel from '../../components/pointere/pointere-settings-panel.jsx';

const getLocale = () => {
    try {
        const state = window.ReduxStore && window.ReduxStore.getState && window.ReduxStore.getState();
        return state && state.locales && state.locales.locale || 'zh-cn';
    } catch (e) {
        return 'zh-cn';
    }
};

let openWin = null;
const WIN_ID = 'pointere-settings';

const openPointereSettingsWindow = () => {
    if (openWin) {
        openWin.show().bringToFront();
        return openWin;
    }

    const container = document.createElement('div');
    container.style.cssText = 'height:100%;display:flex;flex-direction:column;min-height:0;overflow:hidden;';

    openWin = WindowManager.createWindow({
        id: WIN_ID,
        title: 'PointerE 设置',
        width: 560,
        height: 620,
        minWidth: 460,
        minHeight: 460,
        onClose: () => {
            setTimeout(() => {
                ReactDOM.unmountComponentAtNode(container);
                openWin = null;
            }, 220);
        }
    });

    openWin.setContent(container);
    ReactDOM.render(<PointereSettingsPanel locale={getLocale()} />, container);
    openWin.center();
    openWin.show();
    return openWin;
};

export default openPointereSettingsWindow;

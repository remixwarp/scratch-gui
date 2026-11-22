/**
 * PointerE 设置自由窗口（对标编辑器现有的自由窗口行为）。
 *
 * 账号设置与协作设置是两套独立窗口，WIN_ID 不同，可同时打开：
 *   openPointereSettingsWindow('account');  // 账号/登录设置
 *   openPointereSettingsWindow('collab');   // 协作设置
 *   openPointereSettingsWindow();           // 默认账号设置
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

const SECTIONS = {
    account: {id: 'pointere-account-settings', title: 'PointerE 账号设置'},
    collab: {id: 'pointere-collab-settings', title: 'PointerE 协作设置'}
};

const openWins = {account: null, collab: null};

const openPointereSettingsWindow = (section = 'account') => {
    const key = SECTIONS[section] ? section : 'account';
    const meta = SECTIONS[key];

    if (openWins[key]) {
        openWins[key].show().bringToFront();
        return openWins[key];
    }

    const container = document.createElement('div');
    container.style.cssText = 'height:100%;display:flex;flex-direction:column;min-height:0;overflow:hidden;';

    openWins[key] = WindowManager.createWindow({
        id: meta.id,
        title: meta.title,
        width: 560,
        height: 560,
        minWidth: 440,
        minHeight: 420,
        onClose: () => {
            setTimeout(() => {
                ReactDOM.unmountComponentAtNode(container);
                openWins[key] = null;
            }, 220);
        }
    });

    openWins[key].setContent(container);
    ReactDOM.render(
        <PointereSettingsPanel section={key} locale={getLocale()} />,
        container
    );
    openWins[key].center();
    openWins[key].show();
    return openWins[key];
};

export default openPointereSettingsWindow;

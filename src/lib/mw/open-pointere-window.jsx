/**
 * PointerE 账号自由窗口。
 *
 *   import openPointereWindow from './mw/open-pointere-window.jsx';
 *   openPointereWindow({tab: 'room'});   // account | room | chat
 *
 * 打开时顺带消费 OAuth 回调参数（?code=&state=），无需新增路由。
 */

import React from 'react';
import ReactDOM from 'react-dom';

import WindowManager from '../../addons/window-system/window-manager.js';
import showAlert from '../../addons/window-system/alert.js';
import PointerePanel from '../../components/pointere/pointere-panel.jsx';
import openPointereSettingsWindow from './open-pointere-settings-window.jsx';
import {handleCallback} from '../pointere/auth.js';

const getLocale = () => {
    try {
        const state = window.ReduxStore && window.ReduxStore.getState && window.ReduxStore.getState();
        return state && state.locales && state.locales.locale || 'zh-cn';
    } catch (e) {
        return 'zh-cn';
    }
};

let openWin = null;
const WIN_ID = 'pointere-account';

const openPointereWindow = (opts = {}) => {
    // OAuth 回调幂等处理：没有 code/state 时立即返回 false
    handleCallback().catch(error => {
        showAlert(error && error.message ? error.message : String(error));
    });

    if (openWin) {
        openWin.show().bringToFront();
        if (opts.tab && openWin._pointerePanelRef && typeof openWin._pointerePanelRef.switchTab === 'function') {
            openWin._pointerePanelRef.switchTab(opts.tab);
        }
        return openWin;
    }

    const container = document.createElement('div');
    container.style.cssText = 'height:100%;display:flex;flex-direction:column;min-height:0;overflow:hidden;';

    openWin = WindowManager.createWindow({
        id: WIN_ID,
        title: 'PointerE',
        width: 660,
        height: 620,
        minWidth: 520,
        minHeight: 480,
        onClose: () => {
            setTimeout(() => {
                ReactDOM.unmountComponentAtNode(container);
                openWin = null;
            }, 220);
        }
    });

    openWin.setContent(container);
    ReactDOM.render(
        <PointerePanel
            initialTab={opts.tab || null}
            locale={getLocale()}
            onOpenSettings={() => openPointereSettingsWindow()}
            onTabChange={tab => { openWin._pointereTab = tab; }}
            _onRef={ref => { openWin._pointerePanelRef = ref; }}
        />,
        container
    );

    if (opts.tab && openWin._pointerePanelRef) openWin._pointerePanelRef.switchTab(opts.tab);
    openWin.center();
    openWin.show();
    return openWin;
};

export default openPointereWindow;

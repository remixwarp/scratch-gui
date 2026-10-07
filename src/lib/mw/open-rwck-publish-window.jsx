/**
 * 创客次元发布窗口。用法：
 *   import openRwckPublishWindow from './mw/open-rwck-publish-window.js';
 *   openRwckPublishWindow({ tab: 'community' });     // 可选：打开就切到 community Tab
 *   openRwckPublishWindow();                          // 默认：已登录 → publish，未登录 → login
 *
 * 自动：复用 WindowManager、读取编辑器主题色、自动读取当前 vm 导出 sb3、
 *       先警告弹窗再登录再发布、错误 Toast。
 *
 * 警告弹窗**只在用户真正点击「发布作品 / 发帖」按钮时弹**。
 * openRwckPublishWindow() 本身不再打断窗口打开。
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {addLocaleData, IntlProvider} from 'react-intl';
import {localeData} from '@remixwarp/scratch-l10n';

import WindowManager from '../../addons/window-system/window-manager';
import IntlBridge from '../tw-use-intl.jsx';
import getEditorColors, {subscribeThemeChange} from '../rwck/theme-colors.js';
import RwckPublishPanel from '../rwck/rwck-publish-panel.jsx';

addLocaleData(localeData);

let openWin = null;
const WIN_ID = 'rwck-publish';

const RWCK_TERMS = [
    '上传即视为您的作品同意被别人下载。',
    '上传至创客次元社区后，创客次元无法绝对保证您的作品不被别人下载或改编。',
    '请在发布前确认作品内容符合平台社区公约。'
].join('\n');

function getIntlProps() {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const state = store.getState();
            const {locale, messages} = state.locales;
            if (locale && messages) return {locale, messages};
        }
    } catch (_) {}
    return null;
}

function readVm() {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const state = store.getState();
            return state.scratchGui && state.scratchGui.vm;
        }
    } catch (_) {}
    return null;
}

/**
 * 打开创客次元发布窗口。
 * @param {object} [opts]
 * @param {string} [opts.tab]  直接打开到哪个 Tab：login | community | publish | disc | mine
 */
const openRwckPublishWindow = (opts = {}) => {
    const {tab} = opts;

    // 如果窗口已经开着：如果请求了不同的 tab，也需要重建（panel 现在没有 switchTab API），
    // 简单处理：每次 close 再重建都能生效。为了不打扰用户——如果已经在前台了，只改 tab。
    if (openWin) {
        openWin.show().bringToFront();
        if (tab && openWin._rwckPanelRef && typeof openWin._rwckPanelRef._rwckSwitchTab === 'function') {
            openWin._rwckPanelRef._rwckSwitchTab(tab);
        }
        return openWin;
    }

    const intlProps = getIntlProps();

    const container = document.createElement('div');
    container.style.cssText = 'height:100%;display:flex;flex-direction:column;min-height:0;overflow:auto;';

    const title = intlProps
        ? intlProps.messages['gui.rwck.publishWindow.title'] || '发布到创客次元'
        : '发布到创客次元';

    let unsubscribeTheme = null;

    openWin = WindowManager.createWindow({
        id: WIN_ID,
        title,
        width: 640,
        height: 640,
        minWidth: 520,
        minHeight: 520,
        onClose: () => {
            if (unsubscribeTheme) unsubscribeTheme();
            unsubscribeTheme = null;
            setTimeout(() => {
                ReactDOM.unmountComponentAtNode(container);
                openWin = null;
            }, 220);
        }
    });

    openWin.setContent(container);

    /** 用给定色板（重）渲染面板。ReactDOM.render 到同一容器会保留组件 state。 */
    const renderPanel = colors => {
        const panelProps = {
            colors,
            intl: intlProps,
            getVm: readVm,
            terms: RWCK_TERMS,
            initialTab: tab || null,
            onRequestClose: () => openWin && openWin.close(),
            // 把面板实例挂到窗口上，便于「窗口已打开时切换 Tab」（见下方 openWin 复用逻辑）
            _onRef: ref => { openWin._rwckPanelRef = ref; }
        };

        const panel = React.createElement(RwckPublishPanel, panelProps);
        const node = intlProps
            ? React.createElement(IntlProvider, {locale: intlProps.locale, messages: intlProps.messages},
                  React.createElement(IntlBridge, null, panel))
            : panel;

        ReactDOM.render(node, container);
    };

    renderPanel(getEditorColors());
    // 用户在编辑器里切换主题 / 强调色时，窗口配色跟着更新
    unsubscribeTheme = subscribeThemeChange(next => renderPanel(next));

    openWin.center();
    openWin.show();
    return openWin;
};

export default openRwckPublishWindow;

/**
 * 创客次元发布窗口。用法：
 *   import openRwckPublishWindow from './mw/open-rwck-publish-window.js';
 *   openRwckPublishWindow();
 *
 * 自动：复用 WindowManager、读取编辑器主题色、自动读取当前 vm 导出 sb3、
 *       先警告弹窗再登录再发布、错误 Toast。
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {addLocaleData, IntlProvider} from 'react-intl';
import {localeData} from '@remixwarp/scratch-l10n';

import WindowManager from '../../addons/window-system/window-manager';
import IntlBridge from '../tw-use-intl.jsx';
import rwck from '../rwck/api-client.js';
import getEditorColors from '../rwck/theme-colors.js';
import RwckPublishPanel from '../rwck/rwck-publish-panel.jsx';

addLocaleData(localeData);

let openWin = null;
const WIN_ID = 'rwck-publish';

const RWCK_TERMS = [
    '上传即视为您的作品同意被别人下载。',
    '上传至创客次元社区后，创客次元无法绝对保证您的作品不被别人下载或改编。',
    '请在发布前确认作品内容符合平台社区公约。'
].join('\n');

function warnBeforeUpload(colors, intl) {
    const ok = window.confirm(RWCK_TERMS + '\n\n' +
        (intl ? intl.formatMessage({
            id: 'rwck.publish.terms.confirm',
            defaultMessage: '点“确定”即表示您已阅读并同意以上条款。'
        }) : '点“确定”即表示您已阅读并同意以上条款。'));
    return ok;
}

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
    // scratch-gui 把 VM 挂在 ReduxStore.getState().scratchGui.vm
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const state = store.getState();
            return state.scratchGui && state.scratchGui.vm;
        }
    } catch (_) {}
    return null;
}

const openRwckPublishWindow = () => {
    if (openWin) {
        openWin.show().bringToFront();
        return openWin;
    }

    // 先弹警告（不用 React Modal，简单 confirm 足够，且不会阻塞后续流程）
    // 注意：警告是每次"打开发布窗口"都弹一次——上传有不可逆性，宁可多一次提醒。
    // 但为了不打扰，我们让用户可以在首次弹窗里勾选"今天不再提示"。
    const alreadyAgreed = sessionStorage.getItem('rwck:terms-agreed-today');
    if (!alreadyAgreed) {
        const accepted = window.confirm(
            '【创客次元上传须知】\n\n' + RWCK_TERMS + '\n\n' +
            '点“确定”即表示您已阅读并同意以上条款。\n' +
            '（下次打开前若仍想再看一次，请刷新页面）'
        );
        if (!accepted) return null;
        sessionStorage.setItem('rwck:terms-agreed-today', '1');
    }

    const colors = getEditorColors();
    const intlProps = getIntlProps();

    const container = document.createElement('div');
    container.style.cssText = 'height:100%;display:flex;flex-direction:column;min-height:0;overflow:auto;';

    const title = intlProps
        ? intlProps.messages['gui.rwck.publishWindow.title'] || '发布到创客次元'
        : '发布到创客次元';

    openWin = WindowManager.createWindow({
        id: WIN_ID,
        title,
        width: 640,
        height: 640,
        minWidth: 520,
        minHeight: 520,
        onClose: () => {
            setTimeout(() => {
                ReactDOM.unmountComponentAtNode(container);
                openWin = null;
            }, 220);
        }
    });

    openWin.setContent(container);

    const panel = React.createElement(RwckPublishPanel, {
        colors,
        intl: intlProps,
        getVm: readVm,
        onRequestClose: () => openWin && openWin.close()
    });
    const node = intlProps
        ? React.createElement(IntlProvider, {locale: intlProps.locale, messages: intlProps.messages},
              React.createElement(IntlBridge, null, panel))
        : panel;

    ReactDOM.render(node, container);
    openWin.center();
    openWin.show();
    return openWin;
};

export default openRwckPublishWindow;
export {warnBeforeUpload};

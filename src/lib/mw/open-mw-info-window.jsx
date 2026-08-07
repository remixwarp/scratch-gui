import React from 'react';
import ReactDOM from 'react-dom';
import {IntlProvider} from 'react-intl';

import WindowManager from '../../addons/window-system/window-manager';
import IntlBridge from '../tw-use-intl.jsx';
import InfoWindow from '../../components/mw-info-modal/info-window.jsx';

let openWindow = null;
let openContainer = null;

const getEditorIntlProps = () => {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const state = store.getState();
            const {locale, messages} = state.locales;
            if (locale && messages) {
                return {locale, messages};
            }
        }
    } catch (e) {
        // ignore
    }
    return null;
};

const openRemixWarpInfoWindow = () => {
    // If a window is already open, just bring it to the front.
    if (openWindow) {
        if (typeof openWindow.show === 'function') openWindow.show();
        if (typeof openWindow.bringToFront === 'function') openWindow.bringToFront();
        return openWindow;
    }

    const container = document.createElement('div');
    container.style.cssText = 'height: 100%; width: 100%; overflow: auto;';

    const intlProps = getEditorIntlProps();
    const element = intlProps ? (
        <IntlProvider
            locale={intlProps.locale}
            messages={intlProps.messages}
        >
            <IntlBridge>
                <InfoWindow />
            </IntlBridge>
        </IntlProvider>
    ) : (
        <InfoWindow />
    );
    ReactDOM.render(element, container);

    // Determine the title based on current locale
    let title = 'RemixWarp Info';
    if (intlProps && intlProps.locale) {
        const locale = intlProps.locale.toLowerCase();
        if (locale.startsWith('zh')) {
            title = 'RemixWarp 说明';
        }
    }

    openWindow = WindowManager.createWindow({
        id: 'mw-info-window',
        title,
        width: 520,
        height: 460,
        minWidth: 360,
        minHeight: 300,
        onClose: () => {
            if (openContainer) {
                ReactDOM.unmountComponentAtNode(openContainer);
                openContainer.remove();
                openContainer = null;
            }
            openWindow = null;
        }
    });

    openContainer = container;
    if (typeof openWindow.setContent === 'function') {
        openWindow.setContent(container);
    }
    if (typeof openWindow.center === 'function') openWindow.center();
    if (typeof openWindow.show === 'function') openWindow.show();

    return openWindow;
};

export default openRemixWarpInfoWindow;

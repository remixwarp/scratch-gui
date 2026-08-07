import React from 'react';
import ReactDOM from 'react-dom';
import {addLocaleData, IntlProvider} from 'react-intl';
import {localeData} from '@remixwarp/scratch-l10n';

import WindowManager from '../../addons/window-system/window-manager';
import CommunityScope from './community-scope.jsx';
import IntlBridge from '../tw-use-intl.jsx';
import communityTranslations from '../../community/translations/zh-cn.json';

addLocaleData(localeData);

const openWindows = new Map();

// Build Intl props for community windows opened inside the editor. The editor
// redux store only contains editor messages, so merge in the community site
// translations (zh-cn.json) to localize pages like My Stuff and Notifications.
const getCommunityIntlProps = () => {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const state = store.getState();
            const {locale, messages} = state.locales;
            if (locale && messages) {
                const merged = Object.assign({}, messages);
                const toMixIn = communityTranslations[locale.toLowerCase()];
                if (toMixIn) {
                    Object.assign(merged, toMixIn);
                }
                return {locale, messages: merged};
            }
        }
    } catch (e) {
        // ignore
    }
    return null;
};

const openMistWarpCommunityWindow = ({id, title, initialPath, element, width = 940, height = 640}) => {
    const existing = openWindows.get(id);
    if (existing) {
        existing.show().bringToFront();
        return existing;
    }

    const container = document.createElement('div');
    container.style.cssText = 'height: 100%; display: flex; flex-direction: column; min-height: 0; overflow: auto;';

    const win = WindowManager.createWindow({
        id,
        title,
        width,
        height,
        minWidth: 480,
        minHeight: 400,
        onClose: () => {
            ReactDOM.unmountComponentAtNode(container);
            openWindows.delete(id);
        }
    });

    win.setContent(container);
    const intlProps = getCommunityIntlProps();
    ReactDOM.render(
        intlProps ? (
            <IntlProvider
                locale={intlProps.locale}
                messages={intlProps.messages}
            >
                <IntlBridge>
                    <CommunityScope
                        initialPath={initialPath}
                        linksInNewTab
                    >
                        {element}
                    </CommunityScope>
                </IntlBridge>
            </IntlProvider>
        ) : (
            <CommunityScope
                initialPath={initialPath}
                linksInNewTab
            >
                {element}
            </CommunityScope>
        ),
        container
    );
    win.center();
    win.show();
    openWindows.set(id, win);
    return win;
};

export default openMistWarpCommunityWindow;

import {addLocaleData} from 'react-intl';

import {localeData, isRtl} from '@remixwarp/scratch-l10n';
import editorMessages from '@remixwarp/scratch-l10n/locales/editor-msgs';
import addAdditionalTranslations from '../lib/tw-translations/index.js';

import {LANGUAGE_KEY} from '../lib/utils/detect-locale.js';

addAdditionalTranslations(editorMessages);
addLocaleData(localeData);

const UPDATE_LOCALES = 'scratch-gui/locales/UPDATE_LOCALES';
const SELECT_LOCALE = 'scratch-gui/locales/SELECT_LOCALE';

// 将嵌套的翻译对象拍平成点号分隔的扁平键（如 {pen: {categoryName: '画笔'}} → {'pen.categoryName': '画笔'}）。
// 某些翻译源可能把分类名以嵌套对象形式提供（如 messages.pen），而 Blocks 组件要求 messages 为
// objectOf(string)，嵌套对象会触发 "messages.pen.categoryName is object" 的 propType 警告。拍平后即可消除。
const flattenMessages = (obj, prefix = '') => {
    const result = {};
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenMessages(value, newKey));
        } else {
            result[newKey] = value;
        }
    }
    return result;
};

const initialState = {
    isRtl: false,
    locale: 'en',
    messagesByLocale: editorMessages,
    messages: flattenMessages(editorMessages.en)
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SELECT_LOCALE:
        return Object.assign({}, state, {
            isRtl: isRtl(action.locale),
            locale: action.locale,
            messagesByLocale: state.messagesByLocale,
            messages: flattenMessages(state.messagesByLocale[action.locale])
        });
    case UPDATE_LOCALES:
        return Object.assign({}, state, {
            isRtl: state.isRtl,
            locale: state.locale,
            messagesByLocale: action.messagesByLocale,
            messages: flattenMessages(action.messagesByLocale[state.locale])
        });
    default:
        return state;
    }
};

const selectLocale = function (locale) {
    // tw: store language in localStorage
    try {
        localStorage.setItem(LANGUAGE_KEY, locale);
    } catch (e) { /* ignore */ }
    return {
        type: SELECT_LOCALE,
        locale: locale
    };
};

const setLocales = function (localesMessages) {
    return {
        type: UPDATE_LOCALES,
        messagesByLocale: localesMessages
    };
};
const initLocale = function (currentState, locale) {
    if (Object.prototype.hasOwnProperty.call(currentState.messagesByLocale, locale)) {
        return Object.assign(
            {},
            currentState,
            {
                isRtl: isRtl(locale),
                locale: locale,
                messagesByLocale: currentState.messagesByLocale,
                messages: flattenMessages(currentState.messagesByLocale[locale])
            }
        );
    }
    // don't change locale if it's not in the current messages
    return currentState;
};
export {
    reducer as default,
    initialState as localesInitialState,
    initLocale,
    selectLocale,
    setLocales
};

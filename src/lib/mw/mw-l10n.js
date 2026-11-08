/**
 * 轻量 UI 文案本地化辅助（用于未接入 react-intl 的界面/自由窗口/插件）。
 *
 * 用法：
 *   import {makeT} from '../../lib/mw/mw-l10n.js';
 *   const t = makeT({myKey: {en: 'Hello', 'zh-cn': '你好', geng: '你好嗷', wenyan: '君好'}});
 *   t('myKey', '默认文案');
 *
 * 当前语言从全局 Redux store（window.ReduxStore）读取，与编辑器语言选择保持一致。
 * 找不到翻译时依次回退：zh-cn → en → fallback。
 */

const getLocale = () => {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const locales = store.getState().locales;
            if (locales && locales.locale) return String(locales.locale).toLowerCase();
        }
    } catch (e) {
        // ignore
    }
    return 'en';
};

const makeT = table => (key, fallback) => {
    const entry = table[key];
    if (!entry) return fallback;
    const locale = getLocale();
    if (Object.prototype.hasOwnProperty.call(entry, locale)) return entry[locale];
    if (locale.startsWith('zh-geng') && entry.geng) return entry.geng;
    if (locale.startsWith('zh')) return entry['zh-cn'] !== undefined ? entry['zh-cn'] : (entry.en !== undefined ? entry.en : fallback);
    if (entry.en !== undefined) return entry.en;
    return fallback;
};

export {getLocale, makeT};

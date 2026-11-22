/**
 * 「PointerE 协作」插件（addon id: pointere）与编辑器之间的桥接。
 *
 * 与 rwck-community-addon.js 同样的零依赖设计：会同时进入编辑器主包和
 * addon chunk，因此不 import 任何模块。
 *
 * 负责把插件开关 / 两个可见性开关实时推给菜单与协作窗口：
 *   - accountButton：编辑菜单下的「PointerE 账号」
 *   - collabTab：实时协作窗口里的 PointerE Tab
 */

const ADDON_ID = 'pointere';
const SETTINGS_KEY = 'tw:addons';
const CHANGE_EVENT = 'pointere-addon-changed';
const CHANNEL_NAME = 'addons-change';
const WATCH_INTERVAL = 3000;

const DEFAULTS = {
    enabled: false,
    accountButton: true,
    collabTab: true
};

const listeners = new Set();
let cachedState = null;
let watching = false;
let watcherChannel = null;
let watcherTimer = null;

const readAddonStorage = () => {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const data = parsed && parsed[ADDON_ID];
        return (data && typeof data === 'object') ? data : null;
    } catch (e) {
        return null;
    }
};

const computeState = () => {
    const data = readAddonStorage();
    const state = Object.assign({}, DEFAULTS);
    if (data) {
        Object.keys(DEFAULTS).forEach(key => {
            if (typeof data[key] === 'boolean') state[key] = data[key];
        });
    }
    return state;
};

const isSame = (a, b) => !!a && !!b &&
    a.enabled === b.enabled &&
    a.accountButton === b.accountButton &&
    a.collabTab === b.collabTab;

const refresh = () => {
    const previous = cachedState;
    const next = computeState();
    cachedState = next;
    if (isSame(previous, next)) return next;
    for (const listener of Array.from(listeners)) {
        try {
            listener(next, previous);
        } catch (e) {
            // 一个监听者出错不影响其他
        }
    }
    return next;
};

const getState = () => {
    if (!cachedState) cachedState = computeState();
    return cachedState;
};

const notifyChange = () => {
    refresh();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {detail: cachedState}));
    }
};

const handleExternalChange = () => refresh();

const startWatching = () => {
    if (watching) return;
    watching = true;
    window.addEventListener(CHANGE_EVENT, handleExternalChange);
    window.addEventListener('storage', handleExternalChange);
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            watcherChannel = new BroadcastChannel(CHANNEL_NAME);
            watcherChannel.addEventListener('message', handleExternalChange);
        } catch (e) {
            watcherChannel = null;
        }
    }
    watcherTimer = setInterval(handleExternalChange, WATCH_INTERVAL);
};

const stopWatching = () => {
    if (!watching) return;
    watching = false;
    window.removeEventListener(CHANGE_EVENT, handleExternalChange);
    window.removeEventListener('storage', handleExternalChange);
    if (watcherChannel) {
        try {
            watcherChannel.close();
        } catch (e) {
            // ignore
        }
        watcherChannel = null;
    }
    if (watcherTimer) {
        clearInterval(watcherTimer);
        watcherTimer = null;
    }
};

const subscribe = listener => {
    listeners.add(listener);
    startWatching();
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopWatching();
    };
};

const isEnabled = () => getState().enabled;

const shouldShowAccountButton = () => {
    const state = getState();
    return state.enabled && state.accountButton;
};

const shouldShowCollabTab = () => {
    const state = getState();
    return state.enabled && state.collabTab;
};

const enablePointereAddon = () => {
    try {
        let parsed = {};
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            try {
                parsed = JSON.parse(raw);
            } catch (e) {
                parsed = {};
            }
        }
        if (!parsed || typeof parsed !== 'object') parsed = {};
        const prev = (parsed[ADDON_ID] && typeof parsed[ADDON_ID] === 'object') ? parsed[ADDON_ID] : {};
        parsed[ADDON_ID] = {
            enabled: true,
            accountButton: typeof prev.accountButton === 'boolean' ? prev.accountButton : DEFAULTS.accountButton,
            collabTab: typeof prev.collabTab === 'boolean' ? prev.collabTab : DEFAULTS.collabTab
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
        notifyChange();
    } catch (e) {
        // 写入失败静默跳过
    }
};

const publicAPI = {
    ADDON_ID,
    CHANGE_EVENT,
    getPointereAddonState: getState,
    refresh,
    notifyChange,
    subscribePointereAddon: subscribe,
    isPointereAddonEnabled: isEnabled,
    enablePointereAddon,
    shouldShowAccountButton,
    shouldShowCollabTab
};

if (typeof window !== 'undefined') window.PointereAddon = publicAPI;

export {
    ADDON_ID,
    CHANGE_EVENT,
    getState as getPointereAddonState,
    refresh,
    notifyChange,
    subscribe as subscribePointereAddon,
    isEnabled as isPointereAddonEnabled,
    enablePointereAddon,
    shouldShowAccountButton,
    shouldShowCollabTab
};

export default publicAPI;

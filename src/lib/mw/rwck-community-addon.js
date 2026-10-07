/**
 * 「创客次元社区」插件（addon id: rwck-community）与编辑器之间的桥接。
 *
 * 编辑器（menu-bar）通过这个模块判断插件是否启用，以及两个入口
 * （顶部菜单栏「发布作品」按钮、文件菜单「发布到创客次元」）是否显示。
 *
 * 插件的 userscript 通过 window.RwckCommunityAddon.notifyChange() 把状态
 * 变化实时推给编辑器，让插件设置里的复选框无需刷新即可生效。
 *
 * 注意：这个模块必须保持零依赖 —— 它会同时被打进编辑器主包和插件的
 * addon chunk，任何 import 都会导致大块代码被重复打包。
 */

const ADDON_ID = 'rwck-community';
const SETTINGS_KEY = 'tw:addons';
const CHANGE_EVENT = 'rwck-community-addon-changed';
const CHANNEL_NAME = 'addons-change';
const WATCH_INTERVAL = 3000;

const DEFAULTS = {
    enabled: false,
    topBarButton: true,
    fileMenuItem: true
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
    const state = {
        enabled: DEFAULTS.enabled,
        topBarButton: DEFAULTS.topBarButton,
        fileMenuItem: DEFAULTS.fileMenuItem
    };
    if (data) {
        if (typeof data.enabled === 'boolean') state.enabled = data.enabled;
        if (typeof data.topBarButton === 'boolean') state.topBarButton = data.topBarButton;
        if (typeof data.fileMenuItem === 'boolean') state.fileMenuItem = data.fileMenuItem;
    }
    return state;
};

const isSame = (a, b) => (
    !!a && !!b &&
    a.enabled === b.enabled &&
    a.topBarButton === b.topBarButton &&
    a.fileMenuItem === b.fileMenuItem
);

const refresh = () => {
    const previous = cachedState;
    const next = computeState();
    cachedState = next;
    if (isSame(previous, next)) {
        return next;
    }
    for (const listener of Array.from(listeners)) {
        try {
            listener(next, previous);
        } catch (e) {
            // 一个监听器出错不应该影响其它监听器
        }
    }
    return next;
};

const getState = () => {
    if (!cachedState) {
        cachedState = computeState();
    }
    return cachedState;
};

/**
 * 重新读取插件状态并通知编辑器（如果需要）。
 * 插件的 userscript 在启用/设置变化时调用它。
 */
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
    // 插件被关闭时 addon 设置页不会广播（关闭需要刷新），
    // 这里轮询保证编辑器里也能立刻收起按钮并提示刷新。
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

/**
 * 订阅插件状态变化。
 * @param {Function} listener (nextState, previousState) => void
 * @returns {Function} 取消订阅
 */
const subscribe = listener => {
    listeners.add(listener);
    startWatching();
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            stopWatching();
        }
    };
};

const isEnabled = () => {
    const state = getState();
    return state.enabled;
};

/** 顶部菜单栏是否显示「发布作品」按钮 */
const shouldShowTopBarPublishButton = () => {
    const state = getState();
    return state.enabled && state.topBarButton;
};

/** 文件菜单是否显示「发布到创客次元」 */
const shouldShowFileMenuPublishItem = () => {
    const state = getState();
    return state.enabled && state.fileMenuItem;
};

const publicAPI = {
    ADDON_ID,
    CHANGE_EVENT,
    getRwckCommunityAddonState: getState,
    refresh,
    notifyChange,
    subscribeRwckCommunityAddon: subscribe,
    isRwckCommunityAddonEnabled: isEnabled,
    shouldShowTopBarPublishButton,
    shouldShowFileMenuPublishItem
};

if (typeof window !== 'undefined') {
    window.RwckCommunityAddon = publicAPI;
}

export {
    ADDON_ID,
    CHANGE_EVENT,
    getState as getRwckCommunityAddonState,
    refresh,
    notifyChange,
    subscribe as subscribeRwckCommunityAddon,
    isEnabled as isRwckCommunityAddonEnabled,
    shouldShowTopBarPublishButton,
    shouldShowFileMenuPublishItem
};

export default publicAPI;

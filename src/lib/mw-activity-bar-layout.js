// VS Code 布局左侧活动栏的按钮配置（显示/隐藏 + 顺序）
// 设置按钮与登录/头像按钮固定在底部，不允许开关或调整顺序

const BUTTONS = [
    'addonSettings',
    'addExtension',
    'collaboration',
    'todo',
    'git',
    'bookmarks',
    'aiAgent',
    'achievements'
];

// 固定在底部、不允许开关/调整顺序的按钮
const FIXED_BOTTOM = ['login', 'settings'];

const ORDER_KEY = 'mw:activity-bar-order';
const HIDDEN_KEY = 'mw:activity-bar-hidden';
const CHANGE_EVENT = 'mw-activity-bar-changed';

const readJSON = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch (err) {
        // ignore
    }
    return fallback;
};

const writeJSON = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        // ignore
    }
};

const notify = () => {
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

// 返回当前顺序，缺失的新按钮追加到末尾，非法 id 过滤
const getOrder = () => {
    const stored = readJSON(ORDER_KEY, []).filter(id => BUTTONS.includes(id));
    for (const id of BUTTONS) {
        if (!stored.includes(id)) stored.push(id);
    }
    return stored;
};

const getHidden = () => readJSON(HIDDEN_KEY, []).filter(id => BUTTONS.includes(id));

const isHidden = id => getHidden().includes(id);

const setOrder = order => {
    const clean = order.filter(id => BUTTONS.includes(id));
    writeJSON(ORDER_KEY, clean);
    notify();
};

const setHidden = (id, hidden) => {
    const current = new Set(getHidden());
    if (hidden) {
        current.add(id);
    } else {
        current.delete(id);
    }
    writeJSON(HIDDEN_KEY, Array.from(current));
    notify();
};

// 返回应该渲染的可见按钮 id 列表（已按用户顺序排序、过滤隐藏项）
const getVisibleOrderedIds = () => getOrder().filter(id => !isHidden(id));

const isFixedBottom = id => FIXED_BOTTOM.includes(id);

export {
    BUTTONS,
    FIXED_BOTTOM,
    ORDER_KEY,
    HIDDEN_KEY,
    CHANGE_EVENT,
    getOrder,
    getHidden,
    isHidden,
    setOrder,
    setHidden,
    getVisibleOrderedIds,
    isFixedBottom
};

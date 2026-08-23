// 状态栏段（segment）的配置（显示/隐藏 + 顺序）
// 与菜单栏 / 活动栏布局一致：在高级设置中拖动调整顺序、勾选控制显示

const SEGMENTS = [
    'workspaceMouse',
    'stageMouse',
    'zoom',
    'blockCount',
    'spriteName',
    'fps',
    'running',
    'aiStatus'
];

// 固定在状态栏右侧显示、不参与拖动排序的段（如 AI 状态）
const RIGHT_FIXED = ['aiStatus'];

const ORDER_KEY = 'mw:status-bar-order';
const HIDDEN_KEY = 'mw:status-bar-hidden';
const CHANGE_EVENT = 'mw-status-bar-changed';

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

// 返回当前顺序，缺失的新段追加到末尾，非法 id 过滤
const getOrder = () => {
    const stored = readJSON(ORDER_KEY, []).filter(id => SEGMENTS.includes(id));
    for (const id of SEGMENTS) {
        if (!stored.includes(id)) stored.push(id);
    }
    return stored;
};

const getHidden = () => readJSON(HIDDEN_KEY, []).filter(id => SEGMENTS.includes(id));

const isHidden = id => getHidden().includes(id);

const setOrder = order => {
    const clean = order.filter(id => SEGMENTS.includes(id));
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

// 批量设置多个段的显示/隐藏（用于配置页的全选/全不选）
const setHiddenAll = (ids, hidden) => {
    const current = new Set(getHidden());
    for (const id of ids) {
        if (hidden) {
            current.add(id);
        } else {
            current.delete(id);
        }
    }
    writeJSON(HIDDEN_KEY, Array.from(current));
    notify();
};

// 返回应该渲染的可见段 id 列表（已按用户顺序排序、过滤隐藏项）
const getVisibleOrderedIds = () => getOrder().filter(id => !isHidden(id));

export {
    SEGMENTS,
    RIGHT_FIXED,
    ORDER_KEY,
    HIDDEN_KEY,
    CHANGE_EVENT,
    getOrder,
    getHidden,
    isHidden,
    setOrder,
    setHidden,
    setHiddenAll,
    getVisibleOrderedIds
};

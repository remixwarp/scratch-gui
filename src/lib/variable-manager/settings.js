import EventTarget from '../../addons/event-target.js';

const STORAGE_PREFIX = 'mw:varmanager:';

const DEFINITIONS = [
    {
        id: 'default_filter',
        type: 'select',
        default: 'all',
        options: [
            {value: 'all', label: {id: 'mw.variableManager.all', defaultMessage: '全部'}},
            {value: 'variables', label: {id: 'mw.variableManager.variables', defaultMessage: '变量'}},
            {value: 'lists', label: {id: 'mw.variableManager.lists', defaultMessage: '列表'}},
            {value: 'cloud', label: {id: 'mw.variableManager.cloud', defaultMessage: '云变量'}}
        ],
        label: {id: 'mw.variableManager.defaultFilter', defaultMessage: '默认筛选'},
        help: {id: 'mw.variableManager.defaultFilterHelp', defaultMessage: '变量管理器打开时默认使用的筛选器。'}
    },
    {
        id: 'live_update',
        type: 'boolean',
        default: true,
        label: {id: 'mw.variableManager.liveUpdate', defaultMessage: '实时更新'},
        help: {id: 'mw.variableManager.liveUpdateHelp', defaultMessage: '当变量或列表改变时自动刷新显示。'}
    },
    {
        id: 'update_throttle',
        type: 'number',
        default: 50,
        min: 16,
        max: 2000,
        step: 1,
        label: {id: 'mw.variableManager.updateThrottle', defaultMessage: '更新节流（毫秒）'},
        help: {id: 'mw.variableManager.updateThrottleHelp', defaultMessage: '限制变量管理器更新的频率。较小的值会使更新更频繁，但可能影响性能。'}
    },
    {
        id: 'variable_max_length',
        type: 'number',
        default: 1000000,
        min: 1000,
        max: 100000000,
        step: 1000,
        label: {id: 'mw.variableManager.variableMaxLength', defaultMessage: '变量最大长度'},
        help: {id: 'mw.variableManager.variableMaxLengthHelp', defaultMessage: '单个变量值的最大字符长度。'}
    },
    {
        id: 'list_max_length',
        type: 'number',
        default: 5000000,
        min: 1000,
        max: 100000000,
        step: 1000,
        label: {id: 'mw.variableManager.listMaxLength', defaultMessage: '列表最大长度'},
        help: {id: 'mw.variableManager.listMaxLengthHelp', defaultMessage: '单个列表最多可包含的元素数量。'}
    }
];

const definitionsById = {};
const defaults = {};
for (const definition of DEFINITIONS) {
    definitionsById[definition.id] = definition;
    defaults[definition.id] = definition.default;
}

const events = new EventTarget();

const coerce = (definition, raw) => {
    if (definition.type === 'boolean') {
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        return definition.default;
    }
    if (definition.type === 'number') {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return definition.default;
        const clampedLow = typeof definition.min === 'number' ? Math.max(definition.min, parsed) : parsed;
        return typeof definition.max === 'number' ? Math.min(definition.max, clampedLow) : clampedLow;
    }
    if (definition.type === 'select') {
        const allowed = definition.options.some(option => option.value === raw);
        return allowed ? raw : definition.default;
    }
    return raw;
};

const getSetting = id => {
    const definition = definitionsById[id];
    if (!definition) return null;
    let stored = null;
    try {
        stored = localStorage.getItem(STORAGE_PREFIX + id);
    } catch (e) {
        stored = null;
    }
    if (stored === null) return definition.default;
    return coerce(definition, stored);
};

const setSetting = (id, value) => {
    const definition = definitionsById[id];
    if (!definition) return;
    try {
        localStorage.setItem(STORAGE_PREFIX + id, String(value));
    } catch (e) {
        // ignore
    }
    const event = new CustomEvent('change');
    event.settingId = id;
    event.value = getSetting(id);
    events.dispatchEvent(event);
};

const onSettingChanged = listener => {
    events.addEventListener('change', listener);
    return () => events.removeEventListener('change', listener);
};

export {
    DEFINITIONS,
    getSetting,
    setSetting,
    onSettingChanged
};

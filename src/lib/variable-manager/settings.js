import EventTarget from '../../addons/event-target.js';

const STORAGE_PREFIX = 'mw:varmanager:';

const DEFINITIONS = [
    {
        id: 'default_filter',
        type: 'select',
        default: 'all',
        options: [
            {value: 'all', label: 'mw.variableManager.all'},
            {value: 'variables', label: 'mw.variableManager.variables'},
            {value: 'lists', label: 'mw.variableManager.lists'},
            {value: 'cloud', label: 'mw.variableManager.cloud'}
        ],
        label: 'mw.variableManager.defaultFilter',
        help: 'mw.variableManager.defaultFilterHelp'
    },
    {
        id: 'live_update',
        type: 'boolean',
        default: true,
        label: 'mw.variableManager.liveUpdate',
        help: 'mw.variableManager.liveUpdateHelp'
    },
    {
        id: 'update_throttle',
        type: 'number',
        default: 50,
        min: 16,
        max: 2000,
        step: 1,
        label: 'mw.variableManager.updateThrottle',
        help: 'mw.variableManager.updateThrottleHelp'
    },
    {
        id: 'variable_max_length',
        type: 'number',
        default: 1000000,
        min: 1000,
        max: 100000000,
        step: 1000,
        label: 'mw.variableManager.variableMaxLength',
        help: 'mw.variableManager.variableMaxLengthHelp'
    },
    {
        id: 'list_max_length',
        type: 'number',
        default: 5000000,
        min: 1000,
        max: 100000000,
        step: 1000,
        label: 'mw.variableManager.listMaxLength',
        help: 'mw.variableManager.listMaxLengthHelp'
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

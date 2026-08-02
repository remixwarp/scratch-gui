import EventTarget from '../../addons/event-target.js';

const STORAGE_PREFIX = 'mw:debugger:';

const DEFINITIONS = [
    {
        id: 'stage_pause_button',
        default: true,
        label: 'mw.debugger.stagePauseButton',
        help: 'mw.debugger.stagePauseButtonHelp'
    },
    {
        id: 'stage_step_button',
        default: true,
        label: 'mw.debugger.stageStepButton',
        help: 'mw.debugger.stageStepButtonHelp'
    },
    {
        id: 'thread_glow',
        default: true,
        label: 'mw.debugger.threadGlow',
        help: 'mw.debugger.threadGlowHelp'
    },
    {
        id: 'log_clear_greenflag',
        default: false,
        label: 'mw.debugger.logClearGreenflag',
        help: 'mw.debugger.logClearGreenflagHelp'
    },
    {
        id: 'log_greenflag',
        default: false,
        label: 'mw.debugger.logGreenflag',
        help: 'mw.debugger.logGreenflagHelp'
    },
    {
        id: 'log_clone_create',
        default: false,
        label: 'mw.debugger.logCloneCreate',
        help: 'mw.debugger.logCloneCreateHelp'
    },
    {
        id: 'log_failed_clone_creation',
        default: true,
        label: 'mw.debugger.logFailedCloneCreation',
        help: 'mw.debugger.logFailedCloneCreationHelp'
    },
    {
        id: 'log_broadcasts',
        default: false,
        label: 'mw.debugger.logBroadcasts',
        help: 'mw.debugger.logBroadcastsHelp'
    },
    {
        id: 'fancy_graphs',
        default: false,
        label: 'mw.debugger.fancyGraphs',
        help: 'mw.debugger.fancyGraphsHelp'
    }
];

const defaults = {};
for (const definition of DEFINITIONS) {
    defaults[definition.id] = definition.default;
}

const events = new EventTarget();

const getSetting = id => {
    const stored = localStorage.getItem(STORAGE_PREFIX + id);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return defaults[id] || false;
};

const setSetting = (id, value) => {
    try {
        localStorage.setItem(STORAGE_PREFIX + id, value ? 'true' : 'false');
    } catch (e) {
        void e;
    }
    const event = new CustomEvent('change');
    event.settingId = id;
    event.value = value;
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

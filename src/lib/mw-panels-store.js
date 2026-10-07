import React from 'react';
import {CircleAlert, Terminal, TerminalSquare} from 'lucide-react';

export const PANEL_PROBLEMS = 'problems';
export const PANEL_CONSOLE = 'console';
export const PANEL_TERMINAL = 'terminal';

export const PANEL_IDS = [PANEL_PROBLEMS, PANEL_CONSOLE, PANEL_TERMINAL];

export const PANEL_DEFS = {
    [PANEL_PROBLEMS]: {
        title: 'Problems',
        titleZh: '问题',
        icon: React.createElement(CircleAlert, {size: 20})
    },
    [PANEL_CONSOLE]: {
        title: 'Console',
        titleZh: '控制台',
        icon: React.createElement(Terminal, {size: 20})
    },
    [PANEL_TERMINAL]: {
        title: 'Terminal',
        titleZh: '终端',
        icon: React.createElement(TerminalSquare, {size: 20})
    }
};

export const CLOSE_PANEL_ID = '__close__';

const STORAGE_KEY = 'mw:panel-state';

const DEFAULT_STATE = {
    visible: false,
    active: PANEL_PROBLEMS,
    height: 200
};

export const loadPanelState = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const state = Object.assign({}, DEFAULT_STATE, parsed);
            if (!PANEL_IDS.includes(state.active)) {
                state.active = DEFAULT_STATE.active;
            }
            state.height = Math.max(100, Math.min(600, Number(state.height) || DEFAULT_STATE.height));
            state.visible = false;
            return state;
        }
    } catch (e) {
        console.warn('Failed to load panel state:', e);
    }
    return Object.assign({}, DEFAULT_STATE);
};

export const savePanelState = state => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save panel state:', e);
    }
};

export const togglePanelViaEvent = panelId => {
    window.dispatchEvent(new CustomEvent('mw-panel-toggle', {detail: {panel: panelId}}));
};

export const PANEL_STATE_EVENT = 'mw-panel-state-changed';

let currentPanelState = null;

export const getPanelState = () => currentPanelState;

export const setPanelStateEvent = state => {
    currentPanelState = state;
    window.dispatchEvent(new CustomEvent(PANEL_STATE_EVENT, {detail: state}));
};

export const PROBLEM_COUNT_EVENT = 'mw-problem-count-changed';

let currentProblemCount = 0;

export const getProblemCount = () => currentProblemCount;

export const setProblemCount = count => {
    const n = Math.max(0, Number(count) || 0);
    if (n === currentProblemCount) return;
    currentProblemCount = n;
    window.dispatchEvent(new CustomEvent(PROBLEM_COUNT_EVENT, {detail: n}));
};

// ---------------------------------------------------------------------------
// 运行控制台日志（跨组件共享，供底部面板「控制台」tab 与工具菜单的终端窗口共用）
// 旧版工具菜单的终端窗口（FractchTerminal）目前是空实现，这里让它与多工作区
// 里的「控制台」显示完全一致的运行日志。
// ---------------------------------------------------------------------------

export const CONSOLE_ENTRIES_EVENT = 'mw-console-entries-changed';

const MAX_SHARED_CONSOLE_ENTRIES = 500;
let sharedConsoleEntries = [];
let sharedConsoleIdCounter = 0;

export const getConsoleEntries = () => sharedConsoleEntries;

export const appendConsoleEntry = (method, args) => {
    const entry = {
        id: `shared-${Date.now()}-${++sharedConsoleIdCounter}`,
        method: method === 'debug' ? 'debug' : method,
        args,
        time: Date.now()
    };
    sharedConsoleEntries = [...sharedConsoleEntries, entry].slice(-MAX_SHARED_CONSOLE_ENTRIES);
    window.dispatchEvent(new CustomEvent(CONSOLE_ENTRIES_EVENT));
    return entry;
};

export const clearConsoleEntries = () => {
    if (sharedConsoleEntries.length === 0) return;
    sharedConsoleEntries = [];
    window.dispatchEvent(new CustomEvent(CONSOLE_ENTRIES_EVENT));
};

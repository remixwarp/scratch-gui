// 快捷键速查表 addon：按 ? 键唤起现有的「键盘快捷键」管理面板（工具菜单下的同一窗口）
// 并把 addon 已知的额外快捷键注入到 shortcut-manager 的展示列表中（见 shortcut-manager.jsx）

// 收录 addon 中已知的额外快捷键（不通过 registry 注册的）
// 此列表会被 shortcut-manager.jsx 通过 window.RW_ADDON_SHORTCUTS 读取并合并展示
const ADDON_SHORTCUTS = [
    {id: 'addon_find_bar', key: 'Ctrl+F', defaultKey: 'Ctrl+F', category: 'edit', label: '查找积木', source: 'find-bar', readOnly: true},
    {id: 'addon_middle_click_search', key: 'Ctrl+Space', defaultKey: 'Ctrl+Space', category: 'editorNavigation', label: '中键弹窗搜索积木', source: 'middle-click-popup', readOnly: true},
    {id: 'addon_middle_click_open', key: 'Shift+Alt+B', defaultKey: 'Shift+Alt+B', category: 'editorNavigation', label: '打开积木插入窗口', source: 'middle-click-popup', readOnly: true},
    {id: 'addon_middle_click_mouse', key: '中键点击', defaultKey: '中键点击', category: 'editorNavigation', label: '在光标处弹出搜索', source: 'middle-click-popup', readOnly: true},
    {id: 'addon_middle_click_shift', key: 'Shift+左键', defaultKey: 'Shift+左键', category: 'editorNavigation', label: '在光标处弹出搜索', source: 'middle-click-popup', readOnly: true},
    {id: 'addon_pause', key: 'Space', defaultKey: 'Space', category: 'projectControls', label: '暂停/继续', source: 'pause', readOnly: true},
    {id: 'addon_debugger', key: 'Ctrl+Shift+D', defaultKey: 'Ctrl+Shift+D', category: 'view', label: '打开调试器', source: 'debugger', readOnly: true},
    {id: 'addon_block_count', key: 'Ctrl+Shift+B', defaultKey: 'Ctrl+Shift+B', category: 'view', label: '显示块数', source: 'block-count', readOnly: true},
    {id: 'addon_calculator', key: 'Ctrl+Shift+C', defaultKey: 'Ctrl+Shift+C', category: 'windowManagement', label: '打开计算器', source: 'calculator', readOnly: true},
    {id: 'addon_ai_agent', key: 'Ctrl+Shift+A', defaultKey: 'Ctrl+Shift+A', category: 'windowManagement', label: '打开 AI Agent', source: '02agent', readOnly: true},
    {id: 'addon_number_arrow', key: 'Ctrl+↑/↓', defaultKey: 'Ctrl+↑/↓', category: 'edit', label: '数值增减', source: 'editor-number-arrow-keys', readOnly: true},
    {id: 'addon_number_arrow_big', key: 'Shift+↑/↓', defaultKey: 'Shift+↑/↓', category: 'edit', label: '数值大幅增减', source: 'editor-number-arrow-keys', readOnly: true},
    {id: 'addon_cheatsheet', key: '?', defaultKey: '?', category: 'view', label: '打开快捷键速查表', source: 'keymap-cheatsheet', readOnly: true}
];

const isTypingTarget = target => {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT') {
        // Blockly 工作区有一个隐藏的 input（用于捕获键盘事件），不可见，不应被当作用户输入框
        // 只有可见的、用户可交互的输入框才排除触发
        if (target.offsetWidth === 0 || target.offsetHeight === 0) return false;
        return true;
    }
    return tag === 'TEXTAREA' || target.isContentEditable;
};

export default async function ({addon, msg, console}) {
    let enabled = true;
    try {
        enabled = addon.settings.get('enable_cheatsheet') !== false;
    } catch (e) {
        // ignore
    }
    if (!enabled) return;

    let triggerKey = '?';
    try {
        triggerKey = addon.settings.get('trigger_key') || '?';
    } catch (e) {
        // ignore
    }

    // 暴露 addon 快捷键列表给 shortcut-manager.jsx 合并展示
    if (typeof window !== 'undefined') {
        window.RW_ADDON_SHORTCUTS = ADDON_SHORTCUTS;
    }

    // 通过 addon.tab.redux dispatch 打开现有的 shortcut-manager modal
    const openShortcutManager = () => {
        try {
            addon.tab.redux.dispatch({
                type: 'scratch-gui/modals/OPEN_MODAL',
                modal: 'shortcutManagerModal'
            });
        } catch (e) {
            console.warn('[keymap-cheatsheet] 打开 modal 失败:', e);
        }
    };

    const handleKeyDown = e => {
        // 在输入框中不触发
        if (isTypingTarget(e.target)) return;
        // 修饰键（Ctrl/Meta/Alt）按下时不触发，避免与 Ctrl+? 等冲突
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        let pressed = '';
        // 优先用 e.key 判断
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) pressed = '?';
        else if (e.key === '/') pressed = '/';
        else if (e.key === 'F1') pressed = 'F1';

        if (pressed && pressed === triggerKey) {
            e.preventDefault();
            e.stopPropagation();
            openShortcutManager();
        }
    };

    // capture 阶段监听，确保早于其它 bubbling 监听器
    document.addEventListener('keydown', handleKeyDown, true);

    // 全局 API
    if (typeof window !== 'undefined') {
        window.RWKeymapCheatsheet = {
            open: openShortcutManager,
            getAddonShortcuts: () => ADDON_SHORTCUTS.slice()
        };
    }

    console.log('[keymap-cheatsheet] 已加载，按', triggerKey, '唤起快捷键面板');
}

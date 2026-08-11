// Script Tabs addon — ID 24: 多标签脚本编辑
// 在工作区顶部注入 tab 栏，每个 tab 保存一个视图状态（滚动位置/缩放/角色）

export default async function ({ addon, msg, console }) {
    const ScratchBlocks = await addon.tab.traps.getBlockly();
    const vm = addon.tab.traps.vm;

    const STORAGE_KEY = 'rw:script-tabs';
    const STORAGE_ACTIVE_KEY = 'rw:script-tabs-active';

    // ========== 状态管理 ==========
    let tabs = [];
    let activeTabIndex = -1;
    let tabBarElement = null;
    let isApplyingState = false;
    let pendingTargetSwitch = null; // { targetId, state } 等待 target 切换完成后应用

    // ========== 持久化 ==========
    function loadTabs() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) tabs = parsed;
            }
        } catch (e) {
            tabs = [];
        }
        try {
            const idx = parseInt(localStorage.getItem(STORAGE_ACTIVE_KEY) || '-1', 10);
            if (idx >= 0 && idx < tabs.length) activeTabIndex = idx;
        } catch (e) {
            activeTabIndex = -1;
        }
    }

    function saveTabs() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
        } catch (e) {}
    }

    function saveActiveIndex() {
        try {
            localStorage.setItem(STORAGE_ACTIVE_KEY, String(activeTabIndex));
        } catch (e) {}
    }

    // ========== 视图状态获取/应用 ==========
    function getCurrentWorkspaceState() {
        const workspace = ScratchBlocks.getMainWorkspace();
        if (!workspace) return null;
        const metrics = workspace.getMetrics();
        const currentTarget = vm.editingTarget;
        return {
            scrollX: metrics.viewLeft,
            scrollY: metrics.viewTop,
            scale: workspace.scale,
            targetId: currentTarget ? currentTarget.id : null,
            targetName: currentTarget ? currentTarget.getName() : null
        };
    }

    function applyWorkspaceState(state, callback) {
        if (!state) {
            if (callback) callback();
            return;
        }
        isApplyingState = true;

        const workspace = ScratchBlocks.getMainWorkspace();
        if (!workspace) {
            isApplyingState = false;
            if (callback) callback();
            return;
        }

        const applyScrollAndScale = () => {
            try {
                const ws = ScratchBlocks.getMainWorkspace();
                if (ws && ws.scrollbar) {
                    ws.setScale(state.scale);
                    const m = ws.getMetrics();
                    const sx = state.scrollX - m.contentLeft;
                    const sy = state.scrollY - m.contentTop;
                    ws.scrollbar.set(sx, sy);
                }
            } catch (e) {}
            isApplyingState = false;
            if (callback) callback();
        };

        // 如果需要切换 target，先切换再应用滚动
        if (state.targetId && state.targetId !== (vm.editingTarget && vm.editingTarget.id)) {
            const target = vm.runtime && vm.runtime.getTargetById(state.targetId);
            if (target) {
                pendingTargetSwitch = { state, callback: applyScrollAndScale };
                vm.setEditingTarget(state.targetId);
                // 兜底：如果 1 秒内没收到 target 切换完成，直接应用
                setTimeout(() => {
                    if (pendingTargetSwitch) {
                        pendingTargetSwitch = null;
                        applyScrollAndScale();
                    }
                }, 1000);
                return;
            }
        }

        // 同一 target，直接应用
        applyScrollAndScale();
    }

    // 监听 VM target 切换完成（Scratch VM 用 targetsUpdate 事件）
    if (vm && typeof vm.addListener === 'function') {
        vm.addListener('targetsUpdate', () => {
            if (pendingTargetSwitch) {
                const pending = pendingTargetSwitch;
                pendingTargetSwitch = null;
                setTimeout(() => pending.callback(), 300);
            }
        });
    }

    // ========== Tab 操作 ==========
    function addTab(name) {
        const maxTabs = (addon.settings && addon.settings.get && addon.settings.get('maxTabs')) || 20;
        if (tabs.length >= maxTabs) {
            alert(msg('max-reached', {max: maxTabs}));
            return;
        }
        const state = getCurrentWorkspaceState();
        if (!state) return;

        const tabName = name || msg('label-default', {index: tabs.length + 1});
        const tab = {
            id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: tabName,
            state: state,
            timestamp: Date.now()
        };
        tabs.push(tab);
        saveTabs();
        switchToTab(tabs.length - 1);
        renderTabBar();
    }

    function switchToTab(index) {
        if (index < 0 || index >= tabs.length) return;
        // 保存当前视图状态到当前 tab（如果有的话）
        if (activeTabIndex >= 0 && activeTabIndex < tabs.length && !isApplyingState) {
            const currentState = getCurrentWorkspaceState();
            if (currentState) {
                tabs[activeTabIndex].state = currentState;
                saveTabs();
            }
        }
        activeTabIndex = index;
        saveActiveIndex();
        applyWorkspaceState(tabs[index].state, () => {
            renderTabBar();
        });
    }

    function closeTab(index) {
        if (index < 0 || index >= tabs.length) return;
        tabs.splice(index, 1);
        if (activeTabIndex === index) {
            // 关闭的是当前 tab，切换到相邻的
            const newIdx = Math.min(index, tabs.length - 1);
            if (newIdx >= 0) {
                activeTabIndex = newIdx;
                saveActiveIndex();
                applyWorkspaceState(tabs[newIdx].state, () => renderTabBar());
            } else {
                activeTabIndex = -1;
                saveActiveIndex();
            }
        } else if (activeTabIndex > index) {
            activeTabIndex--;
            saveActiveIndex();
        }
        saveTabs();
        renderTabBar();
    }

    function renameTab(index, newName) {
        if (index < 0 || index >= tabs.length) return;
        tabs[index].name = newName || msg('label-default', {index: index + 1});
        tabs[index].timestamp = Date.now();
        saveTabs();
        renderTabBar();
    }

    // ========== UI 注入 ==========
    function findInjectionDiv() {
        let injectionDiv = null;
        try {
            if (ScratchBlocks && ScratchBlocks.getMainWorkspace) {
                const ws = ScratchBlocks.getMainWorkspace();
                if (ws && typeof ws.getInjectionDiv === 'function') {
                    injectionDiv = ws.getInjectionDiv();
                }
            }
        } catch (e) {}
        if (!injectionDiv) {
            injectionDiv = document.querySelector('.injectionDiv');
        }
        return injectionDiv;
    }

    function createTabBar() {
        if (tabBarElement && tabBarElement.parentNode) return tabBarElement;

        const injectionDiv = findInjectionDiv();
        if (!injectionDiv) return null;

        tabBarElement = document.createElement('div');
        tabBarElement.className = 'rw-script-tabs-bar';

        // 直接作为 injectionDiv 的子节点，使用绝对定位悬浮在工作区顶部
        // 悬浮式不改变 Blockly 的原有布局
        injectionDiv.appendChild(tabBarElement);

        return tabBarElement;
    }

    function renderTabBar() {
        if (!tabBarElement) return;

        // 保存当前视图到活跃 tab
        if (activeTabIndex >= 0 && activeTabIndex < tabs.length && !isApplyingState) {
            const currentState = getCurrentWorkspaceState();
            if (currentState) {
                tabs[activeTabIndex].state = currentState;
            }
        }

        tabBarElement.innerHTML = '';

        // Tab 按钮
        tabs.forEach((tab, index) => {
            const tabEl = document.createElement('div');
            tabEl.className = 'rw-script-tab';
            if (index === activeTabIndex) tabEl.classList.add('active');

            // 标签名
            const nameEl = document.createElement('span');
            nameEl.className = 'rw-script-tab-name';
            nameEl.textContent = tab.name;
            nameEl.title = tab.name + '（' + msg('rename-hint') + '）';
            tabEl.appendChild(nameEl);

            // 关闭按钮
            const closeBtn = document.createElement('span');
            closeBtn.className = 'rw-script-tab-close';
            closeBtn.textContent = '×';
            closeBtn.title = msg('close-tooltip');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeTab(index);
            });
            tabEl.appendChild(closeBtn);

            // 点击切换
            tabEl.addEventListener('click', () => switchToTab(index));

            // 双击重命名
            tabEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                startRename(tabEl, nameEl, index);
            });

            // 拖拽排序
            tabEl.draggable = true;
            tabEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', String(index));
                tabEl.classList.add('dragging');
            });
            tabEl.addEventListener('dragend', () => {
                tabEl.classList.remove('dragging');
            });
            tabEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                tabEl.classList.add('drag-over');
            });
            tabEl.addEventListener('dragleave', () => {
                tabEl.classList.remove('drag-over');
            });
            tabEl.addEventListener('drop', (e) => {
                e.preventDefault();
                tabEl.classList.remove('drag-over');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (isNaN(fromIndex) || fromIndex === index) return;
                // 交换位置
                const moved = tabs.splice(fromIndex, 1)[0];
                tabs.splice(index, 0, moved);
                // 修正 activeTabIndex
                if (activeTabIndex === fromIndex) {
                    activeTabIndex = index;
                } else if (fromIndex < activeTabIndex && index >= activeTabIndex) {
                    activeTabIndex--;
                } else if (fromIndex > activeTabIndex && index <= activeTabIndex) {
                    activeTabIndex++;
                }
                saveTabs();
                saveActiveIndex();
                renderTabBar();
            });

            tabBarElement.appendChild(tabEl);
        });

        // 添加按钮
        const addBtn = document.createElement('div');
        addBtn.className = 'rw-script-tab-add';
        addBtn.textContent = '+';
        addBtn.title = msg('add-tooltip');
        addBtn.addEventListener('click', () => addTab());
        tabBarElement.appendChild(addBtn);
    }

    function startRename(tabEl, nameEl, index) {
        const oldName = tabs[index].name;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rw-script-tab-input';
        input.value = oldName;
        input.maxLength = 30;

        nameEl.style.display = 'none';
        tabEl.insertBefore(input, nameEl);
        input.focus();
        input.select();

        const finish = (save) => {
            const newName = input.value.trim();
            nameEl.style.display = '';
            if (input.parentNode) input.parentNode.removeChild(input);
            if (save && newName && newName !== oldName) {
                renameTab(index, newName);
            }
        };

        input.addEventListener('blur', () => finish(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finish(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finish(false);
            }
        });
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('dblclick', (e) => e.stopPropagation());
    }

    // ========== 自动保存当前视图 ==========
    let autoSaveTimer = null;
    function scheduleAutoSave() {
        if (isApplyingState) return;
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            if (activeTabIndex >= 0 && activeTabIndex < tabs.length) {
                const state = getCurrentWorkspaceState();
                if (state) {
                    tabs[activeTabIndex].state = state;
                    saveTabs();
                }
            }
        }, 1000);
    }

    // ========== 初始化 ==========
    function init() {
        loadTabs();
        createTabBar();

        // 如果没有 tab，创建一个默认的
        if (tabs.length === 0) {
            addTab(msg('label-main'));
        } else if (activeTabIndex >= 0) {
            // 恢复上次活跃的 tab
            applyWorkspaceState(tabs[activeTabIndex].state, () => renderTabBar());
        } else {
            renderTabBar();
        }

        // 监听 workspace 滚动/缩放变化，自动保存
        const checkWorkspace = () => {
            const ws = ScratchBlocks.getMainWorkspace();
            if (ws) {
                // 监听 translate 和 zoom 事件
                if (typeof ws.addChangeListener === 'function') {
                    ws.addChangeListener((event) => {
                        // 只在视图变化时触发
                        if (event.type === 'viewport_change' || event.type === 'ui') {
                            scheduleAutoSave();
                        }
                    });
                }
                // 直接监听滚动条
                if (ws.scrollbar) {
                    const origSet = ws.scrollbar.set;
                    ws.scrollbar.set = function (...args) {
                        const r = origSet.apply(this, args);
                        if (!isApplyingState) scheduleAutoSave();
                        return r;
                    };
                }
                // 监听缩放
                if (ws.zoomControl_) {
                    // Blockly zoom 按钮
                }
                const origSetScale = ws.setScale.bind(ws);
                ws.setScale = function (scale) {
                    const r = origSetScale(scale);
                    if (!isApplyingState) scheduleAutoSave();
                    return r;
                };
            } else {
                setTimeout(checkWorkspace, 500);
            }
        };
        checkWorkspace();

        // 监听 target 切换，更新 tab 名中的 targetName
        if (vm && typeof vm.addListener === 'function') {
            vm.addListener('targetsUpdate', () => {
                scheduleAutoSave();
            });
        }

        // 键盘快捷键：Ctrl+Shift+T 添加新 tab
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
                e.preventDefault();
                addTab();
            }
            // Ctrl+Shift+W 关闭当前 tab
            if (e.ctrlKey && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
                e.preventDefault();
                if (activeTabIndex >= 0) closeTab(activeTabIndex);
            }
            // Ctrl+Tab 切换到下一个 tab
            if (e.ctrlKey && e.key === 'Tab') {
                e.preventDefault();
                if (tabs.length > 0) {
                    const next = (activeTabIndex + 1) % tabs.length;
                    switchToTab(next);
                }
            }
        });

        console.log('[Script Tabs] 多标签脚本编辑已加载');
    }

    // 等待 workspace 准备好后初始化
    const waitForInit = () => {
        const ws = ScratchBlocks && ScratchBlocks.getMainWorkspace();
        if (ws) {
            // 检查 injectionDiv 是否存在
            let injectionDiv = null;
            try {
                if (typeof ws.getInjectionDiv === 'function') {
                    injectionDiv = ws.getInjectionDiv();
                }
            } catch (e) {}
            if (!injectionDiv) {
                injectionDiv = document.querySelector('.injectionDiv');
            }
            if (!injectionDiv) {
                injectionDiv = document.querySelector('svg.blocklySvg');
            }
            if (injectionDiv) {
                init();
                return;
            }
        }
        setTimeout(waitForInit, 500);
    };
    setTimeout(waitForInit, 1000);

    // ========== 全局 API ==========
    window.RWScriptTabs = {
        add: (name) => addTab(name),
        switch: (index) => switchToTab(index),
        close: (index) => closeTab(index),
        rename: (index, name) => renameTab(index, name),
        getTabs: () => tabs.map(t => ({ id: t.id, name: t.name, targetName: t.state.targetName })),
        getActiveIndex: () => activeTabIndex
    };
}

/**
 * 创客次元社区插件。
 *
 * 启用后编辑器会新增两个入口：
 *   1. 顶部菜单栏的「发布作品」按钮
 *   2. 文件菜单最后一项「发布到创客次元」
 * 两个入口都可以单独在插件设置里开关，改动会立刻生效。
 *
 * 关闭插件后因为入口是由编辑器渲染的，需要刷新编辑器才会彻底移除，
 * 所以关闭时会提示刷新。
 */

export default async function ({addon, console}) {
    // 让编辑器（menu-bar）重新读取插件状态，立刻显示/收起入口
    const notify = () => {
        const bridge = window.RwckCommunityAddon;
        if (bridge && typeof bridge.notifyChange === 'function') {
            bridge.notifyChange();
        }
    };

    const showToast = (message, type) => {
        try {
            const store = window.ReduxStore;
            if (store && typeof store.dispatch === 'function') {
                store.dispatch({
                    type: 'scratch-gui/SHOW_TOAST',
                    message,
                    toastType: type || 'info'
                });
            }
        } catch (e) {
            // 拿不到 store 就静默跳过，不影响插件本身
        }
    };

    // 插件刚被启用：立刻把入口显示出来
    notify();

    // 复选框改动：立刻应用
    if (addon.settings && typeof addon.settings.addEventListener === 'function') {
        addon.settings.addEventListener('change', notify);
    }

    // 插件被关闭：收起入口并提示刷新编辑器
    if (addon.self && typeof addon.self.addEventListener === 'function') {
        addon.self.addEventListener('disabled', () => {
            notify();
            showToast('创客次元社区插件已关闭，请刷新编辑器生效', 'warning');
        });
    }

    console.log('[创客次元社区] 插件已启用');
}

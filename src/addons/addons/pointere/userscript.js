/**
 * PointerE 协作插件。
 *
 * 启用后：
 *   1. 编辑菜单出现「PointerE 账号」入口（可单独开关）
 *   2. 实时协作窗口上方出现「PointerE」标签页（可单独开关）
 *
 * 与编辑器之间的状态同步通过 window.PointereAddon.notifyChange() 完成，
 * 因此插件设置里的开关无需刷新即可生效。
 */

export default async function ({addon, console}) {
    const notify = () => {
        const bridge = window.PointereAddon;
        if (bridge && typeof bridge.notifyChange === 'function') {
            bridge.notifyChange();
        }
    };

    notify();

    if (addon.settings && typeof addon.settings.addEventListener === 'function') {
        addon.settings.addEventListener('change', notify);
    }

    if (addon.self && typeof addon.self.addEventListener === 'function') {
        addon.self.addEventListener('disabled', () => {
            notify();
        });
    }

    console.log('[PointerE] 插件已启用');
}

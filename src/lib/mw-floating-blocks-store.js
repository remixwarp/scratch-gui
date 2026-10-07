// 跨组件通信：从角色右键菜单「编辑积木」触发，通知多工作区打开对应角色的自由窗口。
// 多工作区（MultiWorkspaces）挂载时注册开启器，卸载时注销；菜单点击时直接调用。

let opener = null;

// 注册「打开积木盒自由窗口」的处理器，返回注销函数
export const registerFloatingBlocksOpener = (cb) => {
    opener = cb;
    return () => {
        if (opener === cb) {
            opener = null;
        }
    };
};

// 请求为指定 targetId 打开积木盒自由窗口
export const openFloatingBlocksForTarget = (targetId) => {
    if (!targetId) return;
    if (opener) {
        try {
            opener(targetId);
        } catch (e) {
            console.error('openFloatingBlocksForTarget failed:', e);
        }
    }
};

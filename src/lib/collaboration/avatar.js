// 协作头像不再依赖 Bilup Accounts（avatars.accounts.bilup.org）。
// 改为返回 null，让协作层使用其本地默认头像占位，避免发起外部请求。
const avatarForCollabUser = user => {
    const handle = user && user.handle;
    if (typeof handle !== 'string' || !handle) return null;
    return null;
};

export {avatarForCollabUser};

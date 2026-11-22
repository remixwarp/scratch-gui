/**
 * PointerE 账号 ↔ 创客次元账号「串号」（本地关联）。
 *
 * 官方文档说明两套账号体系互不通用、无服务端互通接口，因此这里做的是
 * 本地关联：把当前 PointerE 账号（sub）与浏览器里已登录的创客次元账号
 * （rwck:user）建立映射，仅用于在本机展示「已绑定」状态与社区昵称，
 * 不会向任何服务端提交，也不声称官方账号互通。
 */

const KEY = 'pointere:bindings';

const readAll = () => {
    try {
        const raw = localStorage.getItem(KEY);
        const obj = raw ? JSON.parse(raw) : null;
        return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
        return {};
    }
};

const writeAll = obj => {
    try {
        localStorage.setItem(KEY, JSON.stringify(obj || {}));
    } catch (e) {
        // ignore
    }
};

export const communityUser = () => {
    try {
        const raw = localStorage.getItem('rwck:user');
        const u = raw ? JSON.parse(raw) : null;
        if (!u || typeof u !== 'object') return null;
        const name = u.username || u.nickname || u.name || '';
        return name ? {username: name, nickname: u.nickname || '', id: u.id || u.uid || ''} : null;
    } catch (e) {
        return null;
    }
};

export const communityLoggedIn = () => !!localStorage.getItem('rwck:token');

/** 读取某个 PointerE 账号绑定的社区账号；sub 为空时用通用键。 */
export const getBinding = sub => {
    const all = readAll();
    return all[String(sub || '_')] || null;
};

/** 绑定：把当前社区账号关联到当前 PointerE 账号。返回绑定结果或 null。 */
export const bindCommunity = sub => {
    const user = communityUser();
    if (!user) return null;
    const all = readAll();
    const entry = Object.assign({}, user, {boundAt: Date.now()});
    all[String(sub || '_')] = entry;
    writeAll(all);
    return entry;
};

/** 解除绑定。 */
export const unbindCommunity = sub => {
    const all = readAll();
    delete all[String(sub || '_')];
    writeAll(all);
    return true;
};

export default {
    getBinding,
    bindCommunity,
    unbindCommunity,
    communityLoggedIn,
    communityUser
};

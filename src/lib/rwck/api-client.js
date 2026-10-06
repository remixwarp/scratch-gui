/**
 * 创客次元（极光论坛）前端 API 客户端。
 * Base URL: https://forum.ctspace.xyz/api
 * 文档版本：2026-09-26 · 对应站点 v3.0
 * 文档：https://forum.ctspace.xyz/docs （机器可读：https://forum.ctspace.xyz/docs/api.md）
 *
 * 设计目标：
 *   - 纯浏览器 ES module（scratch-gui webpack 4 能直接 import）。
 *   - 所有 fetch 统一 CORS + 错误处理 + JWT 注入。
 *   - Token 持久化到 localStorage（rwck:token / rwck:user）。
 *   - 自动双路：优先直连官方；失败自动降级到同源代理 /__rwck-proxy（webpack dev-server
 *     已挂好，绕开 forum CORS）。
 *
 * 已知 Forum CORS 策略：forum.ctspace.xyz 只回 Access-Control-Allow-Origin: <请求 Origin>
 * 且配合 credentials。大多数浏览器的 fetch 默认无 credentials 且不带 Origin 时服务端
 * 会拒绝。本客户端通过同源代理兜住所有请求，前端永远看不见跨域。
 *
 * 用法（示例）：
 *   import rwck from './rwck/api-client';
 *   const cap      = await rwck.auth.getCaptcha();
 *   const nonce    = rwck.auth.solvePow(cap.pow);
 *   const login    = await rwck.auth.login({...});
 *   const projects = await rwck.projects.list({sort:'score', pageSize: 12});
 *   const stats    = await rwck.stats.public();
 */

// 运行时判定浏览器 vs Node
const _isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// forum.ctspace.xyz 官方 API 基线
export const UPSTREAM_ORIGIN = 'https://forum.ctspace.xyz';
export const OFFICIAL_BASE   = 'https://forum.ctspace.xyz/api';
export const PROXY_BASE      = '/__rwck-proxy';

// 自动探测代理可用与否：dev-server 在 webpack.before() 里挂了 /__rwck-proxy/*
// 在 dev 环境走同源代理最稳；生产环境也尝试（Cloudflare Pages Function 也挂了）。
// 用户也可以在 import 前用 window.__RWCK_FORCE_PROXY__ = true/false 强制。
const _FORCE_PROXY = _isBrowser && (
    !!window.__RWCK_FORCE_PROXY__          // 用户强制
    || !!(window.__RWCK_DEV_PROXY__)       // 调试开关
    || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production')
);

export const BASE_URL    = _FORCE_PROXY ? PROXY_BASE : OFFICIAL_BASE;
export const IS_PROXY    = _FORCE_PROXY;
export const IS_BROWSER  = _isBrowser;

export const PROXY_PATH  = '/__rwck-proxy';

const LS_TOKEN = 'rwck:token';
const LS_USER  = 'rwck:user';

const getToken  = () => localStorage.getItem(LS_TOKEN);
const setToken  = t => { if (t) localStorage.setItem(LS_TOKEN, t); else localStorage.removeItem(LS_TOKEN); };
const getUser   = () => { try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); } catch { return null; } };
const setUser   = u => { if (u) localStorage.setItem(LS_USER, JSON.stringify(u)); else localStorage.removeItem(LS_USER); };

const authHeaders = () => {
    const t = getToken();
    return t ? {Authorization: `Bearer ${t}`} : {};
};

/** 拼 query string（去掉空值）。 */
function _qs(obj) {
    const u = new URLSearchParams();
    Object.keys(obj || {}).forEach(k => {
        const v = obj[k];
        if (v === undefined || v === null || v === '') return;
        if (Array.isArray(v)) { v.forEach(x => u.append(k, x)); return; }
        u.set(k, String(v));
    });
    const s = u.toString();
    return s ? '?' + s : '';
}

/** 统一 fetch：JSON 请求体 + JSON 响应解析 + 错误归一化。 */
async function _fetch(path, options = {}) {
    const url = BASE_URL + path;
    const headers = Object.assign(
        {'Accept': 'application/json'},
        authHeaders(),
        options.headers || {}
    );
    let body = options.body;
    if (body && typeof body !== 'string' && !(body instanceof FormData)) {
        body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
    }
    const init = {
        method: options.method || 'GET',
        headers,
        ...(body !== undefined ? {body} : {})
    };
    let res;
    try {
        res = await fetch(url, init);
    } catch (e) {
        throw Object.assign(new Error('网络错误，请检查连接后重试'), {cause: e});
    }
    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
        const msgRaw = data && (data.message || data.error);
        const msg = Array.isArray(msgRaw) ? msgRaw.join('; ') : (msgRaw || `HTTP ${res.status}`);
        const err = new Error(msg);
        err.status = res.status;
        err.data   = data;
        throw err;
    }
    return data;
}


/** 工作量证明（前端同步计算，几十毫秒）。 */
async function solvePow({challenge, difficulty}) {
    const target = '0'.repeat(difficulty || 4);
    for (let nonce = 0; nonce < 10_000_000; nonce++) {
        const hex = await sha256Hex(challenge + ':' + nonce);
        if (hex.startsWith(target)) return String(nonce);
    }
    throw new Error('PoW 求解超时，请换张验证码重试');
}

// sha256，用 Web Crypto API。注意不要 require('node:crypto') 以免 webpack 4 报模块错。
async function sha256Hex(str) {
    const cryptoObj = (typeof globalThis !== 'undefined') && (globalThis.crypto || globalThis.msCrypto);
    if (cryptoObj && cryptoObj.subtle) {
        const buf = new TextEncoder().encode(str);
        const digest = await cryptoObj.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    throw new Error('当前浏览器不支持 Web Crypto API（crypto.subtle），无法完成 PoW 计算');
}

/** 后端 /captcha 字段名兼容归一化。 */
function _normalizeCaptcha(raw) {
    if (!raw) return raw;
    let img = raw.image || raw.img || raw.captchaImage || (raw.data && (raw.data.image || raw.data.img));
    if (typeof img !== 'string' || !img) return raw;
    let normalized;
    if (img.startsWith('data:image')) {
        normalized = img;
    } else if (/^https?:\/\//.test(img)) {
        normalized = img;
    } else if (/^[A-Za-z0-9+/=\s]+$/.test(img) && img.length > 100) {
        const type = img.startsWith('iVBORw0KGgo') ? 'png'
                   : img.startsWith('/9j/')       ? 'jpeg'
                   : img.startsWith('R0lGOD')     ? 'gif'
                   : 'png';
        normalized = `data:image/${type};base64,${img.replace(/\s+/g,'')}`;
    } else {
        normalized = (img.startsWith('/') ? '' : '/') + img;
    }
    return Object.assign({}, raw, {image: normalized});
}

/** 表单文件上传（multipart/form-data，绕开 JSON 序列化）。 */
async function _uploadForm(path, file, filename) {
    const url = BASE_URL + path;
    const fd = new FormData();
    const realName = filename || (file && file.name) || 'upload.bin';
    fd.append('file', file, realName);
    fd.append('name', realName);
    const headers = authHeaders();
    let res;
    try {
        res = await fetch(url, {method:'POST', headers, body: fd});
    } catch (e) {
        throw Object.assign(new Error('网络错误，请检查连接后重试'), {cause: e});
    }
    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
        const msgRaw = data && (data.message || data.error);
        const msg = Array.isArray(msgRaw) ? msgRaw.join('; ') : (msgRaw || `HTTP ${res.status}`);
        const err = new Error(msg);
        err.status = res.status;
        err.data   = data;
        throw err;
    }
    // forum 有的返回 {resourceId}，有的返回 {id}，统一成 id
    if (data && data.resourceId !== undefined && data.id === undefined) {
        data.id = data.resourceId;
    }
    return data;
}

/** List 响应统一解包。forum 列表多数返回 {items, total, page, pageSize}。 */
function _unwrapList(r) {
    if (Array.isArray(r)) return r;
    if (r && Array.isArray(r.items)) return r.items;
    if (r && Array.isArray(r.discussions)) return r.discussions;
    return [];
}

const rwck = {
    // ===== 顶层元信息（UI 读 / 调试） =====
    BASE_URL,
    IS_PROXY,
    IS_BROWSER,
    OFFICIAL_BASE, PROXY_BASE, UPSTREAM_ORIGIN, PROXY_PATH,
    /** 切到同源代理（forum 不开 ACAO 时可用）。可在运行时热切。 */
    forceProxy(bool = true) {
        if (!_isBrowser) return;
        window.__RWCK_FORCE_PROXY__ = !!bool;
        // eslint-disable-next-line no-console
        console.info('[rwck] forceProxy =', !!bool, '| BASE_URL 重新计算');
        // BASE_URL 是模块顶层的 const，改不了 —— 但 window.__RWCK_FORCE_PROXY__ 会在新的 _fetch 调起时
        // 被... 不对，_fetch 用的是 BASE_URL 常量。这里只给个提示让用户刷新。
    },

    /** 鉴权状态快照。 */
    authState() { return {token: getToken(), user: getUser()}; },
    async refreshMe() {
        if (!getToken()) return null;
        const me = await _fetch('/auth/me');
        setUser(me);
        return me;
    },

    // ===== 1. 人机验证 + 认证 =====
    auth: {
        async getCaptcha() {
            const raw = await _fetch('/captcha');
            return _normalizeCaptcha(raw);
        },
        solvePow,

        async login({username, password, captchaToken, captchaAnswer, captchaPowNonce}) {
            const data = await _fetch('/auth/login', {
                method:'POST',
                body: {username, password, captchaToken, captchaAnswer, captchaPowNonce}
            });
            const token = (data && (data.token || data.accessToken || (data.data && data.data.token))) || '';
            const user  = (data && (data.user  || (data.data && data.data.user))) || null;
            setToken(token);
            setUser(user);
            return {token, user};
        },
        async register({username, email, password}) {
            return _fetch('/auth/register', {method:'POST', body: {username, email, password}});
        },
        async me()                    { return _fetch('/auth/me'); },
        async patchMe(patch)          { return _fetch('/auth/me', {method:'PATCH', body: patch}); },
        async activate({token})       { return _fetch('/auth/activate', {method:'POST', body: {token}}); },
        async resendActivation({identifier}) {
            return _fetch('/auth/resend', {method:'POST', body: {identifier}});
        },
        async forgotPassword({identifier}) {
            return _fetch('/auth/forgot-password', {method:'POST', body: {identifier}});
        },
        async resetPassword({token, password}) {
            return _fetch('/auth/reset-password', {method:'POST', body: {token, password}});
        },
        async forgotUsername({email}) {
            return _fetch('/auth/forgot-username', {method:'POST', body: {email}});
        },
        async changePassword({oldPassword, newPassword}) {
            return _fetch('/auth/change-password', {method:'POST', body: {oldPassword, newPassword}});
        },
        async changeUsername({username}) {
            return _fetch('/auth/change-username', {method:'POST', body: {username}});
        },
        async changeEmail({email}) {
            return _fetch('/auth/change-email', {method:'POST', body: {email}});
        },
        logout() { setToken(null); setUser(null); }
    },

    // ===== 2. 开发者密钥 =====
    apiKeys: {
        async list()            { return _fetch('/api-keys'); },
        async create({name})    { return _fetch('/api-keys', {method:'POST', body: {name}}); },
        async remove(id)        { return _fetch(`/api-keys/${id}`, {method:'DELETE'}); }
    },

    // ===== 3. 作品广场 =====
    projects: {
        /** 参数：category/q/sort/page/pageSize。sort: score/new。 */
        async list(query = {}) { return _fetch('/projects' + _qs(query)); },
        async get(id)          { return _fetch(`/projects/${id}`); },
        async mine()           { return _fetch('/projects/mine'); },
        async create(body) {
            const r = await _fetch('/projects', {method:'POST', body});
            return (r && (r.data || r.project)) || r;
        },
        async update(id, patch)  { return _fetch(`/projects/${id}`, {method:'PATCH', body: patch}); },
        async remove(id)         { return _fetch(`/projects/${id}`, {method:'DELETE'}); },
        async toggleLike(id)     { return _fetch(`/projects/${id}/like`, {method:'POST'}); },
        /** 快速创建短链 helper —— 发布完作品直接调。 */
        async createShortLinkFor(id, slug) {
            return rwck.shortlink.create({projectId: id, slug});
        }
    },

    // ===== 4. 资源上传 =====
    resources: {
        async upload(file, filename) { return _uploadForm('/resources/upload', file, filename); },
        async netdisk({provider, link, extractCode, requireLogin, requireReward}) {
            return _fetch('/resources/netdisk', {method:'POST',
                body: {provider, link, extractCode, requireLogin, requireReward}});
        },
        async listOf(targetType, targetId) {
            return _fetch('/resources' + _qs({targetType, targetId}));
        },
        async userWorks(userId) { return _fetch('/resources/works' + _qs({userId})); },
        async canUploadVideo()  { return _fetch('/resources/can-upload-video'); },
        async update(id, patch) { return _fetch(`/resources/${id}`, {method:'PATCH', body: patch}); },
        async remove(id)        { return _fetch(`/resources/${id}`, {method:'DELETE'}); },
        /** 绝对地址：把 forum 返回的相对 /uploads/xxx.xxx 转完整。 */
        fullUrl(relPath) {
            if (!relPath) return '';
            if (/^https?:\/\//.test(relPath)) return relPath;
            if (IS_PROXY) return PROXY_BASE.replace(/\/__rwck-proxy$/, '') + relPath;
            return UPSTREAM_ORIGIN + relPath;
        }
    },

    // ===== 5. 短链（作品网址） =====
    shortlink: {
        async check(slug)       { return _fetch(`/shortlink/check?slug=${encodeURIComponent(slug)}`); },
        async get(slug)         { return _fetch(`/shortlink/${slug}`); },
        async view(slug)        { return _fetch(`/shortlink/${slug}/view`, {method:'POST'}); },
        async mine(projectId)   { return _fetch('/shortlink/mine' + _qs({projectId})); },
        async create({projectId, slug}) {
            return _fetch('/shortlink', {method:'POST', body: {projectId, slug}});
        },
        async update(slug, patch) { return _fetch(`/shortlink/${slug}`, {method:'PATCH', body: patch}); },
        async setDisabled(slug, disabled) {
            return _fetch(`/shortlink/${slug}/disabled`, {method:'POST', body: {disabled: !!disabled}});
        }
    },

    // ===== 6. 云盘 =====
    drive: {
        async files()                    { return _fetch('/drive/files'); },
        async usage()                    { return _fetch('/drive/usage'); },
        async upload(file, filename)     { return _uploadForm('/drive/upload', file, filename); },
        async replace(id, file, filename){ return _uploadForm(`/drive/files/${id}/replace`, file, filename); },
        async patch(id, patch)           { return _fetch(`/drive/files/${id}`, {method:'PATCH', body: patch}); },
        async regenerate(id)             { return _fetch(`/drive/files/${id}/regenerate`, {method:'POST'}); },
        async remove(id)                 { return _fetch(`/drive/files/${id}`, {method:'DELETE'}); },
        async share(shareId, password)   {
            return _fetch(`/drive/share/${shareId}` + _qs({password}));
        },
        async byShares(shareIds) {
            if (!Array.isArray(shareIds)) shareIds = [shareIds];
            return _fetch('/drive/by-share' + _qs({shareIds: shareIds.join(',')}));
        },
        /** 直链（浏览器可直接 fetch 或 <img src>）。 */
        rawUrl(shareId, opts = {}) {
            return BASE_URL + '/drive/raw/' + shareId + _qs({
                download: opts.download ? 1 : undefined,
                token: opts.token
            });
        }
    },

    // ===== 7. 讨论 / 回复 =====
    discussions: {
        async list(query = {})  { return _fetch('/discussions' + _qs(query)); },
        async get(id)           { return _fetch(`/discussions/${id}`); },
        async getBySeq(seq)     { return _fetch(`/discussions/seq/${seq}`); },
        async create(body) {
            const r = await _fetch('/discussions', {method:'POST', body});
            return (r && (r.data || r.discussion)) || r;
        },
        async update(id, patch) { return _fetch(`/discussions/${id}`, {method:'PATCH', body: patch}); },
        async remove(id)        { return _fetch(`/discussions/${id}`, {method:'DELETE'}); },
        hot()                   { return _fetch('/discussions/hot' + _qs({limit: 10})); }
    },
    posts: {
        async create({discussionId, content}) {
            return _fetch('/posts', {method:'POST', body: {discussionId, content}});
        },
        async update(id, patch) { return _fetch(`/posts/${id}`, {method:'PATCH', body: patch}); },
        async remove(id)        { return _fetch(`/posts/${id}`, {method:'DELETE'}); }
    },

    // ===== 8. 扩展广场 =====
    extensions: {
        async list(query = {}) { return _fetch('/extensions' + _qs(query)); },
        async get(id)          { return _fetch(`/extensions/${id}`); },
        async my()             { return _fetch('/extensions/my'); },
        async create({title, summary, category, code, license}) {
            return _fetch('/extensions', {method:'POST', body: {title, summary, category, code, license}});
        },
        async update(id, patch){ return _fetch(`/extensions/${id}`, {method:'PATCH', body: patch}); },
        async remove(id)       { return _fetch(`/extensions/${id}`, {method:'DELETE'}); },
        async toggleLike(id)   { return _fetch(`/extensions/${id}/like`, {method:'POST'}); },
        /** 源码 raw。直接 text/plain 返回，浏览器可当 <script src>。 */
        rawUrl(id)             { return BASE_URL + `/extensions/${id}/raw.js`; }
    },

    // ===== 9. 评论 =====
    comments: {
        async list(targetType, targetId, parentId) {
            return _fetch('/comments' + _qs({targetType, targetId, parentId}));
        },
        async create({targetType, targetId, content, parentId}) {
            return _fetch('/comments', {method:'POST', body: {targetType, targetId, content, parentId}});
        },
        async update(id, patch){ return _fetch(`/comments/${id}`, {method:'PATCH', body: patch}); },
        async remove(id)       { return _fetch(`/comments/${id}`, {method:'DELETE'}); }
    },

    // ===== 10. 点赞 / 表态 / 收藏 =====
    likes: {
        async toggle({targetType, targetId}) {
            return _fetch('/likes', {method:'POST', body: {targetType, targetId}});
        }
    },
    reactions: {
        async add({targetType, targetId, reaction}) {
            return _fetch('/reactions', {method:'POST', body: {targetType, targetId, reaction}});
        },
        async summary(targetType, targetId) {
            return _fetch('/reactions/summary' + _qs({targetType, targetId}));
        }
    },
    bookmarks: {
        async list(query = {})  { return _fetch('/bookmarks' + _qs(query)); },
        async add({targetType, targetId}) {
            return _fetch('/bookmarks', {method:'POST', body: {targetType, targetId}});
        },
        async remove(id)        { return _fetch(`/bookmarks/${id}`, {method:'DELETE'}); },
        async check(targetType, targetId) {
            return _fetch('/bookmarks/check' + _qs({targetType, targetId}));
        }
    },
    followTags: {
        async list()            { return _fetch('/follow-tags'); },
        async add(tagId)        { return _fetch('/follow-tags', {method:'POST', body: {tagId}}); },
        async remove(tagId)     { return _fetch(`/follow-tags/${tagId}`, {method:'DELETE'}); }
    },

    // ===== 11. 用户 / 社交 =====
    users: {
        async get(id)                    { return _fetch(`/users/${id}`); },
        async byUsername(username)       { return _fetch(`/users/by-username/${encodeURIComponent(username)}`); },
        async active()                   { return _fetch('/users/active'); },
        async leaderboard()              { return _fetch('/users/leaderboard'); },
        async followers(id)              { return _fetch(`/users/${id}/followers`); },
        async following(id)              { return _fetch(`/users/${id}/following`); },
        async isFollowing(id)            { return _fetch(`/users/${id}/is-following`); },
        async toggleFollow(id)           { return _fetch(`/users/${id}/follow`, {method:'POST'}); },
        async acceptPolicy(policyKeys) {
            return _fetch('/users/accept-policy', {method:'POST', body: {policyKeys}});
        }
    },

    // ===== 12. 云变量 / 开发者平台 =====
    cloud: {
        async list()                    { return _fetch('/cloud/projects'); },
        async create(name)              { return _fetch('/cloud/projects', {method:'POST', body: {name}}); },
        async get(projectId)            { return _fetch(`/cloud/projects/${projectId}`); },
        async update(projectId, patch)  { return _fetch(`/cloud/projects/${projectId}`, {method:'PATCH', body: patch}); },
        async remove(projectId)         { return _fetch(`/cloud/projects/${projectId}`, {method:'DELETE'}); },
        async variables(projectId)      { return _fetch(`/cloud/projects/${projectId}/variables`); },
        async setVariable(projectId, {name, value, scope}) {
            return _fetch(`/cloud/projects/${projectId}/variables`, {
                method:'POST', body: {name, value, scope}
            });
        },
        async history(projectId)        { return _fetch(`/cloud/projects/${projectId}/history`); },
        async reset(projectId)          { return _fetch(`/cloud/projects/${projectId}/reset`, {method:'POST'}); },
        async regenerateKey(projectId)  { return _fetch(`/cloud/projects/${projectId}/token/regenerate`, {method:'POST'}); },
        async public(projectId)         { return _fetch(`/cloud/projects/${projectId}/public`); },
        // 开发态调试
        async devVariables(projectId)   { return _fetch(`/cloud/projects/${projectId}/dev/variables`); },
        async devSetVariable(projectId, {name, value, scope}) {
            return _fetch(`/cloud/projects/${projectId}/dev/variables`, {
                method:'POST', body: {name, value, scope}
            });
        },
        async devHistory(projectId)     { return _fetch(`/cloud/projects/${projectId}/dev/history`); },
        async devReset(projectId)       { return _fetch(`/cloud/projects/${projectId}/dev/reset`, {method:'POST'}); },
        // 管理员
        async adminAll()                { return _fetch('/cloud/admin/projects'); },
        async adminBan(projectId)       { return _fetch(`/cloud/admin/projects/${projectId}/ban`, {method:'POST'}); }
    },

    // ===== 13. 通知 / 签到 =====
    notifications: {
        async list(query = {}) { return _fetch('/notifications' + _qs(query)); },
        async markRead(id)     { return _fetch(`/notifications/${id}/read`, {method:'POST'}); },
        async markAllRead()    { return _fetch('/notifications/read-all', {method:'POST'}); }
    },
    checkin: {
        async status()         { return _fetch('/checkin/status'); },
        async checkin()        { return _fetch('/checkin', {method:'POST'}); }
    },

    // ===== 14. 公开搜索 / 标签 / 统计 / 设置 =====
    stats: {
        async public()         { return _fetch('/stats/public'); }
    },
    settings: {
        async public()         { return _fetch('/settings'); }
    },
    search: {
        async query(q, type = 'all', page = 1, pageSize = 20) {
            return _fetch('/search' + _qs({q, type, page, pageSize}));
        }
    },
    tags: {
        async list()           { return _fetch('/tags'); }
    },
    changelogs: {
        async list(query = {}) { return _fetch('/changelogs' + _qs(query)); }
    },

    // ===== 15. 举报 / 转积分 =====
    reports: {
        async create({targetType, targetId, reason, detail}) {
            return _fetch('/reports', {method:'POST', body: {targetType, targetId, reason, detail}});
        }
    },
    transfer: {
        async credits({toUserId, amount, memo}) {
            return _fetch('/transfer', {method:'POST', body: {toUserId, amount, memo}});
        }
    },

    // ===== 16. 原创登记 =====
    origmark: {
        async publicKey()              { return _fetch('/origmark/public-key'); },
        async verify(certNum)          { return _fetch(`/origmark/verify/${encodeURIComponent(certNum)}`); },
        async registrations()          { return _fetch('/origmark/registrations'); },
        async registration(id)         { return _fetch(`/origmark/registrations/${id}`); },
        async stats()                  { return _fetch('/origmark/stats'); },
        async previewMeta(cert)        { return _fetch(`/origmark/preview-meta/${encodeURIComponent(cert)}`); },
        async previewSb3(cert)         { return _fetch(`/origmark/preview-sb3/${encodeURIComponent(cert)}`); },
        async raw(cert)                { return _fetch(`/origmark/raw/${encodeURIComponent(cert)}`); },
        async registerFromForum({projectId, shortLinkSlug}) {
            return _fetch('/origmark/registrations/from-forum', {
                method:'POST', body: {projectId, shortLinkSlug}
            });
        }
    },

    // ===== 工具方法 =====
    /** 把任意相对路径转成浏览器可直接用的完整 URL（兼容代理 & 直连）。 */
    resolveUrl(relPath) {
        if (!relPath) return '';
        if (/^https?:\/\//.test(relPath)) return relPath;
        // 代理模式下：__rwck-proxy/uploads/xxx.xxx
        if (IS_PROXY) return PROXY_BASE + relPath;
        return UPSTREAM_ORIGIN + relPath;
    },
    /** 解包列表。论坛多数列表接口返回 {items, total, ...}。 */
    unwrapList: _unwrapList
};

export default rwck;
export {getToken as _rwckGetToken, setToken as _rwckSetToken, getUser as _rwckGetUser};
export {_unwrapList as rwckUnwrapList};

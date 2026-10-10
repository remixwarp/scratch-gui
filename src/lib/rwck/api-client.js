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
 *   - 全部请求直连官方 https://forum.ctspace.xyz/api（不再有同源代理）。
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

// 用户自部署的 cors-anywhere（Cloudflare Worker）。
// 用法：
//   https://cors-api.rewp.de5.net/?url=<完整目标URL>
// 代理会原样转发 method / headers / body，回 Access-Control-Allow-Origin: *。
// 详见 https://github.com/remixwarp/cors-anywhere 。
export const CORS_ANYWHERE  = 'https://cors-api.rewp.de5.net';

/** 构造经 cors-anywhere 代理的完整目标 URL。
 *  比如 `_proxyUrl('https://forum.ctspace.xyz/api/stats/public')`
 *  → `https://cors-api.rewp.de5.net/?url=https%3A%2F%2Fforum.ctspace.xyz%2Fapi%2Fstats%2Fpublic`
 *
 *  `force=false` 时：浏览器环境下默认走 cors-anywhere（绕开 forum 未回 ACAO 的跨域），
 *  但当 window.__RWCK_DIRECT_API__ === true 时退回官方直连。
 *  可在控制台 `window.__RWCK_DIRECT_API__ = true; location.reload();` 临时直连调试。
 */
export function _proxyUrl(targetFullUrl, force /*?: boolean*/) {
    if (!targetFullUrl) return '';
    if (!/^https?:\/\//.test(targetFullUrl)) return targetFullUrl;

    // 直连开关：用户强制直连 / 已有代理前缀就不再包
    if (force === false) return targetFullUrl;
    if (targetFullUrl.startsWith(CORS_ANYWHERE)) return targetFullUrl;
    if (_isBrowser && window.__RWCK_DIRECT_API__) return targetFullUrl;

    return CORS_ANYWHERE + '/?url=' + encodeURIComponent(targetFullUrl);
}

export const BASE_URL    = CORS_ANYWHERE + '/?url=' + encodeURIComponent(OFFICIAL_BASE);
export const IS_PROXY    = true;  // 始终经由 cors-anywhere 转发
export const IS_BROWSER  = _isBrowser;

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

// ===== 网络请求日志（调试用）=====
// 所有经由 _fetch / _uploadForm 的请求与响应都会被记录到 window.__rwckNetLog，
// 并在界面右下角的「显示日志」按钮中查看 / 复制。密码 / token 会被脱敏。
const _NET_LOG_MAX = 300;
const _netLog = [];
let _reqSeq = 0;
function _redact(v) {
    if (v == null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(_redact);
    const out = {};
    for (const k of Object.keys(v)) {
        if (/pass|secret|token/i.test(k) && typeof v[k] === 'string') out[k] = '***';
        else out[k] = _redact(v[k]);
    }
    return out;
}
function _redactHeaders(h) {
    const out = {};
    for (const k of Object.keys(h || {})) {
        out[k] = /authorization/i.test(k) ? 'Bearer ***' : h[k];
    }
    return out;
}
function _truncate(v, max = 2000) {
    if (v == null) return v;
    let s;
    try { s = typeof v === 'string' ? v : JSON.stringify(v); } catch { s = String(v); }
    if (s.length > max) s = s.slice(0, max) + ` …(截断 ${s.length - max} 字符)`;
    return s;
}
function _logNet(entry) {
    _netLog.push(Object.assign({t: Date.now()}, entry));
    if (_netLog.length > _NET_LOG_MAX) _netLog.shift();
    if (_isBrowser) { try { window.__rwckNetLog = _netLog; } catch (_) {} }
}
export function getNetLog() { return _netLog; }
export function clearNetLog() { _netLog.length = 0; }

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
    let sentBody;
    if (body && typeof body !== 'string' && !(body instanceof FormData)) {
        sentBody = body;
        body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
    } else if (body instanceof FormData) {
        sentBody = '[FormData]';
    } else {
        sentBody = body || null;
    }
    const method = options.method || 'GET';
    const reqId = ++_reqSeq;
    _logNet({id: reqId, dir: '→ 发送', method, url, headers: _redactHeaders(headers), body: _redact(sentBody)});
    const init = {
        method,
        headers,
        ...(body !== undefined ? {body} : {})
    };
    let res;
    try {
        res = await fetch(url, init);
    } catch (e) {
        _logNet({id: reqId, dir: '✗ 网络错误', method, url, error: String((e && e.message) || e)});
        throw Object.assign(new Error('网络错误，请检查连接后重试'), {cause: e});
    }
    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
        const msgRaw = data && (data.message || data.error);
        const msg = Array.isArray(msgRaw) ? msgRaw.join('; ') : (msgRaw || `HTTP ${res.status}`);
        _logNet({id: reqId, dir: '← 接收(错误)', method, url, status: res.status, ok: false, error: msg, data: _truncate(data)});
        const err = new Error(msg);
        err.status = res.status;
        err.data   = data;
        throw err;
    }
    _logNet({id: reqId, dir: '← 接收', method, url, status: res.status, ok: true, data: _truncate(data)});
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
    const reqId = ++_reqSeq;
    _logNet({id: reqId, dir: '→ 发送(上传)', method: 'POST', url, headers: _redactHeaders(headers), body: {file: realName}});
    let res;
    try {
        res = await fetch(url, {method:'POST', headers, body: fd});
    } catch (e) {
        _logNet({id: reqId, dir: '✗ 网络错误', method: 'POST', url, error: String((e && e.message) || e)});
        throw Object.assign(new Error('网络错误，请检查连接后重试'), {cause: e});
    }
    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
        const msgRaw = data && (data.message || data.error);
        const msg = Array.isArray(msgRaw) ? msgRaw.join('; ') : (msgRaw || `HTTP ${res.status}`);
        _logNet({id: reqId, dir: '← 接收(错误)', method: 'POST', url, status: res.status, ok: false, error: msg, data: _truncate(data)});
        const err = new Error(msg);
        err.status = res.status;
        err.data   = data;
        throw err;
    }
    _logNet({id: reqId, dir: '← 接收', method: 'POST', url, status: res.status, ok: true, data: _truncate(data)});
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

/** 把 forum 返回的相对路径 / 绝对路径统一成完整的 forum URL。
 *  /uploads/a.png → https://forum.ctspace.xyz/uploads/a.png
 *  https://xxx.com/a.png  → 原样
 */
function resolveFull(path) {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    if (path.startsWith('data:') || path.startsWith('//')) return path;
    const normalized = path.startsWith('/') ? path : '/' + path;
    return UPSTREAM_ORIGIN + normalized;
}

const rwck = {
    // ===== 顶层元信息（UI 读 / 调试） =====
    BASE_URL,
    IS_BROWSER,
    OFFICIAL_BASE, UPSTREAM_ORIGIN,

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
        /** 注册不需要人机验证（官方前端已移除，见文档 §2.3）。
         *  注册后账号为「未激活」态，须点邮件激活链接才能登录，故此处不写入会话。 */
        async register({username, email, password}) {
            return _fetch('/auth/register', {method:'POST', body: {username, email, password}});
        },
        /** 重发激活邮件（POST /auth/resend，body: { identifier }，identifier 为邮箱或用户名）。 */
        async resend({identifier}) {
            return _fetch('/auth/resend', {method:'POST', body: {identifier}});
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
        async remove(id)        { return _fetch(`/api-keys/${id}`, {method:'DELETE'}); },
        async setScopes(id, scopes) {
            return _fetch(`/api-keys/${id}/scopes`, {method:'PATCH', body: {scopes}});
        }
    },

    // ===== 3. 作品广场 =====
    projects: {
        /** 参数：category/q/sort/page/pageSize。sort: score/new。 */
        async list(query = {}) { return _fetch('/projects' + _qs(query)); },
        async get(id)          { return _fetch(`/projects/${id}`); },
        /** 文档里的路径是 /projects/my（不是 /mine）。 */
        async mine()           { return _fetch('/projects/my'); },
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
        async rewarded()        { return _fetch('/resources/rewarded'); },
        async canUploadVideo()  { return _fetch('/resources/can-upload-video'); },
        async update(id, patch) { return _fetch(`/resources/${id}`, {method:'PATCH', body: patch}); },
        async remove(id)        { return _fetch(`/resources/${id}`, {method:'DELETE'}); },
        /** 绝对地址：把 forum 返回的相对 /uploads/xxx.xxx 转完整。 */
        fullUrl(relPath) {
            if (!relPath) return '';
            return _proxyUrl(resolveFull(relPath));
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
            const upstream = OFFICIAL_BASE.replace(/\/$/, '') + '/drive/raw/' + shareId + _qs({
                download: opts.download ? 1 : undefined,
                token: opts.token
            });
            return _proxyUrl(upstream);
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
        rawUrl(id)             { return _proxyUrl(OFFICIAL_BASE.replace(/\/$/, '') + `/extensions/${id}/raw.js`); }
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
        async remove(tagId)     { return _fetch(`/follow-tags/${tagId}`, {method:'DELETE'}); },
        async check(tagId)      { return _fetch('/follow-tags/check' + _qs({tagId})); }
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
        async public()         { return _fetch('/stats/public'); },
        /** 上报一次访问。 */
        async visit()          { return _fetch('/stats/visit', {method:'POST'}); }
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
        async list()           { return _fetch('/tags'); },
        async create({name, slug, description}) {
            return _fetch('/tags', {method:'POST', body: {name, slug, description}});
        },
        async update(id, patch) { return _fetch(`/tags/${id}`, {method:'PATCH', body: patch}); },
        async remove(id)        { return _fetch(`/tags/${id}`, {method:'DELETE'}); }
    },
    changelogs: {
        async list(query = {}) { return _fetch('/changelogs' + _qs(query)); },
        async create(body)      { return _fetch('/changelogs', {method:'POST', body}); },
        async remove(id)        { return _fetch(`/changelogs/${id}`, {method:'DELETE'}); }
    },
    /** 在线状态（presence）。 */
    presence: {
        async heartbeat()      { return _fetch('/presence/heartbeat', {method:'POST'}); },
        async online()         { return _fetch('/presence/online'); }
    },
    /** 投票（polls）。 */
    polls: {
        async list(query = {}) { return _fetch('/polls' + _qs(query)); },
        async create(body)     { return _fetch('/polls', {method:'POST', body}); },
        async vote(id, optionIds) {
            return _fetch(`/polls/${id}/vote`, {method:'POST', body: {optionIds}});
        },
        async remove(id)       { return _fetch(`/polls/${id}`, {method:'DELETE'}); }
    },
    /** 站内信 / 客服会话（chat）。 */
    chat: {
        async conversations()  { return _fetch('/chat/conversations'); },
        async createConversation(body) {
            return _fetch('/chat/conversations', {method:'POST', body});
        },
        async messages(id)     { return _fetch(`/chat/conversations/${id}/messages`); },
        async send(id, body)   { return _fetch(`/chat/conversations/${id}/messages`, {method:'POST', body}); },
        async close(id)        { return _fetch(`/chat/conversations/${id}/close`, {method:'PATCH'}); }
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
        },
        async registerExternal(body) {
            return _fetch('/origmark/registrations/external', {method:'POST', body});
        },
        async mine()                   { return _fetch('/origmark/me/registrations'); },
        async report(id, body)         {
            return _fetch(`/origmark/registrations/${id}/report`, {method:'POST', body});
        },
        async requestDownload(id, body) {
            return _fetch(`/origmark/registrations/${id}/download-request`, {method:'POST', body});
        },
        async requestSync(id, body)    {
            return _fetch(`/origmark/registrations/${id}/sync-request`, {method:'POST', body});
        },
        async syncRequests()           { return _fetch('/origmark/me/sync-requests'); },
        async approveSync(id)          {
            return _fetch(`/origmark/me/sync-requests/${id}/approve`, {method:'POST'});
        },
        async rejectSync(id)           {
            return _fetch(`/origmark/me/sync-requests/${id}/reject`, {method:'POST'});
        },
        async downloadRequests()       { return _fetch('/origmark/me/download-requests'); },
        async approveDownload(id)      {
            return _fetch(`/origmark/me/download-requests/${id}/approve`, {method:'POST'});
        },
        async rejectDownload(id)       {
            return _fetch(`/origmark/me/download-requests/${id}/reject`, {method:'POST'});
        },
        async updatePreview(id, patch) {
            return _fetch(`/origmark/me/registrations/${id}/preview`, {method:'PATCH', body: patch});
        }
    },

    // ===== 工具方法 =====
    /** 把任意相对路径转成完整 forum URL（浏览器侧还会再套一层 cors-anywhere 代理）。 */
    resolveUrl(relPath) {
        if (!relPath) return '';
        return _proxyUrl(resolveFull(relPath));
    },
    /** 解包列表。论坛多数列表接口返回 {items, total, ...}。 */
    unwrapList: _unwrapList
};

export default rwck;
export {getToken as _rwckGetToken, setToken as _rwckSetToken, getUser as _rwckGetUser};
export {_unwrapList as rwckUnwrapList};

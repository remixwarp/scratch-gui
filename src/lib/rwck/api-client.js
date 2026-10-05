/**
 * 创客次元（极光论坛）前端 API 客户端。
 * Base URL: https://forum.ctspace.xyz/api
 * 文档版本：2026-09-26 · 对应站点 v3.0
 *
 * 设计目标：
 *   - 纯浏览器 ES module（scratch-gui webpack 4 能直接 import）。
 *   - 所有 fetch 统一 CORS + 错误处理 + JWT 注入。
 *   - Token 持久化到 localStorage（rwck:token / rwck:user）。
 *   - 提供人机验证三件套（图形验证码 / PoW 求解 / 登录）。
 *
 * 使用：
 *   import rwck from './rwck/api-client';
 *   const captcha = await rwck.auth.getCaptcha();      // { token, image, pow }
 *   const nonce   = rwck.auth.solvePow(captcha.pow);    // 同步
 *   const login   = await rwck.auth.login({...});        // 自动存 token
 *   const projects = await rwck.projects.list();
 */

/**
 * 创客次元（极光论坛）前端 API 客户端。
 * Base URL: https://forum.ctspace.xyz/api  —— 浏览器实际走同源代理
 *
 * CORS 策略说明：forum.ctspace.xyz 未回显 Access-Control-Allow-Origin，
 * 创客次元 API 客户端。
 *
 * 请求路由策略（双通道自动回退）：
 *   1) 直连模式（首选）：直接 fetch https://forum.ctspace.xyz/api/...
 *      forum.ctspace.xyz 已经回了
 *        access-control-allow-credentials: true
 *        access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,HEAD
 *        access-control-allow-headers: content-type,authorization
 *      OPTIONS 预检 204。只差一个 Access-Control-Allow-Origin: *，
 *      但近期开发者很可能会补上，届时直连会直接 100% 可用。
 *
 *   2) 代理回退（兜底）：如果直连被浏览器拦（fetch 抛 TypeError），
 *      自动切到同源代理 /__rwck-proxy/...
 *
 *   dev-server 和 CF Pages Function 仍然维护着 /__rwck-proxy 代理，
 *   但不再是主路由，只当 forum 没完整开 CORS 时的保险。
 */

// 运行时判定浏览器 vs Node
const _isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const _env = typeof process !== 'undefined' && process.env ? process.env : {};
export const BASE_URL = 'https://forum.ctspace.xyz/api';
export const PROXY_URL = '/__rwck-proxy';
export const UPSTREAM_ORIGIN = 'https://forum.ctspace.xyz';
export const PROXY_PATH      = '/__rwck-proxy';
export const IS_BROWSER      = _isBrowser;

// 内存缓存：上次直连是否成功。首次请求默认尝试直连，失败后自动切代理，
// 并把下次请求也直接走代理，避免每次都有一次 CORS 失败往返。
let _directOK = null; // null=未探测, true=直连ok, false=直连失败
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

/** 统一 fetch：JSON 请求体 + JSON 响应解析 + 错误归一化 + 直连↔代理双通道回退。 */
async function _fetch(path, options = {}) {
    // 组装 headers（所有 channel 共用，带 Authorization）
    const authHdrs = authHeaders();
    const baseHdrs = Object.assign(
        {'Accept': 'application/json'},
        authHdrs,
        options.headers || {}
    );
    const jsonHeaders = Object.assign({'Content-Type': 'application/json'}, baseHdrs);
    let body = options.body;
    if (body && typeof body !== 'string' && !(body instanceof FormData)) {
        body = JSON.stringify(body);
    }

    const initCommon = { method: options.method || 'GET', headers: baseHdrs };
    if (body !== undefined && initCommon.method !== 'GET' && initCommon.method !== 'HEAD') {
        initCommon.body = body instanceof FormData ? body : body;
        // FormData 不能带 Content-Type（让浏览器写 boundary）
        if (!(body instanceof FormData)) initCommon.headers = jsonHeaders;
    } else {
        initCommon.headers = baseHdrs;
    }

    // 尝试顺序：上次成功过的 channel 优先；首次默认直连
    const tryDirect = _directOK !== false; // null 或 true → 先试直连
    const tryProxy  = _directOK !== true;  // null 或 false → 准备代理回退
    const channels  = tryDirect ? [BASE_URL] : [];
    if (tryProxy) channels.push(PROXY_URL);

    let lastError;
    for (const root of channels) {
        const url = root + path;
        let res;
        try {
            res = await fetch(url, initCommon);
        } catch (e) {
            // 只有 TypeError 才回退（浏览器 CORS 拦截），其他错误（DNS 404）直接上抛
            if (!(e instanceof TypeError)) throw e;
            lastError = e;
            _directOK = false;
            continue;
        }
        // 直连返回了响应体（不管 HTTP status）都算"通"，下次继续直连
        if (root === BASE_URL) _directOK = true;
        let data;
        try { data = await res.json(); } catch { data = null; }
        if (!res.ok) {
            const err = new Error(data && (data.message || data.error) || `HTTP ${res.status}`);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }
    // 所有 channel 都挂了
    throw Object.assign(new Error('创客次元 API 暂时不可用，请稍后重试'),
        {cause: lastError});
}

/** 工作量证明（前端同步计算，几十毫秒）。 */
function solvePow({challenge, difficulty}) {
    const target = '0'.repeat(difficulty || 4);
    // 浏览器没有 node:crypto，用 Web Crypto 的 digest。
    // 为了跨浏览器兼容，退而用纯 JS sha256（极小性能，足够 4 位难度）。
    for (let nonce = 0; nonce < 10_000_000; nonce++) {
        const hex = sha256Hex(challenge + ':' + nonce);
        if (hex.startsWith(target)) return String(nonce);
    }
    throw new Error('PoW 求解超时，请换张验证码重试');
}

// 极简 JS sha256（仅用于 PoW，不在乎体积）。
function sha256Hex(str) {
    function k(n) { return (Math.sin(n + 1) * 4294967296) | 0; }
    function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) | 0; }
    function ch(x, y, z) { return (x & y) ^ (~x & z); }
    function maj(x, y, z){ return (x & y) ^ (x & z) ^ (y & z); }
    function sig0(x){ return rotr(x,2)^rotr(x,13)^rotr(x,22); }
    function sig1(x){ return rotr(x,6)^rotr(x,11)^rotr(x,25); }
    function gam0(x){ return rotr(x,7)^rotr(x,18)^(x>>>3); }
    function gam1(x){ return rotr(x,17)^rotr(x,19)^(x>>>10); }

    // UTF-8 编码
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 0x80) bytes.push(c);
        else if (c < 0x800) { bytes.push(0xc0|(c>>6), 0x80|(c&0x3f)); }
        else { bytes.push(0xe0|(c>>12), 0x80|((c>>6)&0x3f), 0x80|(c&0x3f)); }
    }
    const len = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (let i = 56; i >= 0; i -= 8) bytes.push((len / Math.pow(2, i)) & 0xff);

    const K = []; for (let i=0;i<64;i++) K.push(k(i));
    let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,
        h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;

    for (let off=0; off<bytes.length; off+=64) {
        const w = new Int32Array(64);
        for (let i=0;i<16;i++) {
            w[i] = (bytes[off+i*4]<<24)|(bytes[off+i*4+1]<<16)|(bytes[off+i*4+2]<<8)|bytes[off+i*4+3];
        }
        for (let i=16;i<64;i++) w[i] = (gam1(w[i-2])+w[i-7]+gam0(w[i-15])+w[i-16])|0;
        let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,hh=h7;
        for (let i=0;i<64;i++) {
            const t1 = (hh + sig1(e) + ch(e,f,g) + K[i] + w[i])|0;
            const t2 = (sig0(a) + maj(a,b,c))|0;
            hh = g; g = f; f = e; e = (d + t1)|0; d = c; c = b; b = a; a = (t1 + t2)|0;
        }
        h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;
        h4=(h4+e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+hh)|0;
    }
    const toHex = n => (n>>>0).toString(16).padStart(8,'0');
    return toHex(h0)+toHex(h1)+toHex(h2)+toHex(h3)+toHex(h4)+toHex(h5)+toHex(h6)+toHex(h7);
}

const rwck = {
    BASE_URL,
    authState: () => ({token: getToken(), user: getUser(), loggedIn: !!getToken()}),

    auth: {
        // ---- 人机验证 + 登录 ----
        getCaptcha:            ()          => _fetch('/captcha').then(_normalizeCaptcha),
        login:                 body        => _fetch('/auth/login', {method:'POST', body}).then(r => {
            setToken(r.token); setUser(r.user); return r;
        }),
        register:              body        => _fetch('/auth/register', {method:'POST', body}),
        activate:              token       => _fetch('/auth/activate', {method:'POST', body:{token}}),
        resend:                identifier  => _fetch('/auth/resend', {method:'POST', body:{identifier}}),
        forgotPassword:        identifier  => _fetch('/auth/forgot-password', {method:'POST', body:{identifier}}),
        resetPassword:         body        => _fetch('/auth/reset-password', {method:'POST', body}),
        forgotUsername:        identifier  => _fetch('/auth/forgot-username', {method:'POST', body:{identifier}}),
        me:                    ()          => _fetch('/auth/me').then(u => { setUser(u); return u; }),
        updateMe:              patch       => _fetch('/auth/me', {method:'PATCH', body:patch}).then(u => { setUser(u); return u; }),
        changePassword:        body        => _fetch('/auth/change-password', {method:'POST', body}),
        changeUsername:        body        => _fetch('/auth/change-username', {method:'POST', body}),
        changeEmail:           body        => _fetch('/auth/change-email', {method:'POST', body}),
        logout:                ()          => { setToken(null); setUser(null); },
        solvePow, sha256Hex
    },

    projects: {
        list:          (q={})           => _fetch('/projects' + toQs(q)),
        get:           (id)             => _fetch(`/projects/${id}`),
        mine:          ()               => _fetch('/projects/my'),
        create:        (body)           => _fetch('/projects', {method:'POST', body}),
        update:        (id, patch)      => _fetch(`/projects/${id}`, {method:'PATCH', body:patch}),
        del:           (id)             => _fetch(`/projects/${id}`, {method:'DELETE'}),
        like:          (id)             => _fetch(`/projects/${id}/like`, {method:'POST'})
    },

    discussions: {
        list:          (q={})           => _fetch('/discussions' + toQs(q)),
        get:           (id)             => _fetch(`/discussions/${id}`),
        getBySeq:      (seq)            => _fetch(`/discussions/seq/${seq}`),
        create:        (body)           => _fetch('/discussions', {method:'POST', body}),
        update:        (id, patch)      => _fetch(`/discussions/${id}`, {method:'PATCH', body:patch}),
        del:           (id)             => _fetch(`/discussions/${id}`, {method:'DELETE'})
    },

    posts: {
        create:        (body)           => _fetch('/posts', {method:'POST', body}),
        update:        (id, patch)      => _fetch(`/posts/${id}`, {method:'PATCH', body:patch}),
        del:           (id)             => _fetch(`/posts/${id}`, {method:'DELETE'})
    },

    resources: {
        /** 上传任意文件（multipart，字段 file + name，中文文件名务必走 name）。 */
        upload:        (file, name=null)=> {
            const fd = new FormData();
            fd.append('file', file, name || file.name);
            fd.append('name', name || file.name);
            return _fetch('/resources/upload', {method:'POST', body:fd});
        },
        listByTarget:  (q={})           => _fetch('/resources' + toQs(q)),
        mineWorks:     ()               => _fetch('/resources/works'),
        canUploadVideo:()               => _fetch('/resources/can-upload-video'),
        update:        (id, patch)      => _fetch(`/resources/${id}`, {method:'PATCH', body:patch}),
        del:           (id)             => _fetch(`/resources/${id}`, {method:'DELETE'})
    },

    shortlink: {
        check:         (slug)           => _fetch(`/shortlink/check?slug=${encodeURIComponent(slug)}`),
        get:           (slug)           => _fetch(`/shortlink/${slug}`),
        view:          (slug)           => _fetch(`/shortlink/${slug}/view`, {method:'POST'}),
        mine:          (projectId)      => _fetch(`/shortlink/mine?projectId=${encodeURIComponent(projectId)}`),
        create:        (body)           => _fetch('/shortlink', {method:'POST', body}),
        update:        (slug, patch)    => _fetch(`/shortlink/${slug}`, {method:'PATCH', body:patch}),
        disable:       (slug, disabled) => _fetch(`/shortlink/${slug}/disabled`, {method:'POST', body:{disabled}})
    },

    drive: {
        files:         (q={})           => _fetch('/drive/files' + toQs(q)),
        usage:         ()               => _fetch('/drive/usage'),
        upload:        (file, name=null)=> {
            const fd = new FormData();
            fd.append('file', file, name || file.name);
            fd.append('name', name || file.name);
            return _fetch('/drive/upload', {method:'POST', body:fd});
        },
        replace:       (id, file, name=null) => {
            const fd = new FormData();
            fd.append('file', file, name || file.name);
            fd.append('name', name || file.name);
            return _fetch(`/drive/files/${id}/replace`, {method:'POST', body:fd});
        },
        update:        (id, patch)      => _fetch(`/drive/files/${id}`, {method:'PATCH', body:patch}),
        regenerate:    (id)             => _fetch(`/drive/files/${id}/regenerate`, {method:'POST'}),
        del:           (id)             => _fetch(`/drive/files/${id}`, {method:'DELETE'}),
        share:         (shareId, password=null) =>
            _fetch(`/drive/share/${shareId}${password ? '?password='+encodeURIComponent(password) : ''}`),
        rawUrl:        (shareId, token=null, download=false) =>
            BASE_URL + `/drive/raw/${shareId}` +
            (download ? '?download=1' : '') + (token ? (download?'&token=':'?token=') + encodeURIComponent(token) : ''),
        byShare:       (shareIds)       => _fetch(`/drive/by-share?shareIds=${shareIds.join(',')}`)
    },

    users: {
        get:           (id)             => _fetch(`/users/${id}`),
        byUsername:    (username)       => _fetch(`/users/by-username/${username}`),
        followers:     (id, q={})       => _fetch(`/users/${id}/followers` + toQs(q)),
        following:     (id, q={})       => _fetch(`/users/${id}/following` + toQs(q)),
        isFollowing:   (id)             => _fetch(`/users/${id}/is-following`),
        follow:        (id)             => _fetch(`/users/${id}/follow`, {method:'POST'}),
        active:        (q={})           => _fetch('/users/active' + toQs(q)),
        leaderboard:   (q={})           => _fetch('/users/leaderboard' + toQs(q)),
        acceptPolicy:  ()               => _fetch('/users/accept-policy', {method:'POST'})
    },

    comments: {
        list:          (targetType, targetId, q={}) =>
            _fetch(`/comments?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}` + toQs(q)),
        create:        (body)           => _fetch('/comments', {method:'POST', body}),
        update:        (id, patch)      => _fetch(`/comments/${id}`, {method:'PATCH', body:patch}),
        del:           (id)             => _fetch(`/comments/${id}`, {method:'DELETE'})
    },

    likes:       (body) => _fetch('/likes', {method:'POST', body}),
    reactions: {
        create:        (body)           => _fetch('/reactions', {method:'POST', body}),
        summary:       (q={})           => _fetch('/reactions/summary' + toQs(q))
    },

    bookmarks: {
        list:          (q={})           => _fetch('/bookmarks' + toQs(q)),
        create:        (body)           => _fetch('/bookmarks', {method:'POST', body}),
        check:         (targetType, targetId) =>
            _fetch(`/bookmarks/check?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`)
    },

    apiKeys: {
        list:          ()               => _fetch('/api-keys'),
        create:        (name)           => _fetch('/api-keys', {method:'POST', body:{name}}),
        del:           (id)             => _fetch(`/api-keys/${id}`, {method:'DELETE'})
    },

    cloud: {
        projects:      ()               => _fetch('/cloud/projects'),
        create:        (body)           => _fetch('/cloud/projects', {method:'POST', body}),
        project:       (id)             => _fetch(`/cloud/projects/${id}`),
        update:        (id, patch)      => _fetch(`/cloud/projects/${id}`, {method:'PATCH', body:patch}),
        del:           (id)             => _fetch(`/cloud/projects/${id}`, {method:'DELETE'}),
        variables:     (id)             => _fetch(`/cloud/projects/${id}/variables`),
        setVariable:   (id, body)       => _fetch(`/cloud/projects/${id}/variables`, {method:'POST', body}),
        history:       (id)             => _fetch(`/cloud/projects/${id}/history`),
        reset:         (id)             => _fetch(`/cloud/projects/${id}/reset`, {method:'POST'}),
        regenerateKey: (id)             => _fetch(`/cloud/projects/${id}/token/regenerate`, {method:'POST'}),
        publicVars:    (id)             => _fetch(`/cloud/projects/${id}/public`)
    },

    extensions: {
        list:          (q={})           => _fetch('/extensions' + toQs(q)),
        get:           (id)             => _fetch(`/extensions/${id}`),
        raw:           (id)             => BASE_URL + `/extensions/${id}/raw`,
        mine:          ()               => _fetch('/extensions/my'),
        create:        (body)           => _fetch('/extensions', {method:'POST', body}),
        update:        (id, patch)      => _fetch(`/extensions/${id}`, {method:'PATCH', body:patch}),
        del:           (id)             => _fetch(`/extensions/${id}`, {method:'DELETE'}),
        like:          (id)             => _fetch(`/extensions/${id}/like`, {method:'POST'})
    },

    notifications: {
        list:          (q={})           => _fetch('/notifications' + toQs(q)),
        read:          (id)             => _fetch(`/notifications/${id}/read`, {method:'POST'})
    },

    settings: () => _fetch('/settings')
};

function toQs(obj) {
    const keys = Object.keys(obj);
    if (!keys.length) return '';
    return '?' + keys
        .filter(k => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
        .join('&');
}

/** 后端 /captcha 可能返回：
 *   - {image:'data:image/png;base64,...'}  —— 完整 data URL（forum.ctspace.xyz 当前格式）
 *   - {image:'/static/xxx.png'}           —— 相对 URL
 *   - {image:'abc123...裸 base64'}        —— 不带 data 前缀
 *   - {img:'...'} / {captcha:'...'}       —— 字段名换了
 * 统一归一化成 {image:<浏览器可直接当 img.src 用的字符串>, token, pow}。
 */
function _normalizeCaptcha(raw) {
    if (!raw) return raw;
    // 字段兼容：image / img / captchaImage / data
    let img = raw.image || raw.img || raw.captchaImage || (raw.data && (raw.data.image || raw.data.img));
    if (typeof img !== 'string' || !img) {
        console.warn('[rwck] captcha 返回里找不到 image 字段，完整响应:', raw);
        return raw;
    }
    let normalized;
    if (img.startsWith('data:image')) {
        normalized = img;
    } else if (/^https?:\/\//.test(img)) {
        normalized = img;
    } else if (/^[A-Za-z0-9+/=\s]+$/.test(img) && img.length > 100) {
        // 看起来是裸 base64：按头部判断 png/jpeg，否则默认 png
        const type = img.startsWith('iVBORw0KGgo') ? 'png'
                   : img.startsWith('/9j/')       ? 'jpeg'
                   : img.startsWith('R0lGOD')     ? 'gif'
                   : 'png';
        normalized = `data:image/${type};base64,${img.replace(/\s+/g,'')}`;
    } else {
        // 相对 URL（如 /captcha/img?token=xxx），拼成同源代理绝对路径
        normalized = (img.startsWith('/') ? '' : '/') + img;
    }
    return Object.assign({}, raw, {image: normalized});
}

export default rwck;
// 注意：BASE_URL 在文件顶部已经 export const 过了，这里不要再 re-export 它。
export {getToken as _rwckGetToken, setToken as _rwckSetToken, getUser as _rwckGetUser};

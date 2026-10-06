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
 * forum.ctspace.xyz 不开 CORS（未回 Access-Control-Allow-Origin），
 * 浏览器端统一走同源代理 /__rwck-proxy，由 dev-server before() 或
 * Cloudflare Pages Function 转发到 https://forum.ctspace.xyz/api/。
 */


// 运行时判定浏览器 vs Node
const _isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const _env = typeof process !== 'undefined' && process.env ? process.env : {};
export const BASE_URL = _isBrowser
    ? '/__rwck-proxy'                   // 浏览器强制同源代理（forum 不开 CORS）
    : 'https://forum.ctspace.xyz/api';   // Node/SSR 直连上游
export const PROXY_URL = '/__rwck-proxy';
export const UPSTREAM_ORIGIN = 'https://forum.ctspace.xyz';
export const PROXY_PATH      = '/__rwck-proxy';
export const IS_BROWSER      = _isBrowser;

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
/**
 * 统一 fetch。浏览器 BASE_URL=/__rwck-proxy（同源代理），Node 直连 forum。
 */
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
        // message 有时是数组（class-validator 返回 ["field must be..."]），
        // 有时是字符串，有时是后端的 i18n key。全收。
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

// sha256，用 Web Crypto API（浏览器端 scratch-gui 只会走这里）。
// async，结果和 Node crypto.createHash('sha256').digest('hex') 完全一致。
// 注意：不要在这里写 require('crypto') / import('node:crypto') ——
// webpack 4 在生产构建时会把动态 import 也当成静态依赖去 resolve，
// 而 Node 内置模块在浏览器 bundle 里根本不存在，直接抛 ModuleNotFoundError。
async function sha256Hex(str) {
    const cryptoObj = (typeof globalThis !== 'undefined') && (globalThis.crypto || globalThis.msCrypto);
    if (cryptoObj && cryptoObj.subtle) {
        const buf = new TextEncoder().encode(str);
        const digest = await cryptoObj.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    throw new Error('当前浏览器不支持 Web Crypto API（crypto.subtle），无法完成 PoW 计算');
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

/** 表单文件上传（multipart/form-data，绕开 JSON 序列化）。 */
async function _uploadForm(path, file, filename) {
    const url = BASE_URL + path;
    const fd = new FormData();
    // 文档第 0 节第 5 点：不要把真实文件名放进 multipart 的原始 filename 字段
    // （multipart 在某些网关下会被 latin1 误解码成乱码）。
    // 做法：把文件存成稳定 ASCII 名，真实名单独放 name 字段。
    const safeName = 'upload.bin';
    fd.append('file', file, safeName);
    const realName = filename || file.name || 'upload.bin';
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
    // 论坛资源上传有的返回 {resourceId}，有的返回 {id}，统一一下
    if (data && (data.resourceId !== undefined || data.id !== undefined) && !data.id) {
        data.id = data.resourceId;
    }
    return data;
}

const rwck = {
    /** 鉴权状态快照（给 UI 读）。 */
    authState() { return {token: getToken(), user: getUser()}; },

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
        logout() { setToken(null); setUser(null); }
    },

    projects: {
        async create(body) {
            const r = await _fetch('/projects', {method:'POST', body});
            return (r && (r.data || r.project)) || r;
        },
        async mine() {
            const r = await _fetch('/projects/mine');
            return r;
        },
        async list(query = {}) {
            const qs = new URLSearchParams(query).toString();
            return _fetch('/projects' + (qs ? '?' + qs : ''));
        }
    },

    resources: {
        async upload(file, filename) {
            return _uploadForm('/resources', file, filename);
        }
    },

    discussions: {
        async create(body) {
            const r = await _fetch('/discussions', {method:'POST', body});
            return (r && (r.data || r.discussion)) || r;
        }
    }
};

export default rwck;
// 注意：BASE_URL 在文件顶部已经 export const 过了，这里不要再 re-export 它。
export {getToken as _rwckGetToken, setToken as _rwckSetToken, getUser as _rwckGetUser};

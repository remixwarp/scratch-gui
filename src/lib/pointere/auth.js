/**
 * PointerE 账号登录（OAuth 2.0 Authorization Code + PKCE）。
 *
 * 不收集用户密码：跳转 PointerE 登录页，回跳当前页面后读取 ?code=&state=，
 * 用 code_verifier 换取 token。token 与 userinfo 存 localStorage；
 * refresh_token 会轮换，刷新时把新值写回。
 */

import {getConfig, getRedirectUri} from './config.js';

const LS_ACCESS = 'pointere:access';
const LS_REFRESH = 'pointere:refresh';
const LS_EXPIRES = 'pointere:expiresAt';
const LS_USER = 'pointere:user';
const SS_PKCE = 'pointere:pkce';
export const AUTH_CHANGED = 'pointere:auth-changed';

const b64url = bytes => {
    let binary = '';
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
    if (typeof btoa !== 'function') {
        throw new Error('当前环境不支持 btoa');
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const randomBytes = size => {
    const out = new Uint8Array(size);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(out);
    } else {
        for (let i = 0; i < size; i++) out[i] = Math.floor(Math.random() * 256);
    }
    return out;
};

const store = (key, value) => {
    try {
        if (value === null || typeof value === 'undefined') localStorage.removeItem(key);
        else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
        // ignore
    }
};
const read = key => {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
};

export const notifyAuthChanged = detail => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED, {detail: detail || getAuthState()}));
};

export const getAccessToken = () => read(LS_ACCESS);
export const getRefreshToken = () => read(LS_REFRESH);
export const getExpiresAt = () => Number(read(LS_EXPIRES) || 0) || 0;

export const getUser = () => {
    try {
        const raw = read(LS_USER);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
};

export const getAuthState = () => ({
    loggedIn: !!getAccessToken() && getExpiresAt() > Date.now(),
    accessToken: getAccessToken(),
    expiresAt: getExpiresAt(),
    user: getUser()
});

/** 生成 PKCE verifier / challenge 与 state，并跳转到授权页。 */
export const beginLogin = () => {
    const config = getConfig();
    if (!config.clientId) {
        throw new Error('请先在「PointerE 设置」里填写 client_id');
    }
    const verifier = b64url(randomBytes(32));
    const state = b64url(randomBytes(16));

    const digest = async () => {
        if (typeof crypto === 'undefined' || !crypto.subtle) {
            throw new Error('当前环境不支持 Web Crypto（需要 HTTPS 或 localhost）');
        }
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
        return b64url(new Uint8Array(bytes));
    };

    return Promise.resolve(digest()).then(challenge => {
        try {
            sessionStorage.setItem(SS_PKCE, JSON.stringify({verifier, state, redirectUri: getRedirectUri()}));
        } catch (e) {
            // 会话存储不可用时无法校验 state，仍允许跳转（由 OAuth state 服务端侧保护有限）
        }
        const base = config.httpBase.replace(/\/+$/, '');
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: getRedirectUri(),
            scope: config.scope,
            state,
            code_challenge: challenge,
            code_challenge_method: 'S256'
        });
        window.location.href = `${base}/oauth/authorize?${params.toString()}`;
        return true;
    });
};

const applyToken = data => {
    const access = data && data.access_token;
    if (!access) throw new Error('PointerE 未返回 access_token');
    const expiresIn = Number((data && data.expires_in) || 86400);
    store(LS_ACCESS, access);
    store(LS_EXPIRES, String(Date.now() + expiresIn * 1000));
    if (data.refresh_token) store(LS_REFRESH, data.refresh_token);
    else store(LS_REFRESH, null);
};

const fetchUser = async accessToken => {
    const config = getConfig();
    const response = await fetch(`${config.httpBase}/api/oauth/userinfo`, {
        headers: {Authorization: `Bearer ${accessToken}`}
    });
    if (!response.ok) {
        let detail = '';
        try {
            detail = (await response.json()).error || '';
        } catch (e) {
            // ignore
        }
        throw new Error(`读取 PointerE 用户信息失败${detail ? `：${detail}` : ''}`);
    }
    return response.json();
};

/**
 * 处理 OAuth 回调。返回 true 表示本次调用消费了 URL 上的授权参数。
 * 在编辑器入口处无条件调用；无 code/state 时立即返回 false。
 */
export const handleCallback = async () => {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    // 兼容 ?code= 与 #code= 两种回跳形式
    const hashParams = new URLSearchParams((url.hash || '').replace(/^#/, ''));
    const code = url.searchParams.get('code') || hashParams.get('code');
    const state = url.searchParams.get('state') || hashParams.get('state');
    const error = url.searchParams.get('error') || hashParams.get('error');
    if (!code && !state && !error) return false;

    const cleanup = () => {
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('error');
        url.hash = '';
        window.history.replaceState(null, '', url.toString());
    };

    if (error) {
        cleanup();
        notifyAuthChanged({loggedIn: false, error});
        throw new Error(error === 'access_denied' ? '你取消了 PointerE 授权' : `授权失败：${error}`);
    }

    let pkce = null;
    try {
        pkce = JSON.parse(sessionStorage.getItem(SS_PKCE) || 'null');
    } catch (e) {
        pkce = null;
    }
    sessionStorage.removeItem(SS_PKCE);

    if (!pkce || !pkce.verifier || (state && pkce.state !== state)) {
        cleanup();
        throw new Error('PointerE 授权状态校验失败，请重试');
    }

    try {
        const config = getConfig();
        const response = await fetch(`${config.httpBase}/api/oauth/token`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: config.clientId,
                code,
                redirect_uri: pkce.redirectUri || getRedirectUri(),
                code_verifier: pkce.verifier
            })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.error_description || body.error || `换取令牌失败（${response.status}）`);
        }
        applyToken(body);
        const user = await fetchUser(body.access_token).catch(() => ({
            username: 'PointerE 用户',
            sub: ''
        }));
        store(LS_USER, user);
        cleanup();
        notifyAuthChanged();
        return true;
    } catch (e) {
        cleanup();
        throw e;
    }
};

/** 用 refresh_token 换新 token（旧 refresh_token 会轮换）。 */
export const refreshAccessToken = async () => {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error('没有 PointerE 刷新令牌，请重新登录');
    const config = getConfig();
    const response = await fetch(`${config.httpBase}/api/oauth/token`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: config.clientId,
            refresh_token: refresh
        })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body.error_description || body.error || `刷新令牌失败（${response.status}）`);
    }
    applyToken(body);
    // 新 access_token 可能与旧的不同，刷新用户信息
    fetchUser(body.access_token).then(user => {
        store(LS_USER, user);
        notifyAuthChanged();
    }).catch(() => {});
    notifyAuthChanged();
    return body.access_token;
};

/** 取有效 access_token；过期则自动刷新。 */
export const ensureAccessToken = async () => {
    const expiry = getExpiresAt();
    const skew = Number(getConfig().refreshSkewMs) || 60000;
    if (getAccessToken() && expiry - Date.now() > skew) return getAccessToken();
    if (getRefreshToken()) return refreshAccessToken();
    return null;
};

export const logout = async () => {
    const token = getAccessToken();
    if (token) {
        try {
            const config = getConfig();
            await fetch(`${config.httpBase}/api/oauth/revoke`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({token})
            });
        } catch (e) {
            // 撤销失败也要清本地
        }
    }
    [LS_ACCESS, LS_REFRESH, LS_EXPIRES, LS_USER].forEach(key => store(key, null));
    notifyAuthChanged({loggedIn: false, user: null});
    return true;
};

export default {
    AUTH_CHANGED,
    getAuthState,
    getAccessToken,
    getRefreshToken,
    getUser,
    beginLogin,
    handleCallback,
    refreshAccessToken,
    ensureAccessToken,
    logout,
    notifyAuthChanged
};

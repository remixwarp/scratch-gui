/**
 * PointerE 协作服务配置。
 *
 * 可在「PointerE 设置」自由窗口里修改；所有使用方都通过这里读，
 * 不把服务地址 / client_id 写死在业务代码里。
 */

const STORAGE_KEY = 'pointere:config';

export const DEFAULT_CONFIG = {
    // 官方文档给出的默认节点
    httpBase: 'https://vable.ctspace.xyz',
    wsUrl: 'wss://vable.ctspace.xyz',
    // 在 PointerE 注册 OAuth 应用后填写
    clientId: '',
    // 留空 = 当前页面地址（回调参数走 ?code=&state=，无需新增路由）
    redirectUri: '',
    scope: 'account:read collab:join',
    // 新建房间时预填的房间码（4-12 位字母或数字）
    defaultRoom: '',
    // access_token 到期前多少毫秒开始自动刷新
    refreshSkewMs: 60000
};

const trimSlash = value => String(value || '').replace(/\/+$/, '');

export const getConfig = () => {
    const result = Object.assign({}, DEFAULT_CONFIG);
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                Object.keys(DEFAULT_CONFIG).forEach(key => {
                    if (typeof parsed[key] === typeof DEFAULT_CONFIG[key]) {
                        result[key] = parsed[key];
                    }
                });
            }
        }
    } catch (e) {
        // localStorage 不可用时用默认值
    }
    return result;
};

/**
 * 保存配置（只覆盖传入的字段）。
 * @param {object} patch
 */
export const saveConfig = patch => {
    const next = Object.assign(getConfig(), patch || {});
    next.httpBase = trimSlash(next.httpBase) || DEFAULT_CONFIG.httpBase;
    next.wsUrl = trimSlash(next.wsUrl) || DEFAULT_CONFIG.wsUrl;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
        // 存储失败时仍返回本次结果，UI 可提示
    }
    return next;
};

export const resetConfig = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        // ignore
    }
    return Object.assign({}, DEFAULT_CONFIG);
};

/** OAuth 回调地址：未自定义时使用当前页面 URL。 */
export const getRedirectUri = () => {
    const config = getConfig();
    if (config.redirectUri) return config.redirectUri;
    if (typeof window === 'undefined') return 'http://localhost/';
    return window.location.origin + window.location.pathname;
};

/** 房间码规则：4-12 位字母或数字。 */
export const isValidRoomCode = room => /^[A-Za-z0-9]{4,12}$/.test(String(room || ''));

/** 生成符合规则的随机房间码。 */
export const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, b => chars[b % chars.length]).join('');
};

export default {
    DEFAULT_CONFIG,
    getConfig,
    saveConfig,
    resetConfig,
    getRedirectUri,
    isValidRoomCode,
    generateRoomCode
};

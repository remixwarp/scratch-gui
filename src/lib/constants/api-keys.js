// ============================================================================
// AI 请求直接发往真实上游，浏览器内不再做任何 Captcha 或 Session 验证。
// API 密钥从环境变量或默认值读取（默认值只是占位，可在部署时通过构建
// 环境变量设置，例如：SILICONFLOW_API_KEY=sk-xxx npm run build）。
// ============================================================================

// 构建时可通过环境变量注入密钥
const SILICONFLOW_API_KEY = (typeof process !== 'undefined' && process.env && process.env.SILICONFLOW_API_KEY) || '';

// Worker 代理地址（保留给仍需要走代理的场景；默认不启用，直接直连）
const WORKER_URL = 'https://aiapi.rewp.de5.net';
const KEY_WORKER_URL = 'https://aiapi2.rewp.de5.net';

// 公开的 Vaptcha VID（已不用，仅保留导出以便兼容）
const VAPTCHA_VID = '';

// 部署时设置 USE_AI_PROXY=1 以通过 WORKER_URL 代理；默认直连真实上游
const USE_PROXY = !!(typeof process !== 'undefined' && process.env && process.env.USE_AI_PROXY);

// 浏览器侧只持有 Worker 的转发地址与模型名，不再持有任何密钥。
// endpoint 默认直连 SiliconFlow 真实上游；若设置 USE_AI_PROXY=1 则走 CF Worker 代理。
const SILICONFLOW_CHAT = 'https://api.siliconflow.cn/v1/chat/completions';
const SILICONFLOW_IMAGES = 'https://api.siliconflow.cn/v1/images/generations';

const API_KEY_CONFIG = {
    siliconflow: {
        endpoint: USE_PROXY ? `${WORKER_URL}/chat?upstream=${encodeURIComponent(SILICONFLOW_CHAT)}` : SILICONFLOW_CHAT,
        model: 'auto'
    },
    siliconflowImages: {
        endpoint: USE_PROXY ? `${WORKER_URL}/images?upstream=${encodeURIComponent(SILICONFLOW_IMAGES)}` : SILICONFLOW_IMAGES,
        model: 'auto'
    }
};

function getApiConfig (provider) {
    return API_KEY_CONFIG[provider] || null;
}

// 兼容的遗留导出（保持旧引用不报错，但不再有任何实际作用）
let sessionToken = null;
function setSessionToken (token) { sessionToken = token; }
function getSessionToken () { return sessionToken; }

const REQUEST_TOKEN = '';

function getApiKey () {
    return SILICONFLOW_API_KEY;
}

function getRequestToken () {
    return REQUEST_TOKEN;
}

async function hmacSha256 () { return ''; }
async function generateTOTP () { return '000000'; }
async function fetchTOTPChallenge () { return { nonce: '', signature: '', period: 10 }; }
async function exchangeVaptchaForSession () { return null; }

export {
    WORKER_URL,
    KEY_WORKER_URL,
    VAPTCHA_VID,
    REQUEST_TOKEN,
    API_KEY_CONFIG: null,
    getApiConfig,
    getApiKey,
    getRequestToken,
    generateTOTP,
    fetchTOTPChallenge,
    exchangeVaptchaForSession,
    getSessionToken,
    setSessionToken
};

export default {
    WORKER_URL,
    KEY_WORKER_URL,
    VAPTCHA_VID,
    REQUEST_TOKEN,
    API_KEY_CONFIG: null,
    getApiConfig,
    getApiKey,
    getRequestToken,
    generateTOTP,
    fetchTOTPChallenge,
    exchangeVaptchaForSession,
    getSessionToken,
    setSessionToken
};

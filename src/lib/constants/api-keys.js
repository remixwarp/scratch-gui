// ============================================================================
// AI 请求改为通过 Cloudflare Worker 代理转发，浏览器内不再保存任何 API 密钥。
// 部署 Worker 后，请把下面的 WORKER_URL 替换为你的 Worker 访问地址。
// ============================================================================

// Worker 代理地址（已部署）
const WORKER_URL = 'https://aiapi.rewp.de5.net';

// 密钥 Worker 地址（用于获取 TOTP Challenge）
const KEY_WORKER_URL = 'https://aiapi2.rewp.de5.net';

// 浏览器侧携带的请求令牌，Worker 会校验该值；用于挡住非本站请求的简单滥用。
// 真正的 API 密钥保存在 Worker 的环境变量中，不会出现在前端代码里。
const REQUEST_TOKEN = 'scratch-ai-proxy-2026';

// 浏览器侧只持有 Worker 的转发地址与模型名，不再持有任何密钥。
const API_KEY_CONFIG = {
    siliconflow: {
        endpoint: `${WORKER_URL}/chat`,
        model: 'auto'
    },
    siliconflowImages: {
        endpoint: `${WORKER_URL}/images`,
        model: 'auto'
    }
};

function getApiConfig (provider) {
    return API_KEY_CONFIG[provider] || null;
}

// 保留导出以兼容旧调用方（如 02agent 插件）。密钥已迁移到 Worker 端，浏览器侧不再持有，
// 因此始终返回 null。
function getApiKey () {
    return null;
}

function getRequestToken () {
    return REQUEST_TOKEN;
}

// TOTP：基于时间的一次性密码（浏览器侧计算）
// 使用 Web Crypto API 进行 HMAC-SHA256 运算
async function hmacSha256 (secret, message) {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(message);
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, msgData);
    return Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// 生成 TOTP 令牌
// secret: 密钥（来自 challenge 的 nonce）
// period: 时间周期，单位秒（默认10秒）
// digits: 输出位数（默认6位）
async function generateTOTP (secret, period = 10, digits = 6) {
    const counter = Math.floor(Date.now() / 1000 / period);
    const hash = await hmacSha256(secret, String(counter));

    // 动态截断：取最后一个字节的低4位作为偏移量
    const offset = parseInt(hash.slice(-1), 16);
    const binary = parseInt(hash.substr(offset * 2, 8), 16) & 0x7fffffff;
    const otp = binary % Math.pow(10, digits);

    return otp.toString().padStart(digits, '0');
}

// 从密钥 Worker 获取 challenge（nonce + signature）
async function fetchTOTPChallenge () {
    const resp = await fetch(`${KEY_WORKER_URL}/challenge`);
    if (!resp.ok) {
        throw new Error(`Failed to fetch TOTP challenge: ${resp.status}`);
    }
    return resp.json();
}

export {
    WORKER_URL,
    KEY_WORKER_URL,
    REQUEST_TOKEN,
    API_KEY_CONFIG,
    getApiConfig,
    getApiKey,
    getRequestToken,
    generateTOTP,
    fetchTOTPChallenge
};

export default {
    WORKER_URL,
    KEY_WORKER_URL,
    REQUEST_TOKEN,
    API_KEY_CONFIG,
    getApiConfig,
    getApiKey,
    getRequestToken,
    generateTOTP,
    fetchTOTPChallenge
};

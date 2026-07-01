// ============================================================================
// AI 请求改为通过 Cloudflare Worker 代理转发，浏览器内不再保存任何 API 密钥。
// 部署 Worker 后，请把下面的 WORKER_URL 替换为你的 Worker 访问地址。
// ============================================================================

// Worker 代理地址（已部署）
const WORKER_URL = 'https://aiapi.rewp.de5.net';

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

export {
    WORKER_URL,
    REQUEST_TOKEN,
    API_KEY_CONFIG,
    getApiConfig,
    getApiKey,
    getRequestToken
};

export default {
    WORKER_URL,
    REQUEST_TOKEN,
    API_KEY_CONFIG,
    getApiConfig,
    getApiKey,
    getRequestToken
};

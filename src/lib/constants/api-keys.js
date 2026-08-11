// ============================================================================
// AI 接口：全部硬编码在 GUI 里，不经过任何 Worker 代理，不需要人机验证。
// 平台：aiapi.remix.de5.net (Cloudflare Workers AI)
// 参考文档：ai-api-models-test.md
// Chat 模型：llama-3.3-70b-instruct-fp8-fast（最强可用模型）
// ============================================================================

const BASE_URL = 'https://aiapi.remix.de5.net';
const API_KEY = 'sk-remixworld';

const CHAT_ENDPOINT = `${BASE_URL}/v1/chat/completions`;
const IMAGES_ENDPOINT = `${BASE_URL}/v1/images/generations`;

const CHAT_MODEL = 'llama-3.3-70b-instruct-fp8-fast';
const IMAGE_MODEL = 'llama-3.3-70b-instruct-fp8-fast';

const API_KEY_CONFIG = {
    siliconflow: {
        endpoint: CHAT_ENDPOINT,
        model: CHAT_MODEL
    },
    siliconflowImages: {
        endpoint: IMAGES_ENDPOINT,
        model: IMAGE_MODEL
    }
};

function getApiConfig (provider) {
    return API_KEY_CONFIG[provider] || null;
}

function getApiKey () {
    return API_KEY;
}

function getBaseUrl () {
    return BASE_URL;
}

function getChatModel () {
    return CHAT_MODEL;
}

function getImageModel () {
    return IMAGE_MODEL;
}

export {
    API_KEY_CONFIG,
    BASE_URL,
    API_KEY,
    CHAT_ENDPOINT,
    IMAGES_ENDPOINT,
    CHAT_MODEL,
    IMAGE_MODEL,
    getApiConfig,
    getApiKey,
    getBaseUrl,
    getChatModel,
    getImageModel
};

export default {
    API_KEY_CONFIG,
    BASE_URL,
    API_KEY,
    CHAT_ENDPOINT,
    IMAGES_ENDPOINT,
    CHAT_MODEL,
    IMAGE_MODEL,
    getApiConfig,
    getApiKey,
    getBaseUrl,
    getChatModel,
    getImageModel
};

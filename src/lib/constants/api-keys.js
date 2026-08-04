// ============================================================================
// AI 请求直接发往 SiliconFlow，不经过任何 Worker 代理，不需要人机验证。
// ============================================================================

const SILICONFLOW_API_KEY = 'sk-WP2blxGDtLWURyHA9CP4KzDbNt1OjtJi4GFe1UCg0TuIJ9rB';

const SILICONFLOW_CHAT = 'https://api.siliconflow.cn/v1/chat/completions';
const SILICONFLOW_IMAGES = 'https://api.siliconflow.cn/v1/images/generations';

const API_KEY_CONFIG = {
    siliconflow: {
        endpoint: SILICONFLOW_CHAT,
        model: 'auto'
    },
    siliconflowImages: {
        endpoint: SILICONFLOW_IMAGES,
        model: 'auto'
    }
};

function getApiConfig (provider) {
    return API_KEY_CONFIG[provider] || null;
}

function getApiKey () {
    return SILICONFLOW_API_KEY;
}

export {
    API_KEY_CONFIG,
    getApiConfig,
    getApiKey
};

export default {
    API_KEY_CONFIG,
    getApiConfig,
    getApiKey
};

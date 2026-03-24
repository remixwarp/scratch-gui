const API_KEY_ENCRYPTED = {
    siliconflow: 'c2stbWFkYXJva3V0b25sZWp4a2dqa3RwaGh1am9qaHlpbmtwZmx0cHh5bnlwanZzdmZx',
    openai: 'U2FsdGVkX1+example_encrypted_key_for_openai',
    anthropic: 'U2FsdGVkX1+example_encrypted_key_for_anthropic'
};

const API_KEY_CONFIG = {
    siliconflow: {
        endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
        model: 'deepseek-ai/DeepSeek-V3',
        decryptMethod: 'simple'
    },
    openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4',
        decryptMethod: 'simple'
    },
    anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-opus',
        decryptMethod: 'simple'
    }
};

function decryptKey(encryptedKey, method) {
    if (!encryptedKey) {
        return null;
    }
    
    if (encryptedKey.includes('example_encrypted_key')) {
        return null;
    }
    
    switch (method) {
        case 'simple':
            try {
                if (typeof atob !== 'undefined') {
                    return atob(encryptedKey);
                } else {
                    const buffer = Buffer.from(encryptedKey, 'base64');
                    return buffer.toString('utf8');
                }
            } catch (e) {
                return null;
            }
        default:
            return null;
    }
}

function getApiKey(provider) {
    const config = API_KEY_CONFIG[provider];
    if (!config) {
        return null;
    }
    
    const encryptedKey = API_KEY_ENCRYPTED[provider];
    if (!encryptedKey) {
        return null;
    }
    
    return decryptKey(encryptedKey, config.decryptMethod);
}

function getApiConfig(provider) {
    return API_KEY_CONFIG[provider] || null;
}

export {
    API_KEY_ENCRYPTED,
    API_KEY_CONFIG,
    getApiKey,
    getApiConfig
};

export default {
    API_KEY_ENCRYPTED,
    API_KEY_CONFIG,
    getApiKey,
    getApiConfig
};

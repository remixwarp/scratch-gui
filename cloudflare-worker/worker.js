// ============================================================================
// Cloudflare Worker：AI 请求安全代理（TOTP 增强版）
// ----------------------------------------------------------------------------
// 浏览器不再持有任何 API 密钥。前端先把请求发到本 Worker，Worker 通过以下
// 多层校验后，再把请求转发到真正的 AI 接口：
//   1) X-Request-Token 校验（保留作为额外防护）
//   2) 来源校验（可选）
//   3) TOTP 验证（核心安全层）：向密钥 Worker 验证 nonce+signature+totp
//   4) 防重放：同一 nonce 只能使用一次
//
// 路由：
//   GET  /         -> 健康检查，返回 "hello world"
//   POST /chat     -> 转发到 https://api.iamhc.cn/v1/chat/completions
//   POST /images   -> 转发到 https://api.iamhc.cn/v1/images/generations
//   OPTIONS *      -> 处理跨域预检
//
// 环境变量 / Secret：
//   API_KEY         -> 真正的 API 密钥（必填）
//   REQUEST_TOKEN   -> 请求校验令牌（需与前端一致）
//   ALLOWED_ORIGIN  -> 允许的前端来源（可选）
//   KEY_WORKER_URL  -> 密钥 Worker 地址（默认 https://aiapi2.rewp.de5.net）
// ============================================================================

const UPSTREAM = {
    chat: 'https://api.iamhc.cn/v1/chat/completions',
    images: 'https://api.iamhc.cn/v1/images/generations'
};

const DEFAULT_REQUEST_TOKEN = 'scratch-ai-proxy-2026';
const DEFAULT_KEY_WORKER_URL = 'https://aiapi2.rewp.de5.net';

const usedNonces = new Map();
const NONCE_TTL_MS = 30000;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return handleCORS();
        }

        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
            return new Response('hello world\n', {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        const route = url.pathname.replace(/^\/+/, '');
        const upstreamUrl = UPSTREAM[route];
        if (!upstreamUrl) {
            return jsonError(404, 'Not Found');
        }

        if (request.method !== 'POST') {
            return jsonError(405, 'Method Not Allowed');
        }

        const expectedToken = env.REQUEST_TOKEN || DEFAULT_REQUEST_TOKEN;
        const requestToken = request.headers.get('X-Request-Token');
        if (!requestToken || requestToken !== expectedToken) {
            return jsonError(403, 'Forbidden: invalid token');
        }

        if (env.ALLOWED_ORIGIN) {
            const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
            if (!origin.startsWith(env.ALLOWED_ORIGIN)) {
                return jsonError(403, 'Forbidden: origin not allowed');
            }
        }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return jsonError(400, 'Bad Request: invalid body');
        }

        const { nonce, signature, totp, ...upstreamBody } = body;
        if (!nonce || !signature || !totp) {
            return jsonError(403, 'Forbidden: missing TOTP parameters');
        }

        if (isNonceUsed(nonce)) {
            return jsonError(403, 'Forbidden: nonce already used');
        }

        const keyWorkerUrl = env.KEY_WORKER_URL || DEFAULT_KEY_WORKER_URL;
        const verifyUrl = `${keyWorkerUrl}/verify`;
        try {
            const verifyResp = await fetch(verifyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nonce, signature, totp })
            });

            if (!verifyResp.ok) {
                const errText = await verifyResp.text();
                let errMsg = verifyResp.status.toString();
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error) errMsg = errJson.error;
                } catch (e) {
                    if (errText && errText.length < 200) errMsg = errText;
                }
                return jsonError(403, `TOTP verification failed: ${errMsg} (url=${verifyUrl})`);
            }
        } catch (e) {
            return jsonError(502, `Key worker unavailable: ${e.message} (url=${verifyUrl})`);
        }

        const apiKey = env.API_KEY;
        if (!apiKey) {
            return jsonError(500, 'Server misconfiguration: API_KEY not set');
        }

        const upstreamResp = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify(upstreamBody)
        });

        const respBody = await upstreamResp.text();
        return new Response(respBody, {
            status: upstreamResp.status,
            headers: {
                'Content-Type': upstreamResp.headers.get('Content-Type') || 'application/json',
                ...corsHeaders()
            }
        });
    }
};

function isNonceUsed(nonce) {
    const now = Date.now();
    for (const [n, time] of usedNonces) {
        if (now - time > NONCE_TTL_MS) usedNonces.delete(n);
    }
    if (usedNonces.has(nonce)) return true;
    usedNonces.set(nonce, now);
    return false;
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Request-Token'
    };
}

function handleCORS() {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

function jsonError(status, message) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
}

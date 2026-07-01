// ============================================================================
// Cloudflare Worker：AI 请求安全代理
// ----------------------------------------------------------------------------
// 浏览器不再持有任何 API 密钥。前端把请求发到本 Worker，Worker 校验来源与令牌后，
// 用保存在环境变量（Secret）里的密钥，把请求转发到真正的 AI 接口，再把结果返回前端。
//
// 路由：
//   GET  /         -> 健康检查，返回 "hello world"（部署后先访问它确认 Worker 正常）
//   POST /chat     -> 转发到 https://api.iamhc.cn/v1/chat/completions
//   POST /images   -> 转发到 https://api.iamhc.cn/v1/images/generations
//   OPTIONS *      -> 处理浏览器跨域预检请求
//
// 需要配置的环境变量 / Secret：
//   API_KEY        -> 真正的 API 密钥（必填，用 wrangler secret 设置，加密存储）
//   REQUEST_TOKEN  -> 请求校验令牌，需与前端 api-keys.js 里的 REQUEST_TOKEN 一致
//   ALLOWED_ORIGIN -> 允许的前端来源（可选，例如 https://your-site.example.com）
// ============================================================================

// 真正的上游 AI 接口地址
const UPSTREAM = {
    chat: 'https://api.iamhc.cn/v1/chat/completions',
    images: 'https://api.iamhc.cn/v1/images/generations'
};

// 与前端 api-keys.js 中保持一致的默认令牌
const DEFAULT_REQUEST_TOKEN = 'scratch-ai-proxy-2026';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 统一处理 CORS 预检
        if (request.method === 'OPTIONS') {
            return handleCORS();
        }

        // 健康检查：部署后直接在浏览器打开 Worker 地址，能看到 hello world 即说明部署成功
        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
            return new Response('hello world\n', {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        // 只有这两个路径需要代理转发
        const route = url.pathname.replace(/^\/+/, ''); // 'chat' | 'images'
        const upstreamUrl = UPSTREAM[route];
        if (!upstreamUrl) {
            return jsonError(404, 'Not Found');
        }

        if (request.method !== 'POST') {
            return jsonError(405, 'Method Not Allowed');
        }

        // --- 安全校验 ---------------------------------------------------------
        // 1) 请求令牌：必须与前端一致，挡住随机滥用
        const expectedToken = env.REQUEST_TOKEN || DEFAULT_REQUEST_TOKEN;
        const requestToken = request.headers.get('X-Request-Token');
        if (!requestToken || requestToken !== expectedToken) {
            return jsonError(403, 'Forbidden: invalid token');
        }

        // 2) 来源校验：如果设置了 ALLOWED_ORIGIN，则只允许该来源调用
        if (env.ALLOWED_ORIGIN) {
            const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
            if (!origin.startsWith(env.ALLOWED_ORIGIN)) {
                return jsonError(403, 'Forbidden: origin not allowed');
            }
        }

        // 3) 读取加密存储的 API 密钥（Secret 在 Workers 后台是加密保存的）
        const apiKey = env.API_KEY;
        if (!apiKey) {
            return jsonError(500, 'Server misconfiguration: API_KEY not set');
        }

        // --- 转发到真正的 AI 接口 --------------------------------------------
        let upstreamBody;
        try {
            upstreamBody = await request.text();
        } catch (e) {
            return jsonError(400, 'Bad Request: invalid body');
        }

        const upstreamResp = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: upstreamBody
        });

        // 把上游响应原样回传给前端，并补上 CORS 头
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

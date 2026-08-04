// ============================================================================
// Cloudflare Worker：AI 请求透明代理
// ----------------------------------------------------------------------------
// 这是一个极简的转发 Worker：去掉所有人机验证、会话、TOTP、限流等安全检查，
// 直接将 /chat 与 /images 的 POST 请求转发给上游 SiliconFlow，并注入
// Authorization: Bearer <API_KEY>。
//
// 路由：
//   GET  /health               → 健康检查
//   POST /chat                 → 转发到 SiliconFlow chat
//   POST /images               → 转发到 SiliconFlow images
//   POST /proxy?upstream=...   → 转发到任意上游 URL（http/https 仅限）
// ============================================================================

const UPSTREAM = {
    chat: 'https://api.siliconflow.cn/v1/chat/completions',
    images: 'https://api.siliconflow.cn/v1/images/generations'
};

export default {
    async fetch (request, env) {
        if (env.ALLOWED_ORIGIN) {
            const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
            const allowed = env.ALLOWED_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
            const ok = allowed.some(base => origin.startsWith(base));
            if (!ok) {
                return new Response('Forbidden', { status: 403 });
            }
        }

        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders()
            });
        }

        if (request.method === 'GET' &&
            (url.pathname === '/' || url.pathname === '' ||
             url.pathname === '/health' || url.pathname === '/api/health')) {
            return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders() }
            });
        }

        const route = url.pathname.replace(/^\/+/, '');

        let upstreamUrl = null;
        if (route === 'chat' || route === 'api/chat') upstreamUrl = UPSTREAM.chat;
        else if (route === 'images' || route === 'api/images') upstreamUrl = UPSTREAM.images;
        else if (route === 'proxy' || route === 'api/proxy') {
            const param = url.searchParams.get('upstream');
            if (!param) {
                return jsonError(400, 'Missing upstream');
            }
            try {
                const parsed = new URL(param);
                if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad proto');
                upstreamUrl = parsed.toString();
            } catch (_) {
                return jsonError(400, 'Invalid upstream URL');
            }
        }

        if (!upstreamUrl) {
            return jsonError(404, 'Not Found');
        }

        if (request.method !== 'POST') {
            return jsonError(405, 'Method Not Allowed');
        }

        const body = await request.text();

        const apiKey = env.API_KEY || '';
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        if (apiKey) headers.set('Authorization', 'Bearer ' + apiKey);

        const upstreamResp = await fetch(upstreamUrl, {
            method: 'POST',
            headers,
            body
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

function corsHeaders () {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Request-Token, X-Session-Token, Authorization'
    };
}

function jsonError (status, message) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
}

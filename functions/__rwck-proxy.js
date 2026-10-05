// Cloudflare Pages Function — 创客次元同源代理。
// 把 /__rwck-proxy/* 转发到 https://forum.ctspace.xyz/api/*，
// 彻底绕开 forum.ctspace.xyz 未回显 Access-Control-Allow-Origin 的问题。
//
// 这个文件会被 wrangler pages deploy 自动打包，部署后和 scratch-gui 同域
// 提供 /__rwck-proxy/* 路由 → 浏览器 fetch 同源，CORS 放行。

const UPSTREAM_ORIGIN = 'https://forum.ctspace.xyz';
const TIMEOUT_MS      = 30000;

const HOP_BY_HOP = new Set([
    'set-cookie', 'cookie', 'connection', 'keep-alive', 'proxy-authenticate',
    'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade',
    'access-control-allow-origin', 'access-control-allow-credentials',
    'cross-origin-opener-policy', 'cross-origin-resource-policy',
    'origin-agent-cluster', 'timing-allow-origin'
]);

const COPY_HEADERS = [
    'authorization', 'content-type', 'accept', 'content-length', 'x-requested-with'
];

function json (body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': '*'
        }
    });
}

export async function onRequestOptions () {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400'
        }
    });
}

export async function onRequest (context) {
    const {request} = context;
    const url = new URL(request.url);

    // 代理路由格式：/__rwck-proxy/<path...>
    const prefix = '/__rwck-proxy';
    if (!url.pathname.startsWith(prefix)) {
        return new Response('Not found', {status: 404});
    }
    const suffix = url.pathname.slice(prefix.length) || '/';
    const upstreamUrl = `${UPSTREAM_ORIGIN}/api${suffix}${url.search}`;

    const headers = new Headers();
    for (const h of COPY_HEADERS) {
        const v = request.headers.get(h);
        if (v) headers.set(h, v);
    }

    let controller;
    let timer;
    try {
        controller = new AbortController();
        timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const upstreamResp = await fetch(upstreamUrl, {
            method: request.method,
            headers,
            body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
            redirect: 'follow',
            signal: controller.signal
        });
        clearTimeout(timer);

        const outHeaders = new Headers();
        for (const [k, v] of upstreamResp.headers.entries()) {
            if (HOP_BY_HOP.has(k.toLowerCase())) continue;
            outHeaders.set(k, v);
        }
        outHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(upstreamResp.body, {
            status: upstreamResp.status,
            headers: outHeaders
        });
    } catch (err) {
        if (timer) clearTimeout(timer);
        return json({error: '创客次元服务暂时不可用', detail: err.message}, 502);
    }
}

// 单文件版：直接挂 /__rwck-proxy 下所有子路径。
// 用 _routes.json 显式把 /__rwck-proxy/* 路由到本函数，避免 Pages Functions
// 对"目录 index.js 能不能吃所有子路径"的歧义。
const UPSTREAM_ORIGIN = 'https://forum.ctspace.xyz';

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

function parseSuffix (request) {
    const u = new URL(request.url);
    const prefix = '/__rwck-proxy';
    let p = u.pathname;
    if (p.startsWith(prefix)) p = p.slice(prefix.length);
    if (!p.startsWith('/')) p = '/' + p;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p + u.search;
}

export async function onRequest (context) {
    const { request } = context;
    const suffix = parseSuffix(request);
    const upstreamUrl = `${UPSTREAM_ORIGIN}/api${suffix}`;

    const headers = new Headers();
    for (const h of ['authorization', 'content-type', 'accept', 'content-length']) {
        const v = request.headers.get(h);
        if (v) headers.set(h, v);
    }
    try {
        const resp = await fetch(upstreamUrl, {
            method: request.method,
            headers,
            body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
            redirect: 'follow'
        });

        // 把响应改成浏览器认为同源的 CORS 头；同时把 forum 回的
        // cross-origin-policy / frame-ancestors 之类干掉，避免前端被 CSP 挡。
        const outHeaders = new Headers();
        for (const [k, v] of resp.headers.entries()) {
            const lk = k.toLowerCase();
            const skip = new Set([
                'set-cookie', 'cookie',
                'access-control-allow-origin',
                'access-control-allow-credentials',
                'cross-origin-embedder-policy',
                'cross-origin-opener-policy',
                'cross-origin-resource-policy',
                'frame-options'
            ]);
            if (skip.has(lk)) continue;
            outHeaders.set(k, v);
        }
        outHeaders.set('Access-Control-Allow-Origin', '*');
        outHeaders.set('X-Rwck-Upstream', upstreamUrl);
        return new Response(resp.body, { status: resp.status, headers: outHeaders });
    } catch (e) {
        return json({ error: '创客次元服务暂时不可用', detail: String(e) }, 502);
    }
}

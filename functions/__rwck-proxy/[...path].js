// CF Pages Functions 动态路由：匹配 /__rwck-proxy/<任意路径层级>
// context.params.path 是一个路径段数组，比如 /__rwck-proxy/api/captcha → ['api', 'captcha']
const UPSTREAM_ORIGIN = 'https://forum.ctspace.xyz';

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status, headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': '*'
        }
    });
}

export async function onRequestOptions() {
    return new Response(null, {status: 204, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
    }});
}

export async function onRequest(context) {
    const {request, params} = context;
    const segments = params.path || [];        // [...path] → 数组
    const suffix = segments.length ? '/' + segments.join('/') : '/';
    const upstreamUrl = `${UPSTREAM_ORIGIN}/api${suffix}${new URL(request.url).search}`;

    console.log(`[rwck-proxy] ${request.method} → ${upstreamUrl}`);

    const headers = new Headers();
    for (const h of ['authorization','content-type','accept']) {
        const v = request.headers.get(h); if (v) headers.set(h, v);
    }

    try {
        const resp = await fetch(upstreamUrl, {
            method: request.method, headers,
            body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
            redirect: 'follow'
        });
        const outHeaders = new Headers();
        for (const [k, v] of resp.headers.entries()) {
            const lk = k.toLowerCase();
            if (['set-cookie','cookie','access-control-allow-origin','access-control-allow-credentials'].includes(lk)) continue;
            outHeaders.set(k, v);
        }
        outHeaders.set('Access-Control-Allow-Origin', '*');
        return new Response(resp.body, {status: resp.status, headers: outHeaders});
    } catch (e) {
        return json({error: '创客次元服务暂时不可用', detail: String(e)}, 502);
    }
}

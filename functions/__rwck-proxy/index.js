// CF Pages Functions 动态路由：匹配 /__rwck-proxy/<任意路径层级>
// 注：不能用 [...path].js 语法 —— Pages Functions 的文件名参数只支持
// [param]（单段）和 [param...].js（尾部全捕获，名字只能含字母/数字/_）。
// 这里用最朴素的 index.js：它会匹配 /__rwck-proxy 本身以及所有子路径，
// 然后我们在 onRequest 里自己把剩余路径切出来拼到上游 /api 后面。
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

function parseSuffix(request) {
    // request.pathname 形如 /__rwck-proxy/captcha 或 /__rwck-proxy/projects/mine
    const u = new URL(request.url);
    const prefix = '/__rwck-proxy';
    let p = u.pathname;
    if (p.startsWith(prefix)) p = p.slice(prefix.length);
    if (!p.startsWith('/')) p = '/' + p;
    // 避免 /__rwck-proxy/xxx/ 这种末尾多一个斜杠
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p + u.search;
}

export async function onRequest(context) {
    const {request} = context;
    const suffix = parseSuffix(request);
    const upstreamUrl = `${UPSTREAM_ORIGIN}/api${suffix}`;

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

// Cloudflare Pages Function — same-origin CORS proxy for loading external SB3
// projects (GET /api/project-proxy?url=https://...).
//
// This is deployed automatically by `wrangler pages deploy build` (files in
// the `functions/` directory are bundled as Pages Functions on the SAME host
// as the site), so the frontend can fetch `window.location.origin +
// '/api/project-proxy'` without any CORS issues and without needing a separate
// Worker route.

// Safety: only allow http(s) and block obvious internal targets.
const BLOCKED_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    '[::1]'
]);

const TIMEOUT_MS = 30000;

function json (body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Headers': '*'
        }
    });
}

export async function onRequestOptions () {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400'
        }
    });
}

export async function onRequestGet (context) {
    const url = new URL(context.request.url);
    const target = url.searchParams.get('url');

    if (!target) {
        return json({ error: 'Missing "url" parameter' }, 400);
    }

    let upstream;
    try {
        upstream = new URL(target);
    } catch (_) {
        return json({ error: 'Invalid "url" parameter' }, 400);
    }

    if (!/^https?:$/.test(upstream.protocol)) {
        return json({ error: 'Only http(s) upstreams are allowed' }, 400);
    }
    if (BLOCKED_HOSTS.has(upstream.hostname)) {
        return json({ error: 'Local/internal targets are not allowed' }, 400);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const upstreamResp = await fetch(upstream.toString(), {
            method: 'GET',
            signal: controller.signal,
            redirect: 'follow'
        });
        clearTimeout(timer);

        const outHeaders = new Headers();
        outHeaders.set('Access-Control-Allow-Origin', '*');
        outHeaders.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
        // Preserve the upstream content-type (the frontend uses it to reject
        // HTML error pages). Fall back to a binary type for .sb3 zips.
        outHeaders.set('Content-Type',
            upstreamResp.headers.get('Content-Type') || 'application/octet-stream');
        return new Response(upstreamResp.body, {
            status: upstreamResp.status,
            headers: outHeaders
        });
    } catch (err) {
        clearTimeout(timer);
        return json({ error: 'Failed to fetch the requested project' }, 502);
    }
}

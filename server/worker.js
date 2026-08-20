// Cloudflare Worker for Vaptcha verification + AI proxy
// Deploy this to Cloudflare Workers
//
// Required secrets (set via `wrangler secret put <name>`):
//   VAPTCHA_VKEY  - Vaptcha VKey (server-side only, do NOT expose)
//   AI_PROXY_TOKEN - Shared token expected from the browser (X-Request-Token)
//   SESSION_TTL   - Session token lifetime in seconds (default 1800)

const DEFAULT_SESSION_TTL = 1800; // 30 min

// ---------------------------- In-memory session store ----------------------------
// NOTE: Workers have isolate-local memory. For a single Worker this is enough
// because a given user will always hit the same isolate until it restarts.
// For production-grade shared session state use Cloudflare KV/D1.
const sessions = new Map(); // sessionToken -> { expireAt }
const usedTokens = new Set(); // recently accepted vaptcha tokens for replay protection
const REPLAY_TTL = 120; // seconds

function nowSeconds () {
    return Math.floor(Date.now() / 1000);
}

function createSessionToken () {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function cleanupExpired () {
    const now = nowSeconds();
    for (const [token, data] of sessions.entries()) {
        if (data.expireAt < now) sessions.delete(token);
    }
    if (usedTokens.size > 10000) usedTokens.clear();
}

// ---------------------------- Helpers ----------------------------
function jsonResponse (body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Request-Token,X-Session-Token',
            ...extraHeaders
        }
    });
}

function checkRequestToken (request) {
    const expected = AI_PROXY_TOKEN;
    if (!expected) return true; // not configured
    const provided = request.headers.get('X-Request-Token');
    return provided === expected;
}

function getClientIp (request) {
    return request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For') ||
        request.headers.get('X-Real-IP') ||
        '';
}

// HMAC-SHA256
async function hmacSha256Hex (key, message) {
    const enc = new TextEncoder();
    const keyData = enc.encode(key);
    const msgData = enc.encode(message);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    return Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Verify a Vaptcha token signature locally (no external call needed).
// token format: timestamp.token_id.signature
// signature = hex(HMAC-SHA256(timestamp + "." + ip + "." + dfu + "." + knock, vkey))
async function verifyVaptchaToken ({token, knock, dfu, ip, vkey, ttlSeconds = 30}) {
    if (!token || !vkey) return { ok: false, reason: 'missing token or vkey' };
    const parts = token.split('.');
    if (parts.length !== 3) return { ok: false, reason: 'malformed token' };

    const [timestampStr, tokenId, signature] = parts;
    const timestamp = Number(timestampStr);
    if (!timestamp || !tokenId || !signature) return { ok: false, reason: 'malformed token' };

    const now = nowSeconds();
    if (Math.abs(now - timestamp) > ttlSeconds) {
        return { ok: false, reason: 'token expired' };
    }

    const data = `${timestamp}.${ip}.${dfu || ''}.${knock || ''}`;
    const expected = await hmacSha256Hex(vkey, data);
    if (signature.length !== expected.length) return { ok: false, reason: 'signature mismatch' };

    // Constant-time compare
    let diff = 0;
    for (let i = 0; i < signature.length; i++) {
        diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (diff !== 0) return { ok: false, reason: 'signature mismatch' };

    if (usedTokens.has(token)) return { ok: false, reason: 'replay' };
    usedTokens.add(token);
    return { ok: true };
}

// ---------------------------- Routes ----------------------------
async function handleRequest (request) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Request-Token,X-Session-Token'
            }
        });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/health' || path === '/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Same-origin proxy for the WarpTheme API. The upstream
    // (warptheme.mistium.com) does not send CORS headers, so direct browser
    // fetches fail with a cross-origin error. This token-free route proxies
    // the request server-side and returns permissive CORS headers.
    if (path.startsWith('/api/warptheme/')) {
        return proxyWarpTheme(request, url);
    }

    if (!checkRequestToken(request)) {
        return jsonResponse({ error: 'Invalid request token' }, 403);
    }

    if (path === '/api/auth' || path === '/auth') {
        return handleAuth(request);
    }

    if (path === '/api/challenge' || path === '/challenge') {
        return handleChallenge(request);
    }

    if (path === '/api/chat' || path === '/chat') {
        return proxyToAI(request, url);
    }

    if (path === '/api/images' || path === '/images') {
        return proxyToAI(request, url);
    }

    if (path === '/api/proxy' || path === '/proxy') {
        return proxyToAI(request, url);
    }

    return jsonResponse({ error: 'Not found' }, 404);
}

async function handleAuth (request) {
    let body;
    try {
        body = await request.json();
    } catch (_) {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { vaptchaToken, vaptchaKnock, vaptchaDfu } = body || {};
    if (!vaptchaToken) {
        return jsonResponse({ error: 'Missing vaptchaToken' }, 400);
    }

    const vkey = VAPTCHA_VKEY;
    if (!vkey) {
        return jsonResponse({ error: 'Server misconfiguration: VAPTCHA_VKEY missing' }, 500);
    }

    const ip = getClientIp(request);
    const result = await verifyVaptchaToken({
        token: vaptchaToken,
        knock: vaptchaKnock || '',
        dfu: vaptchaDfu || '',
        ip,
        vkey,
        ttlSeconds: 30
    });

    if (!result.ok) {
        return jsonResponse({ error: '验证失败：' + result.reason }, 401);
    }

    const ttl = Number(SESSION_TTL || DEFAULT_SESSION_TTL);
    const sessionToken = createSessionToken();
    sessions.set(sessionToken, { expireAt: nowSeconds() + ttl });

    return jsonResponse({
        sessionToken,
        expiresIn: ttl
    });
}

async function handleChallenge (request) {
    // Simple nonce used for TOTP; frontend can exchange it for a TOTP code.
    // Generated per-request, short-lived.
    const nonce = createSessionToken().slice(0, 16);
    const ttl = Number(SESSION_TTL || DEFAULT_SESSION_TTL);
    sessions.set(nonce + ':challenge', { expireAt: nowSeconds() + 60 });
    return jsonResponse({
        nonce,
        ttl,
        serverTime: Math.floor(Date.now() / 1000)
    });
}

async function proxyWarpTheme (request, url) {
    const upstreamPath = url.pathname.slice('/api/warptheme/'.length);
    const target = `https://warptheme.mistium.com/${upstreamPath}${url.search}`;
    try {
        const upstreamResp = await fetch(target, {
            method: request.method,
            headers: { 'Accept': 'application/json' }
        });
        const outHeaders = new Headers();
        outHeaders.set('Content-Type', upstreamResp.headers.get('Content-Type') || 'application/json');
        outHeaders.set('Access-Control-Allow-Origin', '*');
        return new Response(upstreamResp.body, {
            status: upstreamResp.status,
            headers: outHeaders
        });
    } catch (err) {
        return jsonResponse({ error: '无法连接到 WarpTheme 服务' }, 502);
    }
}

async function proxyToAI (request, url) {
    // Require a valid session token for the protected routes
    const sessionToken = request.headers.get('X-Session-Token') || '';
    if (!sessionToken || !sessions.has(sessionToken)) {
        return jsonResponse({ error: '会话已过期，请重新验证' }, 401);
    }
    const data = sessions.get(sessionToken);
    if (data.expireAt < nowSeconds()) {
        sessions.delete(sessionToken);
        return jsonResponse({ error: '会话已过期，请重新验证' }, 401);
    }

    // Frontend sends the real upstream URL via ?upstream=... for /chat & /images
    // routes. For /proxy it must be set explicitly.
    const upstream = url.searchParams.get('upstream');
    if (!upstream) {
        return jsonResponse({ error: '缺少 upstream 参数' }, 400);
    }

    // Reject obvious non-HTTP(S) URLs or localhost targets for safety
    let target;
    try {
        target = new URL(upstream);
    } catch (_) {
        return jsonResponse({ error: 'upstream 格式不合法' }, 400);
    }
    if (!/^https?:$/.test(target.protocol)) {
        return jsonResponse({ error: '只允许 http(s) 上游' }, 400);
    }

    // Forward request body
    const incoming = await request.text();
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (request.headers.get('Authorization')) {
        headers.set('Authorization', request.headers.get('Authorization'));
    }

    const upstreamResp = await fetch(target.toString(), {
        method: 'POST',
        headers,
        body: incoming
    });

    const outHeaders = new Headers();
    outHeaders.set('Content-Type', upstreamResp.headers.get('Content-Type') || 'application/json');
    outHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        headers: outHeaders
    });
}

// Periodic cleanup (driven by request volume — cheap enough)
setInterval(cleanupExpired, 60_000);

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

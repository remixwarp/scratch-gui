// ============================================================================
// Cloudflare Worker：AI 请求安全代理（单 Worker 集成版）
// ----------------------------------------------------------------------------
// 所有路由在最前面统一做域名白名单校验：
//   未配置 ALLOWED_ORIGIN 时放行（方便初次部署调试）；
//   配置后，只有白名单内域名的请求才能通过，其余一律 403。
//   支持多个域名，用逗号分隔，例如：
//     https://remixwarp.pages.dev,https://example.com
// ============================================================================

const UPSTREAM = {
    chat: 'https://api.iamhc.cn/v1/chat/completions',
    images: 'https://api.iamhc.cn/v1/images/generations'
};

const DEFAULT_REQUEST_TOKEN = 'scratch-ai-proxy-2026';
const DEFAULT_TOTP_PERIOD = 10;

const usedNonces = new Map();
const NONCE_TTL_MS = 30000;

export default {
    async fetch(request, env) {
        // --- 全局域名白名单：所有请求（含 /challenge）都要过这一关 -------------
        if (env.ALLOWED_ORIGIN) {
            const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
            // 允许配置多个域名，逗号分隔
            const allowed = env.ALLOWED_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
            const ok = allowed.some(base => origin.startsWith(base));
            if (!ok) {
                // 非白名单域名：直接返回 403，不暴露任何接口
                return new Response('Forbidden', { status: 403 });
            }
        }

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

        if (request.method === 'GET' && route === 'challenge') {
            return handleChallenge(env);
        }

        if (request.method === 'POST' && route === 'verify') {
            return handleVerify(request, env);
        }

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

        const verifyResult = await verifyTOTP(nonce, signature, totp, env);
        if (!verifyResult.ok) {
            return jsonError(403, `TOTP verification failed: ${verifyResult.error}`);
        }

        markNonceUsed(nonce);

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

async function handleChallenge(env) {
    const masterSecret = env.MASTER_SECRET;
    if (!masterSecret) {
        return jsonError(500, 'Server misconfiguration: MASTER_SECRET not set');
    }

    const period = parseInt(env.TOTP_PERIOD || DEFAULT_TOTP_PERIOD);
    const nonce = crypto.randomUUID() + crypto.randomUUID();
    const signature = await hmacSha256(masterSecret, nonce);

    return new Response(JSON.stringify({
        nonce,
        signature,
        period
    }), {
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
        }
    });
}

async function handleVerify(request, env) {
    const masterSecret = env.MASTER_SECRET;
    if (!masterSecret) {
        return jsonError(500, 'Server misconfiguration: MASTER_SECRET not set');
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonError(400, 'Bad Request: invalid body');
    }

    const { nonce, signature, totp } = body;

    if (!nonce || !signature || !totp) {
        return jsonError(400, 'Missing required parameters: nonce, signature, totp');
    }

    if (isNonceUsed(nonce)) {
        return jsonError(403, 'Nonce already used');
    }

    const verifyResult = await verifyTOTP(nonce, signature, totp, env);
    if (!verifyResult.ok) {
        return jsonError(403, verifyResult.error);
    }

    markNonceUsed(nonce);

    return new Response(JSON.stringify({ ok: true }), {
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
        }
    });
}

async function verifyTOTP(nonce, signature, totp, env) {
    const masterSecret = env.MASTER_SECRET;
    const period = parseInt(env.TOTP_PERIOD || DEFAULT_TOTP_PERIOD);

    const expectedSignature = await hmacSha256(masterSecret, nonce);
    if (!constantTimeEqual(signature, expectedSignature)) {
        return { ok: false, error: 'Invalid signature' };
    }

    const now = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(now / period);

    let valid = false;
    for (let offset = -1; offset <= 1; offset++) {
        const counter = currentCounter + offset;
        const expectedTOTP = await computeTOTP(nonce, counter, 6);
        if (constantTimeEqual(totp, expectedTOTP)) {
            valid = true;
            break;
        }
    }

    if (!valid) {
        return { ok: false, error: 'Invalid TOTP' };
    }

    return { ok: true };
}

async function hmacSha256(secret, message) {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(message);
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, msgData);
    return Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function computeTOTP(secret, counter, digits = 6) {
    const hash = await hmacSha256(secret, String(counter));
    const offset = parseInt(hash.slice(-1), 16);
    const binary = parseInt(hash.substr(offset * 2, 8), 16) & 0x7fffffff;
    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
}

function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

function isNonceUsed(nonce) {
    const now = Date.now();
    for (const [n, time] of usedNonces) {
        if (now - time > NONCE_TTL_MS) usedNonces.delete(n);
    }
    return usedNonces.has(nonce);
}

function markNonceUsed(nonce) {
    usedNonces.set(nonce, Date.now());
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

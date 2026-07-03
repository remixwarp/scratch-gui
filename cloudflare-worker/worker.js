// ============================================================================
// Cloudflare Worker：AI 请求安全代理（Turnstile + TOTP + Session Token）
// ----------------------------------------------------------------------------
// 安全层级：
//   1. 全局域名白名单（ALLOWED_ORIGIN 环境变量）
//   2. Turnstile 人机验证 → 签发 Session Token（30分钟有效）
//   3. Session Token 签名验证（HMAC-SHA256）
//   4. IP 频率限制（20次/分钟）
//   5. TOTP 动态口令验证（10秒周期）
//   6. Nonce 防重放（30秒自动清理）
//
// 路由：
//   GET  /          → 健康检查
//   POST /auth      → 验证 Turnstile token，签发 Session Token
//   GET  /challenge → 返回 TOTP challenge（需 Session Token）
//   POST /chat      → 转发到 AI 接口（需 Session Token + TOTP）
//   POST /images    → 转发到图片接口（需 Session Token + TOTP）
// ============================================================================

const UPSTREAM = {
    chat: 'https://api.iamhc.cn/v1/chat/completions',
    images: 'https://api.iamhc.cn/v1/images/generations'
};

const DEFAULT_REQUEST_TOKEN = 'scratch-ai-proxy-2026';
const DEFAULT_TOTP_PERIOD = 10;

// Turnstile 密钥（硬编码，服务端使用）
const TURNSTILE_SECRET_KEY = '0x4AAAAAACyeS8KFuErSMsZIM2CQAsdSmu8';

// Session Token 有效期：30分钟
const SESSION_TTL = 1800;

// Nonce 防重放
const usedNonces = new Map();
const NONCE_TTL_MS = 30000;

// IP 频率限制
const ipRequests = new Map();
const RATE_LIMIT_WINDOW = 60000;  // 1分钟
const RATE_LIMIT_MAX = 20;        // 每分钟最多20次

export default {
    async fetch(request, env) {
        // --- 全局域名白名单 ---
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
            return handleCORS();
        }

        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
            return new Response('hello world\n', {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        const route = url.pathname.replace(/^\/+/, '');

        // /auth：验证 Turnstile，签发 Session Token（唯一不需要 Session Token 的 POST 路由）
        if (request.method === 'POST' && route === 'auth') {
            return handleAuth(request, env);
        }

        // 以下路由都需要 Session Token
        const sessionToken = request.headers.get('X-Session-Token') || '';
        if (!sessionToken) {
            return jsonError(403, 'Forbidden: missing session token');
        }

        const sessionResult = await verifySessionToken(sessionToken, env);
        if (!sessionResult.ok) {
            return jsonError(403, `Forbidden: ${sessionResult.error}`);
        }

        // /challenge：返回 TOTP challenge
        if (request.method === 'GET' && route === 'challenge') {
            return handleChallenge(env);
        }

        // /verify：验证 TOTP（兼容旧接口）
        if (request.method === 'POST' && route === 'verify') {
            return handleVerify(request, env);
        }

        // /chat 和 /images：转发到上游 AI 接口
        const upstreamUrl = UPSTREAM[route];
        if (!upstreamUrl) {
            return jsonError(404, 'Not Found');
        }

        if (request.method !== 'POST') {
            return jsonError(405, 'Method Not Allowed');
        }

        // IP 频率限制
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (!checkRateLimit(clientIP)) {
            return jsonError(429, 'Too Many Requests: 请稍后再试');
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

// ============================================================================
// /auth：验证 Turnstile token，签发 Session Token
// ============================================================================
async function handleAuth(request, env) {
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

    const { turnstileToken } = body;
    if (!turnstileToken) {
        return jsonError(400, 'Missing turnstile token');
    }

    // 向 Cloudflare 验证 Turnstile token
    const turnstileOk = await verifyTurnstile(turnstileToken);
    if (!turnstileOk) {
        return jsonError(403, 'Turnstile verification failed');
    }

    // 签发 Session Token
    const sessionToken = await generateSessionToken(masterSecret);

    return new Response(JSON.stringify({ sessionToken }), {
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
        }
    });
}

async function verifyTurnstile(token) {
    try {
        const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: TURNSTILE_SECRET_KEY,
                response: token
            })
        });
        const data = await resp.json();
        return data.success === true;
    } catch (e) {
        return false;
    }
}

// ============================================================================
// Session Token 生成与验证
// 格式：base64(payload) + "." + hex(HMAC-SHA256(MASTER_SECRET, base64(payload)))
// payload: { exp: 过期时间戳（秒） }
// ============================================================================
async function generateSessionToken(masterSecret) {
    const now = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ exp: now + SESSION_TTL });
    const payloadB64 = btoa(payload);
    const signature = await hmacSha256(masterSecret, payloadB64);
    return payloadB64 + '.' + signature;
}

async function verifySessionToken(token, env) {
    const masterSecret = env.MASTER_SECRET;
    if (!masterSecret) {
        return { ok: false, error: 'MASTER_SECRET not set' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return { ok: false, error: 'Invalid session token format' };
    }
    const [payloadB64, signature] = parts;

    const expectedSignature = await hmacSha256(masterSecret, payloadB64);
    if (!constantTimeEqual(signature, expectedSignature)) {
        return { ok: false, error: 'Invalid session token signature' };
    }

    try {
        const payload = JSON.parse(atob(payloadB64));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            return { ok: false, error: 'Session token expired' };
        }
    } catch (e) {
        return { ok: false, error: 'Invalid session token payload' };
    }

    return { ok: true };
}

// ============================================================================
// /challenge：生成 TOTP challenge
// ============================================================================
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

// ============================================================================
// /verify：验证 TOTP（兼容旧接口）
// ============================================================================
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

// ============================================================================
// TOTP 验证
// ============================================================================
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

// ============================================================================
// IP 频率限制
// ============================================================================
function checkRateLimit(ip) {
    const now = Date.now();
    for (const [key, entry] of ipRequests) {
        if (now - entry.startTime > RATE_LIMIT_WINDOW) {
            ipRequests.delete(key);
        }
    }
    const entry = ipRequests.get(ip);
    if (!entry) {
        ipRequests.set(ip, { startTime: now, count: 1 });
        return true;
    }
    entry.count++;
    return entry.count <= RATE_LIMIT_MAX;
}

// ============================================================================
// HMAC-SHA256 / TOTP 计算
// ============================================================================
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

// ============================================================================
// 工具函数
// ============================================================================
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
        'Access-Control-Allow-Headers': 'Content-Type, X-Request-Token, X-Session-Token'
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

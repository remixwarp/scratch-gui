// ============================================================================
// Cloudflare Worker：TOTP 密钥验证服务
// ----------------------------------------------------------------------------
// 负责生成 TOTP Challenge 并验证请求合法性，防止伪造请求。
// 与 AI Worker 配合使用，形成双 Worker 验证机制。
//
// 路由：
//   GET  /challenge -> 生成随机 nonce 和 HMAC 签名
//   POST /verify    -> 验证 nonce + signature + totp
//   OPTIONS *       -> 处理跨域预检
//
// 环境变量 / Secret：
//   MASTER_SECRET -> 主密钥，用于签名 nonce（必填）
//   TOTP_PERIOD   -> TOTP 时间周期，单位秒（默认 10）
// ============================================================================

const DEFAULT_TOTP_PERIOD = 10;

// 已使用的 nonce 记录（防重放攻击）
// 注意：Cloudflare Workers 是无状态的，内存 Map 仅在单个实例内有效
// 对于多实例部署，建议使用 KV 存储，但对于防重放场景，内存级别已足够
const usedNonces = new Map();
const NONCE_TTL_MS = 30000;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return handleCORS();
        }

        const route = url.pathname.replace(/^\/+/, '');

        if (request.method === 'GET' && route === 'challenge') {
            return handleChallenge(env);
        }

        if (request.method === 'POST' && route === 'verify') {
            return handleVerify(request, env);
        }

        return jsonError(404, 'Not Found');
    }
};

// 生成 Challenge：返回随机 nonce 和 HMAC 签名
async function handleChallenge(env) {
    const masterSecret = env.MASTER_SECRET;
    if (!masterSecret) {
        return jsonError(500, 'Server misconfiguration: MASTER_SECRET not set');
    }

    const period = parseInt(env.TOTP_PERIOD || DEFAULT_TOTP_PERIOD);

    // 生成随机 nonce：两个 UUID 拼接，足够长且随机
    const nonce = crypto.randomUUID() + crypto.randomUUID();

    // 使用主密钥对 nonce 进行 HMAC-SHA256 签名
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

// 验证 TOTP 和签名
async function handleVerify(request, env) {
    const masterSecret = env.MASTER_SECRET;
    if (!masterSecret) {
        return jsonError(500, 'Server misconfiguration: MASTER_SECRET not set');
    }

    const period = parseInt(env.TOTP_PERIOD || DEFAULT_TOTP_PERIOD);

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

    // 1. 验证签名：确认 nonce 是由本服务签发的
    const expectedSignature = await hmacSha256(masterSecret, nonce);
    if (!constantTimeEqual(signature, expectedSignature)) {
        return jsonError(403, 'Invalid signature');
    }

    // 2. 防重放：检查 nonce 是否已被使用
    if (isNonceUsed(nonce)) {
        return jsonError(403, 'Nonce already used');
    }

    // 3. 验证 TOTP：允许当前时间窗口和前后各一个窗口（容错）
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
        return jsonError(403, 'Invalid TOTP');
    }

    // 验证通过，标记 nonce 为已使用
    markNonceUsed(nonce);

    return new Response(JSON.stringify({ ok: true }), {
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
        }
    });
}

// HMAC-SHA256
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

// 计算 TOTP
async function computeTOTP(secret, counter, digits = 6) {
    const hash = await hmacSha256(secret, String(counter));
    const offset = parseInt(hash.slice(-1), 16);
    const binary = parseInt(hash.substr(offset * 2, 8), 16) & 0x7fffffff;
    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
}

// 恒等时间比较（防止时序攻击）
function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// 防重放：检查 nonce 是否已使用
function isNonceUsed(nonce) {
    const now = Date.now();
    // 清理过期的 nonce
    for (const [n, time] of usedNonces) {
        if (now - time > NONCE_TTL_MS) usedNonces.delete(n);
    }
    return usedNonces.has(nonce);
}

// 标记 nonce 为已使用
function markNonceUsed(nonce) {
    usedNonces.set(nonce, Date.now());
}

// CORS 头
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

// 处理 CORS 预检
function handleCORS() {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

// JSON 错误响应
function jsonError(status, message) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
}

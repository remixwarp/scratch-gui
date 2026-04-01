// Cloudflare Worker for Turnstile verification
// Deploy this to Cloudflare Workers

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // 处理验证请求
  if (request.method === 'POST' && new URL(request.url).pathname === '/api/verify-turnstile') {
    try {
      const body = await request.json();
      const { token } = body;

      if (!token) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Token is required' 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 从 Worker 环境变量获取 secret key
      const secretKey = TURNSTILE_SECRET_KEY;

      if (!secretKey) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 调用 Cloudflare Turnstile 验证 API
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: request.headers.get('CF-Connecting-IP')
        })
      });

      const result = await response.json();

      // 添加 CORS 头
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };

      return new Response(JSON.stringify(result), { headers });
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // 健康检查端点
  if (request.method === 'GET' && new URL(request.url).pathname === '/api/health') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // 404 响应
  return new Response('Not found', { 
    status: 404,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  });
}

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/verify-turnstile', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token is required' 
            });
        }

        const secretKey = process.env.TURNSTILE_SECRET_KEY;

        if (!secretKey) {
            console.error('TURNSTILE_SECRET_KEY is not configured');
            return res.status(500).json({ 
                success: false, 
                error: 'Server configuration error' 
            });
        }

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                secret: secretKey,
                response: token,
                remoteip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('Turnstile verification successful');
            res.json({ 
                success: true,
                message: 'Verification successful' 
            });
        } else {
            console.error('Turnstile verification failed:', result['error-codes']);
            res.status(400).json({ 
                success: false, 
                error: 'Verification failed',
                errorCodes: result['error-codes'] 
            });
        }
    } catch (error) {
        console.error('Error verifying Turnstile:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Same-origin proxy for the WarpTheme API (warptheme.mistium.com).
// The upstream does not send CORS headers, so a direct browser fetch fails
// with a cross-origin error. Routing through this same-origin endpoint
// avoids the CORS problem entirely and keeps the theme gallery working.
const WARPTHEME_HOST = 'https://warptheme.mistium.com';

app.get('/api/warptheme/*', async (req, res) => {
    try {
        const upstreamPath = req.params[0] || '';
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const upstreamUrl = `${WARPTHEME_HOST}/${upstreamPath}${query}`;
        const upstreamResp = await fetch(upstreamUrl, { headers: { 'Accept': 'application/json' } });
        const body = await upstreamResp.text();
        res.set('Content-Type', upstreamResp.headers.get('content-type') || 'application/json');
        res.status(upstreamResp.status).send(body);
    } catch (error) {
        console.error('WarpTheme proxy error:', error);
        res.status(502).json({ error: '无法连接到 WarpTheme 服务' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

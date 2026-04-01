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

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

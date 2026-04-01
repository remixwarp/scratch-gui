# Backend Server for Turnstile Verification

This server provides a secure backend for Cloudflare Turnstile verification in the collaboration feature.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your Cloudflare Turnstile secret key in `.env`:
```
TURNSTILE_SECRET_KEY=your_actual_secret_key_here
```

## Running the Server

### Start only the backend server:
```bash
npm run server
```

### Start both frontend and backend together:
```bash
npm run dev:all
```

The server will start on `http://localhost:3001` by default.

## API Endpoints

### POST /api/verify-turnstile
Verifies a Turnstile token with Cloudflare.

**Request Body:**
```json
{
  "token": "your_turnstile_token"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification successful"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Verification failed",
  "errorCodes": ["invalid-input-response"]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Notes

- Never commit your `.env` file to version control
- Keep your `TURNSTILE_SECRET_KEY` secure
- The server uses CORS to allow requests from the frontend
- In production, use HTTPS and configure proper CORS origins

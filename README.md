# mern-auth-server

This is a minimal Express + MongoDB backend for authentication (signup with OTP, login, forgot/reset password, profile).

Setup
1. Copy `.env.example` to `.env` and fill values (especially `MONGO_URI` and `JWT_SECRET`).

2. Install dependencies:

```bash

npm install
```

3. Start in development:

```bash
npm run dev
```

API routes
- `POST /api/auth/signup` { name, email, phone, password }
- `POST /api/auth/verify-otp` { email, otp }
- `POST /api/auth/login` { email, password }
- `POST /api/auth/forgot-password` { email }
- `POST /api/auth/reset-password` { email, otp, newPassword }
- `GET /api/user/profile` (Bearer token)
- `PUT /api/user/profile` (Bearer token)

Notes
- If `EMAIL_USER` is not set, OTPs will be printed to the server console for development.
- OTP documents auto-expire after 5 minutes thanks to a TTL index.

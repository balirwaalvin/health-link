# Health Link Frontend

Vite + React frontend for Health Link.

## Local development

1. Install dependencies:
   `npm install`
2. Ensure [backend-node](../backend-node) is running on `http://localhost:8000`.
3. Copy `.env.example` to `.env.local` and point it at your backend API.
4. Start frontend:
   `npm run dev`

Local env file ([.env.local](.env.local)) should include:

```env
VITE_API_URL=http://localhost:8000
```

`VITE_API_BASE_URL` is also supported as a compatibility alias for `VITE_API_URL`.
For the single-app DigitalOcean deployment, you can leave both empty and let the frontend call the same origin `/api` routes.
If you deploy the frontend separately, set one of them to an absolute URL such as `https://api.your-domain.com`.

## Production configuration

This frontend signs users in through the backend `POST /api/auth/login` endpoint and stores a JWT locally.
When it is served from the same App Platform app as the backend, the browser talks to `/api/...` on the same origin.

If the frontend is deployed on DigitalOcean App Platform or any other host, allow that origin in backend CORS:

1. `FRONTEND_URL=https://your-frontend-domain`
2. Optional extra domains in `FRONTEND_URLS` (comma-separated)

The backend must also be configured with PostgreSQL and auth secrets:

1. `DATABASE_URL=postgresql://...`
2. `JWT_SECRET=<long-random-secret>`
3. `JWT_EXPIRES_IN=7d`

Resend remains the OTP delivery provider. Keep the existing `RESEND_API_KEY` and `RESEND_FROM` values on the backend.

## Build

`npm run build`

## Preview built app

`npm run preview`

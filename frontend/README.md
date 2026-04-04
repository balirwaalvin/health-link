# Health Link Frontend

Vite + React frontend for Health Link.

## Local development

1. Install dependencies:
   `npm install`
2. Ensure [backend-node](../backend-node) is running on `http://localhost:8000`.
3. Start frontend:
   `npm run dev`

Local env file ([.env.local](.env.local)) should include:

```env
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-appwrite-project-id
VITE_API_URL=http://localhost:8000
```

## Production configuration

`VITE_API_URL` must point to your real deployed API host.

This app now signs users in via Appwrite email/password sessions and uses Appwrite JWTs for backend API authorization.

Example:

```env
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-appwrite-project-id
VITE_API_URL=https://api.your-domain.com
```

Do not keep placeholder domains (like `*.example.com`) in deployed builds.

If your frontend is deployed on Appwrite Sites (or any hosted domain), also set backend CORS env vars:

1. `FRONTEND_URL=https://your-appwrite-site-domain`
2. Optional extra domains in `FRONTEND_URLS` (comma-separated)

Without matching backend CORS origins, login can fail with browser `Network Error` even when the API is running.

Backend must also be configured with Appwrite storage credentials for app data sync:

1. `APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1`
2. `APPWRITE_PROJECT_ID=<project-id>`
3. `APPWRITE_API_KEY=<server-api-key>`
4. `APPWRITE_DATA_BUCKET_ID=<bucket-id>`

## Build

`npm run build`

## Preview built app

`npm run preview`

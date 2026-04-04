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
VITE_API_URL=http://localhost:8000
```

## Production configuration

`VITE_API_URL` must point to your real deployed API host.

Example:

```env
VITE_API_URL=https://api.your-domain.com
```

Do not keep placeholder domains (like `*.example.com`) in deployed builds.

## Build

`npm run build`

## Preview built app

`npm run preview`

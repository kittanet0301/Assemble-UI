# Assemble UI

React/Vite frontend for Assemble Office. Vercel hosts the static application and a small Node function that proxies `/api/*` to the separate Assemble API repository. WebSocket traffic connects directly to the API's public Cloudflare Tunnel URL using a one-use ticket issued through the same-origin API proxy.

## Local development

Use Node.js 24.15 or newer. Start the API first using the instructions in `Assemble-API`, then run:

```sh
pnpm install
pnpm dev
```

The Vite server proxies `/api/*` to `http://127.0.0.1:4173`. The API's local `WS_PUBLIC_ORIGIN` should be `http://127.0.0.1:4173`; open the frontend at `http://127.0.0.1:5173`.

## Vercel

Import this repository into Vercel with the project root set to the repository root. The included `vercel.json` provides the SPA fallback, and `api/[...path].mjs` forwards HTTP API requests and auth cookies to the Node backend.

Set `ASSEMBLE_BACKEND_ORIGIN` in Vercel Production and Preview to the HTTPS origin published by the Mac mini Cloudflare Tunnel, then redeploy. Do not include a path or trailing route in the value. The Vercel function returns a JSON configuration error when this variable is missing or invalid.

WebSocket connections go straight from the browser to the `wsUrl` returned by `/api/ws-ticket`; that URL is configured on the API as `WS_PUBLIC_ORIGIN`. The API only accepts tickets created from the configured frontend origin. The Vercel proxy keeps HTTP sessions same-origin, avoiding third-party-cookie requirements.

After deployment, check `/api/health` and `/api/config` on the Vercel domain. Both should return JSON from Assemble API rather than a Vercel HTML page.

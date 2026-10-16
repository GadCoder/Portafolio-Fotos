# Private photography admin

A standalone **Vite + React** app for managing portfolio photos. It is separate from the public portfolio app at the repository root and has no server-side rendering requirement.

## Local development

Requirements: Node.js 24 and pnpm 10 (run installation from the monorepo root).

```sh
pnpm install
pnpm dev:admin
```

Open `http://localhost:5173`. Vite proxies same-origin `/admin-api/*` requests to `${ADMIN_API_ORIGIN}/admin/api/*`; the default API origin is `https://portfolio-api.gadcoder.com`. Override it when needed:

```sh
ADMIN_API_ORIGIN=https://portfolio-api.gadcoder.com pnpm dev:admin
pnpm --filter portfolio-photos-admin typecheck
pnpm --filter portfolio-photos-admin test
pnpm build:admin
```

## API contract

The API remains authoritative for validation. The browser talks only to same-origin `/admin-api/*`; the development Vite proxy and production Caddy server both map that path to the API's `/admin/api/*` routes. Session cookies stay host-only, HttpOnly, Secure and SameSite=Lax; the UI keeps only the API-provided CSRF token in in-memory React state. Before private deployment, include the admin's exact Tailscale Serve origin in the API service's `PORTFOLIO_ORIGINS` setting because API write requests validate `Origin` as well as CSRF. For local development against a remote API, configure the dev origin in that environment's allowlist.

- `GET /admin/api/session`: unauthenticated `{ authenticated: false, csrf_token }` or authenticated `{ authenticated: true, user, csrf_token }`.
- `POST /admin/api/login`: JSON `{ user, password }`, `X-CSRF-Token`; returns authenticated session and sets the session cookie.
- `POST /admin/api/logout`: `X-CSRF-Token`; returns 204.
- `GET /admin/api/photos`: photo array with presentation metadata.
- `POST /admin/api/photos/upload`: multipart repeated `files` parts, `X-CSRF-Token`; returns per-file results.
- `PATCH /admin/api/photos/{id}/presentation`: JSON presentation fields, `X-CSRF-Token`; returns canonical updated photo.
- `DELETE /admin/api/photos/{id}`: `X-CSRF-Token`.
- `POST /admin/api/deploy`: `X-CSRF-Token`; queues a Cloudflare Pages deployment.
  The deploy hook URL is configured only on the backend API service as
  `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL`—never in the Vite environment or browser
  bundle. A 202 response means Cloudflare accepted the trigger, not that its
  build has finished. Saved photo changes also queue automatic builds; a
  successful manual deployment acknowledges pending edits to avoid a redundant
  automatic request.

## Build and private deployment

`pnpm build:admin` creates a static Vite bundle served by Caddy. Caddy serves the SPA, proxies `/admin-api/*` to the configured API origin, and exposes `/healthz` for platform checks. `ADMIN_API_ORIGIN` is a runtime environment setting in Docker Compose.

Dokploy deployment must bind the app to the **loopback interface** and expose it only through **Tailscale Serve**; do not attach a public domain or use Funnel. Compose maps `127.0.0.1:39002` to the container. Deployment and Tailscale routing remain separate from this repository change.

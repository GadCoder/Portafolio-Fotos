# Private photography admin

An independently configured Next.js server app for managing portfolio photos. It is intentionally separate from the public static-export app at the repository root.

## Local development

Requirements: Node.js 24 and npm.

```sh
cd admin
npm ci
npm run dev
```

Open `http://localhost:3000`. The `ADMIN_API_ORIGIN` rewrite target is read by Next.js during build, so set it for `npm run build` (and the Docker build argument) when targeting a non-default API. At runtime, the generated server uses that same-origin rewrite.

```sh
ADMIN_API_ORIGIN=https://portfolio-api.gadcoder.com npm run dev
npm run lint
npm test
npm run build
npm start
```

For Docker, configure the API origin at build time:

```sh
docker build --build-arg ADMIN_API_ORIGIN=https://portfolio-api.gadcoder.com -t portfolio-photos-admin .
```

The Next server rewrites same-origin `/admin-api/:path*` requests to `${ADMIN_API_ORIGIN}/admin/api/:path*`. Browser requests use same-origin credentials; session cookies are API-issued, host-only, Secure, HttpOnly and SameSite=Lax. The UI retains only the API-provided CSRF token in in-memory React state. It does not persist credentials or tokens in storage or URLs.

## API contract

- `GET /admin/api/session`: unauthenticated `{ authenticated: false, csrf_token }` or authenticated `{ authenticated: true, user, csrf_token }`.
- `POST /admin/api/login`: JSON `{ user, password }`, `X-CSRF-Token`; returns authenticated session and sets the session cookie.
- `POST /admin/api/logout`: `X-CSRF-Token`; returns 204.
- `GET /admin/api/photos`: array with `id`, `is_horizontal`, `photo_url`, `name`, `width`, `height`, `featured`, `featuredLayout`, `title`, `location`, `year`, `seriesSlug`, `created_at`.
- `POST /admin/api/photos/upload`: multipart repeated `files` parts, `X-CSRF-Token`; returns per-file results. The UI refreshes the gallery after completion.
- `PATCH /admin/api/photos/{id}/presentation`: JSON `{ featured, featuredLayout, title, location, year, seriesSlug }`, `X-CSRF-Token`; returns canonical updated photo.
- `DELETE /admin/api/photos/{id}`: `X-CSRF-Token`.

The API remains authoritative for validation. Error bodies' `detail` or `message` are presented when available. The client does not assume success for non-2xx responses.

## Build and private deployment

`npm run build` creates a standalone Node server build. The included Dockerfile runs that server and exposes `/api/health` for platform health checks. Do not deploy this admin app to Cloudflare Pages/static export. Dokploy deployment must bind the app to a **private loopback interface** and expose it only through **Tailscale Serve**; do not attach a public domain. Network binding and Tailscale configuration remain deployment-time settings, not code defaults.

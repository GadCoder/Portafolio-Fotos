# Photography Portfolio

Personal photography portfolio by Germán Ampuero. Built with Next.js 16, TypeScript, and Tailwind CSS 4.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS 4
- **Typography**: Satoshi
- **Image Zoom**: react-medium-image-zoom
- **Deployment**: Static Export (GitHub Pages / Cloudflare Pages compatible)

## Architecture

```text
app/
├── api.tsx            # API client for fetching photos
├── layout.tsx         # Root layout with metadata and fonts
├── page.tsx           # Main page (static generation)
├── globals.css        # Global styles and Tailwind
components/
├── Photo.tsx          # Photo component with lazy loading and zoom
├── TopBar.tsx         # Site header
├── ErrorComponent.tsx # Error state UI
```

## API Contract

The portfolio consumes data from:
`https://portfolio-api.gadcoder.com/photo/get-all-photos/`

**Expected response:**

```typescript
interface Photo {
  id: number;
  name: string;
  photo_url: string;
  is_horizontal: boolean;
  width?: number | null;
  height?: number | null;
  featured?: boolean;
  featuredLayout?: "wide" | "contained" | null;
  title?: string | null;
  location?: string | null;
  year?: number | null;
  seriesSlug?: string | null;
}
```

**Error handling:** API or image metadata failures stop the build so the previous deployment stays live.

## Editorial gallery

The final gallery layout is included in the static HTML and CSS. Regular photos
share justified rows of two. Featured photos are paired with up to two following
regular photos; CSS derives the column widths from their aspect ratios so the
feature and its companions align at the bottom. Narrow features and consecutive
features use individual rows. Mobile shows a natural single column in source
order. Photos retain their DOM, keyboard and lightbox order and are never cropped.
Known intrinsic dimensions cap row widths to avoid upscaling.

`lib/gallery-layout.ts` groups consecutive photos deterministically at build time.
There are no browser measurements, absolute placements, image-load ratio updates,
or background photo refreshes. Both `featuredLayout` values retain the integrated
presentation. Captions reserve two lines and truncate longer visible text, with
the complete caption available to assistive technology and in its title tooltip.
Satoshi is preloaded with an adjusted Arial fallback and optional font display,
so a late font download does not change the layout during a visit.

`lib/photo-metadata.ts` resolves missing dimensions from original image headers
during builds, including EXIF orientation. It uses four concurrent readers, a
30-second timeout per image, a 50 MB limit, and a cache in
`.next/cache/photo-dimensions.json`. Images use their final ratios before download.
A metadata or API failure fails the build, keeping the previous deployment live.
An empty API array is a valid empty gallery.

### Publishing admin changes

The site reads current photos during each build. Uploads, presentation edits and
deletions appear after a successful Cloudflare Pages deployment. Configure the
API's `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` using a production Pages deploy hook;
see [Cloudflare's deploy hook guide](https://developers.cloudflare.com/pages/configuration/deploy-hooks/).
The URL is a secret and belongs only in the backend environment.

Deploy the API repository’s publishing support, including migration
`20261015_02` and the publication worker, configure the hook in Dokploy, then
deploy the frontend. The worker debounces changes for 15 seconds and retries failed
hook requests; pending changes survive API restarts. Pages build completion is
visible in Cloudflare's deployment dashboard. The admin deploy button can
request a build immediately and acknowledges the edits included in that request.

Inside the API container, backfill stored dimensions with:

```sh
uv run python -m scripts.backfill_photo_dimensions
uv run python -m scripts.backfill_photo_dimensions --apply
```

The first command previews the changes; the second saves them and queues a build.
New uploads already store their dimensions. The frontend's build lookup also
supports legacy records while the database backfill is pending.

## Dokploy and private access

Deploy the standalone admin using **Dokploy Compose configuration**, with `admin/` as the Compose project directory and `admin/compose.yaml` as its recipe. Set `ADMIN_API_ORIGIN` in the Compose environment to the API origin the admin should proxy to, and set the API's `PORTFOLIO_ORIGINS` to include the exact Tailscale Serve origin alongside the public portfolio origin. Set `ADMIN_HOST_PORT` if needed (default `39002`). The recipe binds only `127.0.0.1:${ADMIN_HOST_PORT}:8080` on the host; keep Caddy listening on container port `8080`.

This is **not** a public-domain or Traefik-routed app. Do not attach a domain, enable public routing, or add public routing labels. Confirm Dokploy shows no public route for this Compose service. Configure Tailscale Serve separately to proxy to `http://127.0.0.1:${ADMIN_HOST_PORT}` (default `http://127.0.0.1:39002`). Use Serve only: do not configure Funnel or public DNS/domain access.

The Compose healthcheck probes the admin's local `/healthz` endpoint.

## Image Optimizations

- **CDN**: Cloudflare Images with on-the-fly transformations
- **Formats**: Auto-conversion to WebP/AVIF
- **Lazy loading**: Offscreen images are deferred
- **Responsive**: `srcset` for multiple viewport sizes
- **Loading priority**: The first photograph loads eagerly; remaining photos load lazily
- **Preserved aspect ratio**: Intrinsic dimensions are included at build time for all images

## Available Scripts

```bash
npm run dev      # Development server
npm run build    # Production build (static export)
npm run lint     # ESLint
```

## Deployment

The project uses `output: 'export'` to generate static files in `out/`.

In the Cloudflare Pages project's **Settings → Build configuration**, use:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Root directory | Repository root (leave blank) |

Set `NODE_VERSION=24` in the Pages build environment to match the Node.js
requirement below. Apply the settings to production and preview builds.

Replace any existing `npx @cloudflare/next-on-pages@1` build command and
`.vercel/output/static` output directory. This static site does not need that
adapter, Wrangler, or Pages Functions. Installing the adapter through `npx` can
fail on conflicting Wrangler and Workers types peer dependencies before the
app even builds. After saving the settings, retry the failed deployment.

See [Cloudflare's static Next.js deployment guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

```bash
npm run build
# Static output is generated in ./out
```

## Requirements

- Node.js 24 LTS
- npm or yarn

## Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

© 2024 Germán Ampuero

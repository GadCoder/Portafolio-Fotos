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

**Error handling:** If the API fails, the app renders `ErrorComponent` instead of crashing.

## Editorial gallery

In the API admin, open **Editar** on a photo, select **Destacar fotografía**,
optionally enter caption metadata, and save. Uncheck the featured option to
restore regular presentation. Selections remain in the API database;
`seriesSlug` remains metadata only.

`lib/gallery-layout.ts` contains the pure `packGallery` function. Regular rows
justify three photos on desktop and two on tablet using a shared image height
and widths derived from aspect ratios. Mobile uses a natural single-column flow.
Images are never cropped or distorted.

Desktop features receive a larger allocation, paired with a stack of one to four
nearby regular photographs. Their widths are calculated so the feature and the
stack reach the same bottom edge, including caption height and gaps. This gives
portrait features visible prominence without an empty neighbouring column.
Companions come from at most the next twelve pending photographs. The algorithm
prefers a feature width near two normal columns, subject to source size limits.
On tablet, featured landscapes can occupy the full row; portraits remain in a
regular row. On mobile, all photos use the available width. Extremely narrow
portraits and small sources retain a smaller allocation to avoid excessive height
or upscaling. Known source dimensions cap every image; legacy sources without
dimensions use a conservative 1200px cap until their actual ratio is loaded.

Photos retain their original DOM, focus, and lightbox order. The visual layout
can bring a nearby feature forward and move its companion photos alongside it;
this bounded change in visual sequence keeps the gallery compact. Final partial
rows retain a smaller footprint. `featuredLayout` metadata is preserved, and both
values use the integrated presentation rather than isolated sections. No manual
placement or additional layout dependency is required.

The static export includes photos at build time and refreshes them from the API
when the gallery mounts. Saved admin changes appear on the next visit or reload,
without rebuilding the frontend. If that refresh fails, the initial photos remain.
New uploads include their intrinsic dimensions. Existing photos reserve their
legacy orientation ratio until the loaded image supplies its actual aspect ratio.

Deploy the API with the admin API/session changes and required migrations in the backend PR before deploying the admin frontend. The API container applies migrations on startup; other environments should run `uv run alembic upgrade head` in the API repository.

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
- **Preserved aspect ratio**: Uses intrinsic dimensions when supplied; legacy records are corrected on load

## Available Scripts

```bash
npm run dev      # Development server
npm run build    # Production build (static export)
npm run lint     # ESLint
```

## Deployment

The project uses `output: 'export'` to generate static files in `out/`.

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

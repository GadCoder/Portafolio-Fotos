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

In the API admin, select **Destacar fotografía**, choose **Ancho completo** or
**Centrada (70%)**, optionally enter caption metadata, and save the presentation.
Uncheck the featured option to return a photograph to the regular masonry gallery.
Selections are stored in the API database; no photo IDs or positions are hardcoded
in the frontend. `seriesSlug` is metadata only; series pages are not implemented.

`lib/photos.ts` contains the pure `groupPhotos` function. It splits the API's order
into regular masonry groups and individual featured sections. DOM order and
lightbox navigation use that same order. Regular photos use three columns on
desktop, two on tablet, and one on mobile; featured sections show optional title
(falling back to location) and year captions.

The static export includes photos at build time and refreshes them from the API
when the gallery mounts. Saved admin changes appear on the next visit or reload,
without rebuilding the frontend. If that refresh fails, the initial photos remain.
New uploads include their intrinsic dimensions. Existing photos reserve their
legacy orientation ratio until the loaded image supplies its actual aspect ratio.

Deploy the API with its `20261014_01` migration before deploying the frontend.
The API container applies migrations on startup; other environments should run
`uv run alembic upgrade head` in the API repository.

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

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

`lib/gallery-layout.ts` contains the pure `packGallery` function. All photos share
one continuous packed gallery with three desktop columns, two tablet columns, and
one mobile column. It computes placement from each image's intrinsic aspect ratio
and measured caption height; images retain their proportions without cropping.

Featured landscape images (aspect ratio at least 1.2) prefer a two-column span
when adjacent lanes have room and the source is large enough. Expansion is
rejected when it would leave a hole larger than 64px (or 20% of a column).
`featuredLayout: "contained"` uses a stricter 10% alignment threshold; "wide"
uses the broader threshold. These existing metadata values are packing hints,
and no longer create standalone sections. Portrait features stay in a single
column with their optional caption, allowing surrounding photos to continue
alongside them. No manual placement or extra layout dependency is required.

Photos are considered in API order, placed into the earliest gap that fits, with
leftmost placement breaking ties. Later photos can fill smaller gaps above
previous photos, so strict visual order yields to compact packing. DOM order,
focus order, and lightbox navigation always preserve the original API sequence.
The bottom edge can remain uneven, as in a regular masonry gallery.

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

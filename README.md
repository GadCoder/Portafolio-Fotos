# Photography Portfolio

Personal photography portfolio by Germán Ampuero. Built with Next.js 13, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **UI Components**: Material UI (MUI)
- **Themes**: next-themes (dark/light mode)
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
}
```

**Error handling:** If the API fails, the app renders `ErrorComponent` instead of crashing.

## Image Optimizations

- **CDN**: Cloudflare Images with on-the-fly transformations
- **Formats**: Auto-conversion to WebP/AVIF
- **Lazy loading**: Offscreen images are deferred
- **Responsive**: `srcset` for multiple viewport sizes
- **Skeleton**: Animated placeholder while loading
- **Preserved aspect ratio**: Prevents layout shift

## Available Scripts

```bash
npm run dev      # Development server
npm run build    # Production build (static export)
npm run lint     # ESLint
```

## Deployment

The project uses `output: 'export'` to generate static files in `dist/`.

```bash
npm run build
# Static output is generated in ./dist
```

## Requirements

- Node.js 18+
- npm or yarn

## Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

© 2024 Germán Ampuero

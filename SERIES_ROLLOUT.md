# Series rollout

The matching backend changes are in the local
`/home/german/Repos/portafolio-fotos-api-stable-gallery` working tree. Both
repositories use the `feat/photography-series` branch. No production migration,
push, or deployment is part of this implementation.

## Order of operations

1. Back up the production database and record the currently deployed backend
   and frontend revisions.
2. Deploy the backend first, applying Alembic migration `20261015_03` through
   the existing deployment workflow. It creates draft series only for valid
   existing `series_slug` values. Review migration warnings for legacy values
   requiring manual attention. Unassigned photos keep their current assets
   and remain unassigned.
3. Use the private admin to create or review series. Choose the unassigned
   photos that belong to Street Photography and confirm their bulk assignment.
   Configure full ordering and, for series with more than five photos, one to
   five ordered preview selections before publishing.
4. Check `/series/` and `/series/{slug}/` on the backend. The public list must
   contain only the intended published series in order. Publishing no series
   intentionally produces an empty public portfolio.
5. Deploy the frontend after curation. Its build reads the published series
   payload and fails on API or data errors. `PHOTOGRAPHY_API_BASE_URL` can
   override the API origin for local fixtures; production defaults to the
   existing portfolio API. `NEXT_PUBLIC_SITE_URL` controls canonical URLs.
6. Confirm the actual Cloudflare Pages build completes, then open every
   published `/series/{slug}` route. Check homepage preview order, the link
   threshold, featured styling, captions, and lightbox navigation on mobile
   and desktop. A successful deploy-hook response only means the build queued.

Series edits use the existing durable publication queue. Every change can
request an automatic frontend rebuild after the debounce, so keep new series
as drafts while curating them. Existing photo endpoints remain available.

## Rollback

Restore the previous frontend deployment first if the series experience needs
to be withdrawn. The old photo-list API remains available. Prefer leaving the
additive database schema in place while reverting application revisions;
deleting a series detaches its photographs and never deletes image assets.
Do not run a schema downgrade as a routine application rollback: removing the
new columns and table discards curation data. Restore from the database backup
only through a separately approved recovery operation.

## Local verification

Run `uv run pytest` in the backend, `npm test` and `npm run build` in `admin/`,
and the frontend's tests, lint, and production build at the repository root.
The new backend must be available for a normal frontend build. A fixture build
verifies static generation without changing production records; it does not
verify production deployment or owner-approved curation.

Browser verification used local series fixtures with 0–6 photographs at 390px
and 1440px viewport widths. Homepage counts were 0, 1, 2, 3, 4, 5, and 5; only
the six-photo series had a detail link. Its detail page rendered all six
photographs, its homepage lightbox navigated within its five-photo scope, and
neither viewport overflowed horizontally. Image requests were fulfilled with
local placeholders, so this check verifies behavior and geometry rather than
production CDN availability or photograph appearance. PostgreSQL row locking
still needs verification against PostgreSQL; backend automated tests use
disposable SQLite databases.

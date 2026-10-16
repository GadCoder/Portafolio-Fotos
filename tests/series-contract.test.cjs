/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  homepageSeriesPhotos,
  validateSeries,
  withResolvedSeriesPhotos,
} = require("../lib/series-contract.ts");
const { galleryRows } = require("../lib/gallery-layout.ts");

function photo(id, overrides = {}) {
  return {
    id,
    name: `Photo ${id}`,
    photo_url: `https://portfolio.cdn.gadcoder.com/${id}.jpg`,
    is_horizontal: true,
    width: 1200,
    height: 800,
    ...overrides,
  };
}

function seriesWithCount(count) {
  const photos = Array.from({ length: count }, (_, index) => photo(index + 1));
  return {
    id: 1,
    slug: `series-${count}`,
    title: `Series ${count}`,
    description: null,
    position: 0,
    totalPhotos: count,
    photos,
    previewPhotos: count <= 5 ? photos : photos.slice(0, 5),
  };
}

test("homepage uses every photograph for series of 0–5 and five previews above five", () => {
  for (let count = 0; count <= 6; count += 1) {
    const series = validateSeries(seriesWithCount(count), `series-${count}`);
    assert.equal(homepageSeriesPhotos(series).length, Math.min(count, 5));
    if (count <= 5) assert.deepEqual(homepageSeriesPhotos(series).map(({ id }) => id), series.photos.map(({ id }) => id));
  }
});

test("rejects mismatched totals, duplicate photo IDs, foreign previews, and missing large previews", () => {
  const mismatch = seriesWithCount(2);
  mismatch.totalPhotos = 1;
  assert.throws(() => validateSeries(mismatch, "mismatch"), /count or IDs/);

  const duplicates = seriesWithCount(2);
  duplicates.photos[1] = { ...duplicates.photos[0] };
  duplicates.previewPhotos = duplicates.photos;
  assert.throws(() => validateSeries(duplicates, "duplicate"), /count or IDs/);

  const foreignPreview = seriesWithCount(2);
  foreignPreview.previewPhotos = [photo(999)];
  assert.throws(() => validateSeries(foreignPreview, "foreign preview"), /invalid preview selection/);

  const noLargePreview = seriesWithCount(6);
  noLargePreview.previewPhotos = [];
  assert.throws(() => validateSeries(noLargePreview, "empty preview"), /needs a preview/);
});

test("homepage preview uses the same canonical featured photo object as the detail series", () => {
  const canonical = photo(1, { featured: true, featuredLayout: "contained" });
  const raw = validateSeries({
    ...seriesWithCount(6),
    photos: [canonical, ...seriesWithCount(6).photos.slice(1)],
    previewPhotos: [{ ...canonical, featured: false }],
  }, "featured");
  const resolved = withResolvedSeriesPhotos(raw, raw.photos);
  assert.strictEqual(resolved.previewPhotos[0], resolved.photos[0]);
  assert.equal(resolved.previewPhotos[0].featured, true);
  assert.equal(resolved.previewPhotos[0].featuredLayout, "contained");
});

test("gallery rows preserve keyboard and lightbox order around consecutive featured photos", () => {
  const photos = [
    photo(1),
    photo(2, { featured: true, featuredLayout: "wide" }),
    photo(3),
    photo(4),
    photo(5, { featured: true, featuredLayout: "contained" }),
    photo(6, { featured: true, featuredLayout: "wide" }),
    photo(7),
  ];
  const rows = galleryRows(photos);
  assert.deepEqual(rows, [
    { indices: [0], featured: false },
    { indices: [1, 2, 3], featured: true },
    { indices: [4], featured: true },
    { indices: [5, 6], featured: true },
  ]);
  assert.deepEqual(rows.flatMap(({ indices }) => indices), photos.map((_, index) => index));
});

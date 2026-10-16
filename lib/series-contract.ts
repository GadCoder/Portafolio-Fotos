import type { GalleryPhoto, PhotoSeries } from "./photos";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validatePhoto(value: unknown, context: string): GalleryPhoto {
  if (!isRecord(value)
    || !Number.isInteger(value.id) || (value.id as number) <= 0
    || typeof value.is_horizontal !== "boolean"
    || typeof value.photo_url !== "string" || !value.photo_url
    || typeof value.name !== "string") {
    throw new Error(`${context}: malformed photo`);
  }
  if (value.featured !== undefined && typeof value.featured !== "boolean") throw new Error(`${context}: invalid featured`);
  if (value.featuredLayout !== undefined && value.featuredLayout !== null && value.featuredLayout !== "wide" && value.featuredLayout !== "contained") {
    throw new Error(`${context}: invalid featuredLayout`);
  }
  for (const field of ["width", "height"] as const) {
    if (value[field] !== undefined && value[field] !== null && (typeof value[field] !== "number" || !Number.isFinite(value[field]) || value[field] <= 0)) {
      throw new Error(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["title", "location", "seriesSlug"] as const) {
    if (value[field] !== undefined && value[field] !== null && typeof value[field] !== "string") throw new Error(`${context}: invalid ${field}`);
  }
  for (const field of ["seriesId", "seriesPosition", "previewPosition"] as const) {
    if (value[field] !== undefined && value[field] !== null && (!Number.isInteger(value[field]) || (value[field] as number) < 0)) throw new Error(`${context}: invalid ${field}`);
  }
  if (value.showInPreview !== undefined && typeof value.showInPreview !== "boolean") throw new Error(`${context}: invalid showInPreview`);
  const photo = { ...value };
  delete photo.year;
  return photo as unknown as GalleryPhoto;
}

export function validateSeries(value: unknown, context: string): PhotoSeries {
  if (!isRecord(value)
    || !Number.isInteger(value.id) || (value.id as number) <= 0
    || typeof value.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)
    || typeof value.title !== "string" || !value.title.trim()
    || (value.description !== undefined && value.description !== null && typeof value.description !== "string")
    || (value.year !== undefined && value.year !== null && (!Number.isInteger(value.year) || (value.year as number) < 1800 || (value.year as number) > 2200))
    || !Number.isInteger(value.position) || (value.position as number) < 0
    || !Number.isInteger(value.totalPhotos) || (value.totalPhotos as number) < 0
    || !Array.isArray(value.photos) || !Array.isArray(value.previewPhotos)) {
    throw new Error(`${context}: malformed series`);
  }
  const photos = value.photos.map((photo, i) => validatePhoto(photo, `${context}.photos[${i}]`));
  const previewPhotos = value.previewPhotos.map((photo, i) => validatePhoto(photo, `${context}.previewPhotos[${i}]`));
  const ids = new Set(photos.map((photo) => photo.id));
  if (ids.size !== photos.length || photos.length !== value.totalPhotos) throw new Error(`${context}: photo count or IDs are inconsistent`);
  if (previewPhotos.length > 6 || new Set(previewPhotos.map((photo) => photo.id)).size !== previewPhotos.length
    || previewPhotos.some((photo) => !ids.has(photo.id))) throw new Error(`${context}: invalid preview selection`);
  if ((value.totalPhotos as number) > 5 && previewPhotos.length === 0) throw new Error(`${context}: a series with more than five photos needs a preview`);
  return { ...value, description: value.description ?? null, photos, previewPhotos } as PhotoSeries;
}

/** Resolve preview records from the canonical full-series objects. */
export function withResolvedSeriesPhotos(series: PhotoSeries, resolvedPhotos: GalleryPhoto[]): PhotoSeries {
  const byId = new Map(resolvedPhotos.map((photo) => [photo.id, photo]));
  return {
    ...series,
    photos: series.photos.map((photo) => byId.get(photo.id)!),
    previewPhotos: series.previewPhotos.map((photo) => byId.get(photo.id)!),
  };
}

/** Small series show every photo; large series show their curated preview. */
export function homepageSeriesPhotos(series: PhotoSeries): GalleryPhoto[] {
  return series.totalPhotos <= 5 ? series.photos : series.previewPhotos;
}

import type { GalleryPhoto, PhotoSeries } from "./photos";
import { PhotoSchema, PublicSeriesSchema, type PhotoDto } from "@portfolio-photos/contracts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePhoto(value: unknown, context: string): PhotoDto {
  const parsed = PhotoSchema.safeParse(value);
  if (!parsed.success) throw new Error(`${context}: malformed photo (${parsed.error.issues[0]?.message ?? "invalid fields"})`);
  const { year: _legacyYear, ...photo } = parsed.data as typeof parsed.data & { year?: unknown };
  return photo;
}

export function validatePhoto(value: unknown, context: string): GalleryPhoto {
  return parsePhoto(value, context);
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
  const photos = value.photos.map((photo, i) => parsePhoto(photo, `${context}.photos[${i}]`));
  const previewPhotos = value.previewPhotos.map((photo, i) => parsePhoto(photo, `${context}.previewPhotos[${i}]`));
  const ids = new Set(photos.map((photo) => photo.id));
  if (ids.size !== photos.length || photos.length !== value.totalPhotos) throw new Error(`${context}: photo count or IDs are inconsistent`);
  if (previewPhotos.length > 6 || new Set(previewPhotos.map((photo) => photo.id)).size !== previewPhotos.length
    || previewPhotos.some((photo) => !ids.has(photo.id))) throw new Error(`${context}: invalid preview selection`);
  if ((value.totalPhotos as number) > 5 && previewPhotos.length === 0) throw new Error(`${context}: a series with more than five photos needs a preview`);
  const parsed = PublicSeriesSchema.safeParse({ ...value, description: value.description ?? null, photos, previewPhotos });
  if (!parsed.success) throw new Error(`${context}: malformed series (${parsed.error.issues[0]?.message ?? "invalid fields"})`);
  return parsed.data;
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

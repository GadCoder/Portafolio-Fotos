import type { GalleryPhoto, PhotoSeries } from "@/lib/photos";
import { withPhotoDimensions } from "@/lib/photo-metadata";
import { validatePhoto, validateSeries, withResolvedSeriesPhotos } from "@/lib/series-contract";

const API_BASE = (process.env.PHOTOGRAPHY_API_BASE_URL ?? "https://portfolio-api.gadcoder.com").replace(/\/$/, "");
let seriesSnapshot: Promise<PhotoSeries[]> | undefined;

async function fetchJson(path: string, context: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${context}: HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function getPhotos(): Promise<GalleryPhoto[]> {
  const result = await fetchJson("/photo/get-all-photos/", "Photo API");
  if (!Array.isArray(result)) throw new Error("Photo API: expected an array");
  return withPhotoDimensions(result.map((photo, i) => validatePhoto(photo, `Photo API[${i}]`)));
}

export async function getSeries(): Promise<PhotoSeries[]> {
  seriesSnapshot ??= (async () => {
    const result = await fetchJson("/series/", "Series API");
    if (!Array.isArray(result)) throw new Error("Series API: expected an array");
    const series = result.map((item, i) => validateSeries(item, `Series API[${i}]`));
    if (new Set(series.map(({ slug }) => slug)).size !== series.length) throw new Error("Series API: duplicate slugs");
    const allPhotos = series.flatMap(({ photos }) => photos);
    if (new Set(allPhotos.map(({ id }) => id)).size !== allPhotos.length) throw new Error("Series API: a photo appears in more than one series");
    const resolvedPhotos = await withPhotoDimensions(allPhotos);
    return series.map((item) => withResolvedSeriesPhotos(item, resolvedPhotos));
  })().catch((error: unknown) => {
    seriesSnapshot = undefined;
    throw error;
  });
  return seriesSnapshot;
}

export async function getSeriesDetail(slug: string): Promise<PhotoSeries> {
  const series = await getSeries();
  const result = series.find((item) => item.slug === slug);
  if (!result) throw new Error(`Series API: published series '${slug}' is missing`);
  return result;
}

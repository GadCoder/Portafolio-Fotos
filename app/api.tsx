import type { GalleryPhoto } from "@/lib/photos";
import { withPhotoDimensions } from "@/lib/photo-metadata";

export async function getPhotos(): Promise<GalleryPhoto[]> {
  const response = await fetch("https://portfolio-api.gadcoder.com/photo/get-all-photos/", {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Photo API: HTTP ${response.status}`);
  const result: unknown = await response.json();
  if (!Array.isArray(result)) throw new Error("Photo API: expected an array");
  return withPhotoDimensions(result as GalleryPhoto[]);
}

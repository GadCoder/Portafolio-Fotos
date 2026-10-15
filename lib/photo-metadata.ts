import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { hasImageDimensions, type GalleryPhoto } from "./photos";

type Dimensions = { width: number; height: number };
const cachePath = path.join(process.cwd(), ".next/cache/photo-dimensions.json");
const maxBytes = 50 * 1024 * 1024;

async function readDimensions(src: string): Promise<Dimensions> {
  // Read headers from the original object, so resized renditions cannot round the ratio.
  const response = await fetch(src, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok || !response.body) throw new Error(`Image metadata: HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      length += value.length;
      if (length > maxBytes) throw new Error("Image exceeds the 50 MB metadata limit");
      try {
        const metadata = await sharp(Buffer.concat(chunks, length)).metadata();
        if (metadata.width && metadata.height) {
          const rotated = metadata.orientation != null && metadata.orientation >= 5;
          return {
            width: rotated ? metadata.height : metadata.width,
            height: rotated ? metadata.width : metadata.height,
          };
        }
      } catch {
        // Some formats require more bytes before the header can be decoded.
      }
    }
    throw new Error("Could not read image dimensions");
  } finally {
    await reader.cancel();
  }
}

/** Resolve legacy records during the build; never correct image geometry in the browser. */
export async function withPhotoDimensions(photos: GalleryPhoto[]): Promise<GalleryPhoto[]> {
  let cached: Record<string, Dimensions> = {};
  try {
    cached = JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    // The first build has no persisted metadata cache.
  }
  const result = [...photos];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, photos.length) }, async () => {
    while (next < photos.length) {
      const index = next++;
      const photo = photos[index];
      if (hasImageDimensions(photo)) continue;
      let dimensions = cached[photo.photo_url];
      if (!dimensions || !hasImageDimensions(dimensions)) {
        try {
          dimensions = await readDimensions(photo.photo_url);
        } catch (error) {
          throw new Error(`Could not resolve dimensions for photo ${photo.id}; keeping the previous deployment is safer than publishing an unstable gallery.`, { cause: error });
        }
        cached[photo.photo_url] = dimensions;
      }
      result[index] = { ...photo, ...dimensions };
    }
  }));
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(cached));
  return result;
}

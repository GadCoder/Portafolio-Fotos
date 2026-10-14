import type { GalleryPhoto } from "@/lib/photos";

export async function fetchPhotos(signal?: AbortSignal): Promise<GalleryPhoto[]> {
  const response = await fetch("https://portfolio-api.gadcoder.com/photo/get-all-photos/",
    signal ? { signal, cache: "no-store" } : undefined);
  if (!response.ok) throw new Error(`Photo API: HTTP ${response.status}`);
  const result = await response.json();
  if (!Array.isArray(result)) throw new Error("Photo API: expected an array");
  return result;
}

export async function getPhotos(): Promise<GalleryPhoto[]> {
  try {
    return await fetchPhotos();
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

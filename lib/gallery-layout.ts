import { imageDimensions, type GalleryPhoto } from "./photos";

export type GalleryRow = {
  indices: number[];
  featured: boolean;
};

/** Group consecutive photos once, so visual, keyboard and lightbox order agree. */
export function galleryRows(photos: readonly GalleryPhoto[]): GalleryRow[] {
  const rows: GalleryRow[] = [];
  let index = 0;
  while (index < photos.length) {
    const first = index++;
    const indices = [first];
    const dimensions = imageDimensions(photos[first]);
    const featured = Boolean(photos[first].featured);
    const companions = featured && dimensions.width / dimensions.height >= 0.45 ? 2 : featured ? 0 : 1;
    while (indices.length <= companions && index < photos.length && !photos[index].featured) {
      indices.push(index++);
    }
    rows.push({ indices, featured });
  }
  return rows;
}

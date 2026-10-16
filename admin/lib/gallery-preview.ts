import type { Photo } from './api';

type GalleryRow = { indices: number[]; featured: boolean };

export function imageDimensions(photo: Photo) {
  if (typeof photo.width === 'number' && photo.width > 0 && typeof photo.height === 'number' && photo.height > 0) {
    return { width: photo.width, height: photo.height };
  }
  return photo.is_horizontal ? { width: 1200, height: 800 } : { width: 800, height: 1200 };
}

export function galleryRows(photos: readonly Photo[]): GalleryRow[] {
  const rows: GalleryRow[] = [];
  let index = 0;
  while (index < photos.length) {
    const first = index++;
    const indices = [first];
    const dimensions = imageDimensions(photos[first]);
    const featured = Boolean(photos[first].featured);
    const companions = featured && dimensions.width / dimensions.height >= 0.45 ? 2 : featured ? 0 : 1;
    while (indices.length <= companions && index < photos.length && !photos[index].featured) indices.push(index++);
    rows.push({ indices, featured });
  }
  return rows;
}

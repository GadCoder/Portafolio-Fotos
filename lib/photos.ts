export type PhotoPresentation = {
  featured?: boolean;
  featuredLayout?: "wide" | "contained" | null;
  title?: string | null;
  location?: string | null;
  year?: number | null;
  seriesSlug?: string | null;
};

export type GalleryPhoto = PhotoPresentation & {
  id: number;
  is_horizontal: boolean;
  photo_url: string;
  name: string;
  width?: number | null;
  height?: number | null;
};

export type IndexedPhoto = { photo: GalleryPhoto; index: number };
export type PhotoGroup =
  | { kind: "masonry"; photos: IndexedPhoto[] }
  | { kind: "featured"; entry: IndexedPhoto };

/** Partition the supplied order without sorting or dropping entries. */
export function groupPhotos(photos: readonly GalleryPhoto[]): PhotoGroup[] {
  const groups: PhotoGroup[] = [];
  let regular: IndexedPhoto[] = [];
  photos.forEach((photo, index) => {
    if (photo.featured) {
      if (regular.length) groups.push({ kind: "masonry", photos: regular });
      regular = [];
      groups.push({ kind: "featured", entry: { photo, index } });
    } else {
      regular.push({ photo, index });
    }
  });
  if (regular.length) groups.push({ kind: "masonry", photos: regular });
  return groups;
}

export function imageDimensions(photo: GalleryPhoto) {
  return {
    width: photo.width && photo.width > 0 ? photo.width : photo.is_horizontal ? 1200 : 800,
    height: photo.height && photo.height > 0 ? photo.height : photo.is_horizontal ? 800 : 1200,
  };
}

export function optimizedPhotoUrl(src: string, width?: number, quality = 70) {
  const path = src.replace("https://portfolio.cdn.gadcoder.com/", "");
  return `https://portfolio.cdn.gadcoder.com/cdn-cgi/image/quality=${quality},format=auto${width ? `,w=${width},fit=scale-down` : ""}/${path}`;
}

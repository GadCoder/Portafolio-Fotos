export type PhotoPresentation = {
  featured?: boolean;
  featuredLayout?: "wide" | "contained" | null;
  title?: string | null;
  location?: string | null;
  seriesSlug?: string | null;
  seriesId?: number | null;
  seriesPosition?: number | null;
  showInPreview?: boolean;
  previewPosition?: number | null;
};

export type PhotoSeries = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  year?: number | null;
  position: number;
  totalPhotos: number;
  previewPhotos: GalleryPhoto[];
  photos: GalleryPhoto[];
};

export type GalleryPhoto = PhotoPresentation & {
  id: number;
  is_horizontal: boolean;
  photo_url: string;
  name: string;
  width?: number | null;
  height?: number | null;
};

export function hasImageDimensions(photo: Pick<GalleryPhoto, "width" | "height">) {
  return typeof photo.width === "number" && Number.isFinite(photo.width) && photo.width > 0
    && typeof photo.height === "number" && Number.isFinite(photo.height) && photo.height > 0;
}

export function imageDimensions(photo: GalleryPhoto) {
  if (hasImageDimensions(photo)) {
    return { width: photo.width!, height: photo.height! };
  }
  return {
    width: photo.is_horizontal ? 1200 : 800,
    height: photo.is_horizontal ? 800 : 1200,
  };
}

export function optimizedPhotoUrl(src: string, width?: number, quality = 70) {
  const path = src.replace("https://portfolio.cdn.gadcoder.com/", "");
  return `https://portfolio.cdn.gadcoder.com/cdn-cgi/image/quality=${quality},format=auto${width ? `,w=${width},fit=scale-down` : ""}/${path}`;
}

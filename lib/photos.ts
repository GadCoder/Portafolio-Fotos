import type { PhotoDto, PhotoPresentation as ApiPhotoPresentation, PublicSeriesDto } from "@portfolio-photos/contracts";

export type PhotoPresentation = Partial<ApiPhotoPresentation> & Pick<PhotoDto,
  "seriesId" | "seriesPosition" | "showInPreview" | "previewPosition"
>;

export type GalleryPhoto = PhotoPresentation & Pick<PhotoDto,
  "id" | "is_horizontal" | "photo_url" | "name" | "width" | "height"
>;

export type PhotoSeries = Omit<PublicSeriesDto, "photos" | "previewPhotos"> & {
  photos: GalleryPhoto[];
  previewPhotos: GalleryPhoto[];
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

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

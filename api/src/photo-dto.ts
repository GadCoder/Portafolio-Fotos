import type { Photo } from "./generated/prisma/client.js";
import type { PhotoDto } from "@portfolio-photos/contracts";

export function toPhotoDto(photo: Photo): PhotoDto {
  if (photo.isHorizontal === null || photo.photoUrl === null || photo.name === null) {
    throw new Error(`Photo ${photo.id} contains required data that is missing`);
  }
  return {
    id: photo.id,
    is_horizontal: photo.isHorizontal,
    photo_url: photo.photoUrl,
    name: photo.name,
    width: photo.width,
    height: photo.height,
    featured: photo.featured,
    featuredLayout: photo.featuredLayout as PhotoDto["featuredLayout"],
    title: photo.title,
    location: photo.location,
    seriesSlug: photo.seriesSlug,
    seriesId: photo.seriesId,
    seriesPosition: photo.seriesPosition,
    showInPreview: photo.showInPreview,
    previewPosition: photo.previewPosition,
    created_at: photo.createdAt.toISOString(),
  };
}

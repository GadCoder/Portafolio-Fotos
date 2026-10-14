"use client";

import { useEffect, useRef, useState } from "react";
import Photo from "@/components/Photo";
import { GalleryLightboxProvider } from "@/components/GalleryLightbox";
import { fetchPhotos } from "@/app/api";
import { imageDimensions, type GalleryPhoto } from "@/lib/photos";
import { packGallery } from "@/lib/gallery-layout";

function ContinuousGallery({ photos }: { photos: GalleryPhoto[] }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !photos.length) return;
    const observer = new ResizeObserver(() => {
      const styles = getComputedStyle(grid);
      const columns = parseInt(styles.getPropertyValue("--gallery-columns"), 10);
      const gap = parseFloat(styles.getPropertyValue("--photo-gap"));
      const containerWidth = grid.getBoundingClientRect().width;
      const contents = Array.from(grid.querySelectorAll<HTMLElement>(".editorial-content"));
      const layoutPhotos = photos.map((photo, index) => {
        const dimensions = imageDimensions(photo);
        const image = contents[index]?.querySelector<HTMLImageElement>(".gallery-photo-image");
        const measuredRatio = image?.closest<HTMLElement>(".gallery-photo")?.style.aspectRatio.split("/").map(Number);
        const caption = contents[index]?.querySelector<HTMLElement>(".featured-caption");
        return {
          aspectRatio: measuredRatio?.[0] && measuredRatio[1]
            ? measuredRatio[0] / measuredRatio[1]
            : dimensions.width / dimensions.height,
          intrinsicWidth: photo.width ?? 1200,
          featured: photo.featured,
          featuredLayout: photo.featuredLayout,
          captionHeight: caption ? caption.getBoundingClientRect().height + parseFloat(getComputedStyle(caption).marginTop) : 0,
        };
      });
      const placements = packGallery(layoutPhotos, containerWidth, columns, gap);
      placements.forEach((placement, index) => {
        const item = contents[index]?.parentElement;
        if (!item) return;
        item.style.width = columns === 1 ? "" : `${placement.width}px`;
        item.style.left = `${placement.left}px`;
        item.style.top = `${placement.top}px`;
        item.dataset.column = String(placement.column + 1);
        item.dataset.span = String(placement.span);
        const image = contents[index].querySelector<HTMLImageElement>(".gallery-photo-image");
        const sizes = `${Math.ceil(Math.min(placement.width, layoutPhotos[index].intrinsicWidth))}px`;
        if (image && image.sizes !== sizes) image.sizes = sizes;
      });
      grid.style.height = columns === 1 ? "" : `${Math.max(...placements.map((placement) => placement.top + placement.height)) + parseFloat(styles.paddingBottom)}px`;
      grid.dataset.measured = "true";
    });
    observer.observe(grid);
    grid.querySelectorAll(".editorial-content").forEach((content) => observer.observe(content));
    return () => observer.disconnect();
  }, [photos]);

  return (
    <div ref={gridRef} className="editorial-gallery">
      {photos.map((photo, index) => {
        const caption = photo.title?.trim() || photo.location?.trim();
        const hasCaption = photo.featured && (Boolean(caption) || photo.year != null);
        return (
          <div className="editorial-item" data-featured={photo.featured || undefined} key={photo.id}>
            <figure className="editorial-content">
              <Photo
                src={photo.photo_url}
                alt={photo.name}
                {...imageDimensions(photo)}
                intrinsicWidth={photo.width ?? 1200}
                index={index}
                priority={index === 0}
                sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 88px) / 2), (max-width: 1535px) calc((100vw - 144px) / 3), 464px"
              />
              {hasCaption && (
                <figcaption className="featured-caption">
                  <span>{caption}</span>
                  {photo.year != null && <span className="featured-year">{photo.year}</span>}
                </figcaption>
              )}
            </figure>
          </div>
        );
      })}
    </div>
  );
}

export default function PhotoGallery({ photos: initialPhotos }: { photos: GalleryPhoto[] }) {
  const [photos, setPhotos] = useState(initialPhotos);

  useEffect(() => {
    const controller = new AbortController();
    // Static export keeps an initial gallery; admin edits are fetched on each visit.
    fetchPhotos(controller.signal).then(setPhotos).catch((error: unknown) => {
      if (!controller.signal.aborted) console.error("Could not refresh gallery:", error);
    });
    return () => controller.abort();
  }, []);

  return (
    <GalleryLightboxProvider photos={photos}>
      {photos.length ? <ContinuousGallery photos={photos} /> : <p className="gallery-empty">Todavía no hay fotografías.</p>}
    </GalleryLightboxProvider>
  );
}

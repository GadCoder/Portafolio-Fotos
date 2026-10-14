"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Photo from "@/components/Photo";
import { GalleryLightboxProvider } from "@/components/GalleryLightbox";
import { fetchPhotos } from "@/app/api";
import { groupPhotos, imageDimensions, type GalleryPhoto, type IndexedPhoto } from "@/lib/photos";

function GalleryImage({ entry, featured = false }: { entry: IndexedPhoto; featured?: boolean }) {
  const { photo, index } = entry;
  return (
    <Photo
      src={photo.photo_url}
      alt={photo.name}
      {...imageDimensions(photo)}
      intrinsicWidth={photo.width ?? undefined}
      index={index}
      priority={index === 0}
      sizes={featured
        ? photo.featuredLayout === "contained"
          ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 70vw, (max-width: 1535px) 70vw, 1008px"
          : "(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1535px) calc(100vw - 96px), 1440px"
        : "(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 88px) / 2), (max-width: 1535px) calc((100vw - 144px) / 3), 464px"}
    />
  );
}

function MasonryGroup({ entries }: { entries: IndexedPhoto[] }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver(() => {
      const styles = getComputedStyle(grid);
      if (styles.display !== "grid") return;
      const gap = parseFloat(styles.getPropertyValue("--photo-gap"));
      const columns = styles.gridTemplateColumns.split(" ").length;
      const heights = Array<number>(columns).fill(0);
      grid.querySelectorAll<HTMLElement>(".masonry-content").forEach((content) => {
        const item = content.parentElement;
        if (!item) return;
        const column = heights.indexOf(Math.min(...heights));
        const span = Math.ceil(content.getBoundingClientRect().height + gap);
        item.style.gridColumnStart = String(column + 1);
        item.style.gridRowStart = String(heights[column] + 1);
        item.style.gridRowEnd = `span ${span}`;
        heights[column] += span;
      });
      grid.dataset.measured = "true";
    });
    observer.observe(grid);
    grid.querySelectorAll(".masonry-content").forEach((content) => observer.observe(content));
    return () => observer.disconnect();
  }, [entries]);

  return (
    <div ref={gridRef} className="photo-masonry">
      {entries.map((entry) => (
        <div className="masonry-item" key={entry.photo.id}>
          <div className="masonry-content"><GalleryImage entry={entry} /></div>
        </div>
      ))}
    </div>
  );
}

export default function PhotoGallery({ photos: initialPhotos }: { photos: GalleryPhoto[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const groups = useMemo(() => groupPhotos(photos), [photos]);

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
      <div className="editorial-gallery">
        {groups.map((group) => {
          if (group.kind === "masonry") {
            return <MasonryGroup key={`masonry-${group.photos[0].photo.id}`} entries={group.photos} />;
          }
          const { photo } = group.entry;
          const caption = photo.title?.trim() || photo.location?.trim();
          const hasCaption = Boolean(caption) || photo.year != null;
          return (
            <section className={`featured-photo featured-photo--${photo.featuredLayout ?? "wide"}`} key={photo.id} aria-label={caption || photo.name}>
              <figure className="featured-figure" style={{ maxWidth: imageDimensions(photo).width }}>
                <GalleryImage entry={group.entry} featured />
                {hasCaption && (
                  <figcaption className="featured-caption">
                    <span>{caption}</span>
                    {photo.year != null && <span className="featured-year">{photo.year}</span>}
                  </figcaption>
                )}
              </figure>
            </section>
          );
        })}
        {!photos.length && <p className="gallery-empty">Todavía no hay fotografías.</p>}
      </div>
    </GalleryLightboxProvider>
  );
}

import type { CSSProperties } from "react";
import Photo from "@/components/Photo";
import { GalleryLightboxProvider } from "@/components/GalleryLightbox";
import { imageDimensions, type GalleryPhoto } from "@/lib/photos";
import { galleryRows } from "@/lib/gallery-layout";

function imageSizes(fraction: number, offset: number, maxWidth: number) {
  const width = (container: string) => `calc(${container} * ${fraction} + ${offset}px)`;
  return `(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) ${width("(100vw - 64px)")}, (max-width: 1535px) ${width("(100vw - 96px)")}, ${Math.ceil(Math.min(maxWidth, 1440 * fraction + offset))}px`;
}

export default function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  function renderPhoto(index: number, sizes: string) {
    const photo = photos[index];
    const dimensions = imageDimensions(photo);
    const caption = photo.title?.trim() || photo.location?.trim();
    const hasCaption = photo.featured && (Boolean(caption) || photo.year != null);
    return (
      <figure className="editorial-content" key={photo.id}>
        <Photo
          src={photo.photo_url}
          alt={photo.name}
          {...dimensions}
          intrinsicWidth={dimensions.width}
          index={index}
          priority={index === 0}
          sizes={sizes}
        />
        {hasCaption && (
          <figcaption className="featured-caption">
            <span className="featured-caption-text" title={caption || undefined}>{caption}</span>
            {photo.year != null && <span className="featured-year">{photo.year}</span>}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <GalleryLightboxProvider photos={photos}>
      {!photos.length && <p className="gallery-empty">Todavía no hay fotografías.</p>}
      <div className="editorial-gallery">
        {galleryRows(photos).map((row) => {
          const dimensions = row.indices.map((index) => imageDimensions(photos[index]));
          const ratios = dimensions.map(({ width, height }) => width / height);
          if (row.featured && row.indices.length > 1) {
            const feature = photos[row.indices[0]];
            const hasCaption = Boolean(feature.title?.trim() || feature.location?.trim() || feature.year != null);
            const sideFraction = 1 / (1 + ratios[0] * ratios.slice(1).reduce((sum, ratio) => sum + 1 / ratio, 0));
            const captionHeight = hasCaption ? 51 : 0;
            const stackGaps = row.indices.length - 2;
            // Both columns end at the same height. CSS scales this equation with the container.
            const offset = (-24 + ratios[0] * (captionHeight - 24 * stackGaps)) * sideFraction;
            const maxWidth = Math.min(
              (dimensions[0].width + 24 + offset) / (1 - sideFraction),
              ...dimensions.slice(1).map(({ width }) => (width - offset) / sideFraction),
            );
            const style = {
              "--side-share": `${sideFraction * 100}%`,
              "--side-offset": `${offset}px`,
              maxWidth,
            } as CSSProperties;
            return (
              <div className="gallery-feature-row" key={feature.id} style={style}>
                {renderPhoto(row.indices[0], imageSizes(1 - sideFraction, -24 - offset, maxWidth * (1 - sideFraction) - 24 - offset))}
                <div className="gallery-companions">
                  {row.indices.slice(1).map((index) => renderPhoto(index, imageSizes(sideFraction, offset, maxWidth * sideFraction + offset)))}
                </div>
              </div>
            );
          }
          const sum = ratios.reduce((total, ratio) => total + ratio, 0);
          const maxWidth = Math.min(...dimensions.map(({ height }) => height)) * sum + (row.indices.length - 1) * 24;
          return (
            <div className="gallery-regular-row" key={photos[row.indices[0]].id} style={{ maxWidth }}>
              {row.indices.map((index, position) => {
                const fraction = ratios[position] / sum;
                return (
                  <div className="editorial-item" key={photos[index].id} style={{ flexGrow: ratios[position] }}>
                    {renderPhoto(index, imageSizes(fraction, -(row.indices.length - 1) * 24 * fraction, (maxWidth - (row.indices.length - 1) * 24) * fraction))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </GalleryLightboxProvider>
  );
}

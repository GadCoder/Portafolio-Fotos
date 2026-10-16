import type { CSSProperties } from "react";
import Photo from "@/components/Photo";
import GalleryImageLoader from "@/components/GalleryImageLoader";
import { GalleryLightboxProvider } from "@/components/GalleryLightbox";
import { imageDimensions, type GalleryPhoto } from "@/lib/photos";
import { galleryRows } from "@/lib/gallery-layout";

function imageSizes(fraction: number, offset: number, maxWidth: number) {
  const width = (container: string) => `calc(${container} * ${fraction} + ${offset}px)`;
  return `(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) ${width("(100vw - 64px)")}, (max-width: 1535px) ${width("(100vw - 96px)")}, ${Math.ceil(Math.min(maxWidth, 1440 * fraction + offset))}px`;
}

export default function PhotoGallery({ photos, prioritizeFirstImage = true }: {
  photos: GalleryPhoto[];
  prioritizeFirstImage?: boolean;
}) {
  function renderPhoto(index: number, sizes: string) {
    const photo = photos[index];
    const dimensions = imageDimensions(photo);
    return (
      <figure className="editorial-content" key={photo.id}>
        <Photo
          src={photo.photo_url}
          alt={photo.name}
          {...dimensions}
          intrinsicWidth={dimensions.width}
          index={index}
          priority={prioritizeFirstImage && index === 0}
          sizes={sizes}
        />
      </figure>
    );
  }

  return (
    <GalleryLightboxProvider photos={photos}>
      {!photos.length && <p className="gallery-empty">Todavía no hay fotografías.</p>}
      <GalleryImageLoader>
        {galleryRows(photos).map((row) => {
          const dimensions = row.indices.map((index) => imageDimensions(photos[index]));
          const ratios = dimensions.map(({ width, height }) => width / height);
          if (row.featured && row.indices.length > 1) {
            const sideFraction = 1 / (1 + ratios[0] * ratios.slice(1).reduce((sum, ratio) => sum + 1 / ratio, 0));
            const stackGaps = row.indices.length - 2;
            // Both columns end at the same height. CSS scales this equation with the container.
            const offset = (-24 - ratios[0] * 24 * stackGaps) * sideFraction;
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
              <div className="gallery-feature-row" key={photos[row.indices[0]].id} style={style}>
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
      </GalleryImageLoader>
    </GalleryLightboxProvider>
  );
}

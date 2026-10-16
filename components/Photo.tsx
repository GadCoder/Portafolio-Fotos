"use client";

import Zoom from "react-medium-image-zoom";
import { useContext } from "react";
import { GalleryLightboxContext, GalleryZoomContent } from "@/components/GalleryLightbox";
import { optimizedPhotoUrl } from "@/lib/photos";

interface PhotoProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  intrinsicWidth?: number;
  index: number;
  priority?: boolean;
  sizes: string;
}

export default function Photo({ src, alt, width, height, intrinsicWidth, index, priority = false, sizes }: PhotoProps) {
  const gallery = useContext(GalleryLightboxContext);
  const srcSet = [480, 800, 1200, 1600, 2400]
    .map((size) => `${optimizedPhotoUrl(src, size, size <= 480 ? 45 : size <= 800 ? 70 : 85)} ${size}w`)
    .join(", ");

  return (
    <div className="gallery-photo" style={{ aspectRatio: `${width} / ${height}`, maxWidth: intrinsicWidth ?? width }}>
      <Zoom
        zoomImg={{ src: optimizedPhotoUrl(src, 2400, 85), srcSet: "", alt }}
        zoomMargin={24}
        a11yNameButtonZoom="Ampliar fotografía"
        a11yNameButtonUnzoom="Cerrar fotografía"
        onZoomChange={(isZoomed) => { if (isZoomed) gallery?.open(index); }}
        ZoomContent={GalleryZoomContent}
      >
        <img
          src={optimizedPhotoUrl(src)}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="gallery-photo-image"
          width={width}
          height={height}
        />
      </Zoom>
    </div>
  );
}

"use client";

import Zoom from "react-medium-image-zoom";
import { useContext, useEffect, useRef } from "react";
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
  const imgRef = useRef<HTMLImageElement>(null);
  const ratioRef = useRef<{ src: string; ratio: string } | null>(null);
  const gallery = useContext(GalleryLightboxContext);
  const srcSet = [480, 800, 1200, 1600, 2400]
    .map((size) => `${optimizedPhotoUrl(src, size, size <= 480 ? 45 : size <= 800 ? 70 : 85)} ${size}w`)
    .join(", ");

  function revealImage(image: HTMLImageElement) {
    // Older API records lack dimensions. Correct their reserved ratio after loading.
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      // Responsive rendition changes can round density-corrected dimensions differently.
      // Keep the first loaded source ratio stable when its rendition/size changes.
      if (ratioRef.current?.src !== src) {
        ratioRef.current = { src, ratio: `${image.naturalWidth} / ${image.naturalHeight}` };
      }
      image.closest<HTMLElement>(".gallery-photo")?.style.setProperty("aspect-ratio", ratioRef.current.ratio);
    }
  }

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      const image = imgRef.current;
      if (ratioRef.current?.src !== src) {
        ratioRef.current = { src, ratio: `${image.naturalWidth} / ${image.naturalHeight}` };
      }
      image.closest<HTMLElement>(".gallery-photo")?.style.setProperty("aspect-ratio", ratioRef.current.ratio);
    }
  }, [src]);

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
          ref={imgRef}
          src={optimizedPhotoUrl(src)}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={(event) => revealImage(event.currentTarget)}
          className="gallery-photo-image"
          width={width}
          height={height}
        />
      </Zoom>
    </div>
  );
}

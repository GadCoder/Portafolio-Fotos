"use client";

import { cloneElement, createContext, useCallback, useContext, useEffect, useState, type ImgHTMLAttributes, type ReactElement, type ReactNode } from "react";
import type { ControlledProps } from "react-medium-image-zoom";
import { optimizedPhotoUrl, type GalleryPhoto } from "@/lib/photos";

type LightboxContextValue = {
  photos: GalleryPhoto[];
  anchor: number;
  index: number;
  open: (index: number) => void;
  navigate: (direction: number) => void;
};

export const GalleryLightboxContext = createContext<LightboxContextValue | null>(null);

export function GalleryLightboxProvider({ photos, children }: { photos: GalleryPhoto[]; children: ReactNode }) {
  const [selection, setSelection] = useState({ anchor: 0, index: 0 });
  const open = useCallback((index: number) => setSelection({ anchor: index, index }), []);
  const navigate = useCallback((direction: number) => {
    setSelection((current) => ({ ...current, index: Math.max(0, Math.min(photos.length - 1, current.index + direction)) }));
  }, [photos.length]);

  return (
    <GalleryLightboxContext.Provider value={{ photos, ...selection, open, navigate }}>
      {children}
    </GalleryLightboxContext.Provider>
  );
}

export function GalleryZoomContent({ img, buttonUnzoom, modalState }: Parameters<NonNullable<ControlledProps["ZoomContent"]>>[0]) {
  const gallery = useContext(GalleryLightboxContext);
  const active = modalState === "LOADED";
  const navigate = gallery?.navigate;

  useEffect(() => {
    if (!active || !navigate) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      navigate(event.key === "ArrowRight" ? 1 : -1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, navigate]);

  const photo = gallery?.photos[gallery.index];
  const navigated = active && gallery && gallery.index !== gallery.anchor && photo && img;
  const displayedImage = navigated
    ? cloneElement(img as ReactElement<ImgHTMLAttributes<HTMLImageElement>>, {
        src: optimizedPhotoUrl(photo.photo_url, 2400, 85),
        srcSet: undefined,
        sizes: undefined,
        alt: photo.name,
        style: {
          position: "absolute", inset: "24px", width: "calc(100% - 48px)",
          height: "calc(100% - 48px)", objectFit: "scale-down", transform: "none", transition: "none",
        },
      })
    : img;

  return (
    <>
      {displayedImage}
      {buttonUnzoom}
      {active && gallery && gallery.photos.length > 1 && (
        <div className="gallery-lightbox-navigation">
          <button type="button" aria-label="Fotografía anterior" disabled={gallery.index === 0} onClick={(event) => { event.stopPropagation(); gallery.navigate(-1); }}>←</button>
          <span role="status" aria-live="polite">{gallery.index + 1} / {gallery.photos.length}</span>
          <button type="button" aria-label="Fotografía siguiente" disabled={gallery.index === gallery.photos.length - 1} onClick={(event) => { event.stopPropagation(); gallery.navigate(1); }}>→</button>
        </div>
      )}
    </>
  );
}

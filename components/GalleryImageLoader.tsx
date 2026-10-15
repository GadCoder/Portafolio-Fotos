"use client";

import { useEffect, useRef, type ReactNode } from "react";

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

/** Start nearby image requests ahead of fast scrolling without changing layout. */
export default function GalleryImageLoader({ children }: { children: ReactNode }) {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !("IntersectionObserver" in window)
      || (navigator as NavigatorWithConnection).connection?.saveData) return;

    let observer: IntersectionObserver;
    const observeImages = () => {
      observer?.disconnect();
      const ahead = Math.max(2000, Math.min(4000, window.innerHeight * 3));
      observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting || !(target instanceof HTMLImageElement)) return;
          // Keep the original src/srcset: the browser selects and caches one rendition.
          target.loading = "eager";
          currentObserver.unobserve(target);
        });
      }, { rootMargin: `${ahead}px 0px` });
      gallery.querySelectorAll<HTMLImageElement>('img.gallery-photo-image[loading="lazy"]')
        .forEach((image) => observer.observe(image));
    };

    observeImages();
    window.addEventListener("resize", observeImages);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", observeImages);
    };
  }, []);

  return <div ref={galleryRef} className="editorial-gallery">{children}</div>;
}

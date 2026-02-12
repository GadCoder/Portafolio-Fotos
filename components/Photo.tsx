"use client";

import Zoom from "react-medium-image-zoom";
import { useMemo, useState, useEffect, useRef } from "react";
import "react-medium-image-zoom/dist/styles.css";

interface PhotoProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export default function Photo({ src, alt, width, height }: PhotoProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Responsive quality: smaller images for mobile via CSS srcset, quality handled by CDN
  const optimizedSrc = useMemo(() => {
    const cleanUrl = src.replace("https://portfolio.cdn.gadcoder.com/", "");
    return `https://portfolio.cdn.gadcoder.com/cdn-cgi/image/quality=70,format=auto/${cleanUrl}`;
  }, [src]);

  // Smaller quality for mobile viewports via srcset
  const srcSet = useMemo(() => {
    const cleanUrl = src.replace("https://portfolio.cdn.gadcoder.com/", "");
    // Generate responsive URLs at different quality points
    const lowQuality = `https://portfolio.cdn.gadcoder.com/cdn-cgi/image/quality=45,format=auto,w=480/${cleanUrl} 480w`;
    const mediumQuality = `https://portfolio.cdn.gadcoder.com/cdn-cgi/image/quality=70,format=auto,w=800/${cleanUrl} 800w`;
    const highQuality = `https://portfolio.cdn.gadcoder.com/cdn-cgi/image/quality=85,format=auto,w=1200/${cleanUrl} 1200w`;
    return `${lowQuality}, ${mediumQuality}, ${highQuality}`;
  }, [src]);

  const aspectRatio = (height / width) * 100;

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, []);

  return (
    <div
      className="relative w-full mb-6 overflow-hidden rounded"
      style={{ paddingBottom: `${aspectRatio}%` }}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse rounded" />
      )}

      <Zoom>
        <img
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ease-in ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          width={width}
          height={height}
        />
      </Zoom>
    </div>
  );
}

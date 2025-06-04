"use client";

import Zoom from "react-medium-image-zoom";
import { useMemo, useState, useEffect, useRef } from "react";
import "react-medium-image-zoom/dist/styles.css";

interface PhotoProps {
  src: string;
  imageQuality: number;
  width: number;
  height: number;
}

export default function Photo({ src, imageQuality, width, height }: PhotoProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const optimizedSrc = useMemo(() => {
    const cleanUrl = src.replace("https://portfolio.cdn.gadcoder.com/", "");
    return `https://portfolio.cdn.gadcoder.com/cdn-cgi/image/quality=${imageQuality},format=auto/${cleanUrl}`;
  }, [src, imageQuality]);

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
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ease-in ${loaded ? "opacity-100" : "opacity-0"
            }`}
          width={width}
          height={height}
        />
      </Zoom>
    </div>
  );
}

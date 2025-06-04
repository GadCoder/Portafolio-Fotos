import Zoom from "react-medium-image-zoom";
import { useMemo } from "react";

interface PhotoProps {
  src: string;
  imageQuality: number;
  width?: number;
  height?: number;
}

export default function Photo({
  src,
  imageQuality,
  width,
  height
}: PhotoProps) {
  // Memoize the transformed URL to avoid recomputation on every render
  const optimizedSrc = useMemo(() => {
    const cleanUrl = src.replace("https://portfolio.cdn.gadcoder.com/", "");
    return `https://portfolio.cdn.gadcoder.com/cdn-cgi/image/quality=${imageQuality},format=auto/${cleanUrl}`;
  }, [src, imageQuality]);

  // Define styles with useMemo to prevent unnecessary recalculations
  const imageStyle: React.CSSProperties = useMemo(() => ({
    width: "100%",
    height: "auto",
    objectFit: "cover",
    aspectRatio: width && height ? `${width}/${height}` : undefined,
  }), [width, height]);

  return (
    <div className="flex justify-center">
      <Zoom>
        <img
          src={optimizedSrc}
          alt="" // Always include alt text for accessibility
          sizes="(max-width: 768px) 100vw, 50vw"
          style={imageStyle}
          loading="lazy"
          decoding="async" // Improves page loading performance
          className="mb-6 rounded"
          width={width} // Helps browser reserve space and prevent layout shifts
          height={height}
        />
      </Zoom>
    </div>
  );
}
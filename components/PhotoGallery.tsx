"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Photo from "@/components/Photo";

type GalleryPhoto = {
  id: number;
  is_horizontal: boolean;
  photo_url: string;
  name: string;
};

const COLUMN_GAP = 24;
const ROW_TRACK_HEIGHT = 8;
const ROW_GAP = 8;

function getColumnCount(width: number) {
  if (width < 768) return 1;
  if (width < 1024) return 2;
  return 3;
}

export default function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [galleryWidth, setGalleryWidth] = useState(1200);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const observer = new ResizeObserver(([entry]) => {
      setGalleryWidth(entry.contentRect.width);
    });
    observer.observe(gallery);
    return () => observer.disconnect();
  }, []);

  const columns = getColumnCount(galleryWidth);
  const columnWidth =
    (galleryWidth - COLUMN_GAP * (columns - 1)) / columns;
  const rowSpans = useMemo(
    () =>
      photos.map((photo) => {
        const aspectRatio = photo.is_horizontal ? 3 / 2 : 2 / 3;
        const imageHeight = columnWidth / aspectRatio;
        return Math.ceil(
          (imageHeight + ROW_GAP) / (ROW_TRACK_HEIGHT + ROW_GAP)
        );
      }),
    [columnWidth, photos]
  );

  return (
    <div
      ref={galleryRef}
      className="grid grid-cols-1 grid-flow-row-dense items-start md:grid-cols-2 lg:grid-cols-3"
      style={{
        gridAutoRows: `${ROW_TRACK_HEIGHT}px`,
        columnGap: `${COLUMN_GAP}px`,
        rowGap: `${ROW_GAP}px`,
      }}
    >
      {photos.map((photo, index) => (
        <div key={photo.id} style={{ gridRowEnd: `span ${rowSpans[index]}` }}>
          <Photo
            src={photo.photo_url}
            alt={photo.name}
            width={photo.is_horizontal ? 1200 : 800}
            height={photo.is_horizontal ? 800 : 1200}
          />
        </div>
      ))}
    </div>
  );
}

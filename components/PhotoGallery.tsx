"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Photo from "@/components/Photo";

type GalleryPhoto = {
  id: number;
  is_horizontal: boolean;
  photo_url: string;
  name: string;
};

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
  const rows = useMemo(() => {
    const groupedPhotos: { photo: GalleryPhoto; span: number }[][] = [];
    let row: { photo: GalleryPhoto; span: number }[] = [];
    let occupiedColumns = 0;

    photos.forEach((photo) => {
      const span = columns > 1 && photo.is_horizontal ? 2 : 1;
      if (row.length > 0 && occupiedColumns + span > columns) {
        groupedPhotos.push(row);
        row = [];
        occupiedColumns = 0;
      }

      row.push({ photo, span });
      occupiedColumns += span;
    });

    if (row.length > 0) groupedPhotos.push(row);

    const lastRow = groupedPhotos[groupedPhotos.length - 1];
    if (columns > 2 && lastRow?.length === 1 && lastRow[0].photo.is_horizontal) {
      lastRow[0].span = columns;
    }

    return groupedPhotos;
  }, [columns, photos]);

  return (
    <div ref={galleryRef} className="flex flex-col gap-6">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid items-start gap-6"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {row.map(({ photo, span }) => (
            <div key={photo.id} style={{ gridColumn: `span ${span}` }}>
              <Photo
                src={photo.photo_url}
                alt={photo.name}
                width={photo.is_horizontal ? 1200 : 800}
                height={photo.is_horizontal ? 800 : 1200}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

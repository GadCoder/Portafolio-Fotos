export type LayoutPhoto = {
  aspectRatio: number;
  intrinsicWidth: number;
  featured?: boolean;
  featuredLayout?: "wide" | "contained" | null;
  captionHeight?: number;
};

export type PhotoPlacement = {
  column: number;
  span: number;
  top: number;
  width: number;
  height: number;
};

/** Pack source-order photos into the earliest space that fits their real proportions. */
export function packGallery(
  photos: readonly LayoutPhoto[],
  containerWidth: number,
  columns: number,
  gap: number,
): PhotoPlacement[] {
  if (containerWidth <= 0 || columns < 1) return [];
  const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
  const lanes: PhotoPlacement[][] = Array.from({ length: columns }, () => []);

  function findSpace(span: number, height: number) {
    let best = { column: 0, top: Infinity };
    for (let column = 0; column <= columns - span; column++) {
      const obstacles = lanes.slice(column, column + span).flat();
      let top = 0;
      while (true) {
        const collisions = obstacles.filter((item) =>
          top < item.top + item.height + gap && top + height + gap > item.top);
        if (!collisions.length) break;
        top = Math.max(...collisions.map((item) => item.top + item.height + gap));
      }
      if (top < best.top) best = { column, top };
    }
    return best;
  }

  return photos.map((photo) => {
    const ratio = Number.isFinite(photo.aspectRatio) && photo.aspectRatio > 0 ? photo.aspectRatio : 1;
    const heightFor = (width: number) => Math.ceil(
      Math.min(width, photo.intrinsicWidth) / ratio + (photo.captionHeight ?? 0));
    let span = 1;
    let width = columnWidth;
    let height = heightFor(width);
    let position = findSpace(span, height);

    // Wide images can bridge aligned lanes; portrait images never make a tall wall.
    const wideWidth = columnWidth * 2 + gap;
    if (columns > 1 && photo.featured && ratio >= 1.2 && photo.intrinsicWidth >= wideWidth) {
      const wideHeight = heightFor(wideWidth);
      const widePosition = findSpace(2, wideHeight);
      const maxHole = Math.min(64, columnWidth * (photo.featuredLayout === "contained" ? 0.1 : 0.2));
      const holes = lanes.slice(widePosition.column, widePosition.column + 2).map((lane) => {
        const preceding = lane.filter((item) => item.top + item.height + gap <= widePosition.top);
        const bottom = preceding.length ? Math.max(...preceding.map((item) => item.top + item.height + gap)) : 0;
        return widePosition.top - bottom;
      });
      if (widePosition.top <= position.top + maxHole && Math.max(...holes) <= maxHole) {
        span = 2;
        width = wideWidth;
        height = wideHeight;
        position = widePosition;
      }
    }

    const placement = { ...position, span, width, height };
    for (let column = position.column; column < position.column + span; column++) {
      lanes[column].push(placement);
    }
    return placement;
  });
}

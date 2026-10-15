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
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Justify regular rows and balance each feature with nearby companion photos. */
export function packGallery(
  photos: readonly LayoutPhoto[],
  containerWidth: number,
  columns: number,
  gap: number,
): PhotoPlacement[] {
  if (containerWidth <= 0 || columns < 1) return [];
  const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
  const ratio = (index: number) => Number.isFinite(photos[index].aspectRatio) && photos[index].aspectRatio > 0 ? photos[index].aspectRatio : 1;
  const caption = (index: number) => photos[index].captionHeight ?? 0;
  const placements: PhotoPlacement[] = Array(photos.length);
  let remaining = photos.map((_, index) => index);
  let top = 0;

  function place(index: number, left: number, y: number, width: number, span = 1) {
    const renderedWidth = Math.min(width, photos[index].intrinsicWidth);
    placements[index] = {
      column: left === 0 ? 0 : span === 2 ? 1 : columns - 1,
      span, left, top: y, width: renderedWidth,
      height: renderedWidth / ratio(index) + caption(index),
    };
    return placements[index].height;
  }

  while (remaining.length) {
    const feature = columns >= 2
      ? remaining.slice(0, columns).find((index) => photos[index].featured && ratio(index) >= 0.45 && photos[index].intrinsicWidth >= columnWidth * 1.5)
      : undefined;

    if (feature !== undefined) {
      // Bounded lookahead keeps companions close to the feature in source order.
      const neighbours = remaining.slice(0, 12).filter((index) => index !== feature && !photos[index].featured && photos[index].intrinsicWidth >= columnWidth * 0.75);
      let best: { companions: number[]; featureWidth: number; sideWidth: number; height: number; score: number } | undefined;
      for (let count = 1; count <= Math.min(2, neighbours.length); count++) {
        const companions = neighbours.slice(0, count);
        const sum = companions.reduce((total, index) => total + 1 / ratio(index), 0);
        const sideCaptions = companions.reduce((total, index) => total + caption(index), 0);
        // Equalize the feature's height with the stacked companions, including gaps/caption.
        const sideWidth = (containerWidth - gap + ratio(feature) * (caption(feature) - sideCaptions - gap * (count - 1))) / (1 + ratio(feature) * sum);
        const featureWidth = containerWidth - gap - sideWidth;
        if (featureWidth <= 0 || sideWidth <= 0 || featureWidth > photos[feature].intrinsicWidth || companions.some((index) => sideWidth > photos[index].intrinsicWidth)) continue;
        const height = featureWidth / ratio(feature) + caption(feature);
        // Keep the feature prominent without shrinking its companions into thumbnails.
        const score = Math.abs(featureWidth - sideWidth * 1.4) + (featureWidth < sideWidth * 1.15 ? containerWidth : 0);
        if (!best || score < best.score) best = { companions, featureWidth, sideWidth, height, score };
      }
      if (best) {
        const featureFirst = feature < best.companions[0];
        place(feature, featureFirst ? 0 : best.sideWidth + gap, top, best.featureWidth, 2);
        let sideTop = top;
        for (const index of best.companions) {
          sideTop += place(index, featureFirst ? best.featureWidth + gap : 0, sideTop, best.sideWidth) + gap;
        }
        const consumed = new Set([feature, ...best.companions]);
        remaining = remaining.filter((index) => !consumed.has(index));
        top += best.height + gap;
        continue;
      }
    }

    // Two-photo rows give regular photos a similar scale to the feature's companions.
    const rowColumns = Math.min(columns, 2);
    const row = remaining.splice(0, rowColumns);
    const regularWidth = (containerWidth - gap * (rowColumns - 1)) / rowColumns;
    const availableWidth = row.length < rowColumns ? regularWidth * row.length : containerWidth - gap * (row.length - 1);
    const sum = row.reduce((total, index) => total + ratio(index), 0);
    const imageHeight = Math.min(availableWidth / sum, ...row.map((index) => photos[index].intrinsicWidth / ratio(index)));
    let left = 0;
    let rowHeight = 0;
    for (const index of row) {
      const width = imageHeight * ratio(index);
      rowHeight = Math.max(rowHeight, place(index, left, top, width));
      left += width + gap;
    }
    top += rowHeight + gap;
  }
  return placements;
}

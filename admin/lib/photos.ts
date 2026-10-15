const IMAGE_CDN_HOST = 'portfolio.cdn.gadcoder.com';

export function adminPhotoUrl(src: string, width?: number) {
  try {
    const image = new URL(src);
    if (image.hostname !== IMAGE_CDN_HOST) return src;
    const resize = width ? `,w=${width},fit=scale-down` : '';
    return `https://${IMAGE_CDN_HOST}/cdn-cgi/image/quality=45,format=auto${resize}${image.pathname}${image.search}`;
  } catch {
    return src;
  }
}

const IMAGE_CDN_HOST = 'portfolio.cdn.gadcoder.com';

export function adminPhotoUrl(src: string) {
  try {
    const image = new URL(src);
    if (image.hostname !== IMAGE_CDN_HOST) return src;
    return `https://${IMAGE_CDN_HOST}/cdn-cgi/image/quality=45,format=auto${image.pathname}${image.search}`;
  } catch {
    return src;
  }
}

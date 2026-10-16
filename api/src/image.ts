import sharp from "sharp";
import { config } from "./config.js";

export type NormalizedImage = {
  buffer: Buffer;
  isHorizontal: boolean;
  width: number;
  height: number;
};

export async function normalizeImage(input: Buffer): Promise<NormalizedImage> {
  try {
    const source = sharp(input, { limitInputPixels: config.imageMaxPixels });
    const metadata = await source.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new Error("Unsupported image format");
    }
    if ((metadata.pages ?? 1) !== 1) {
      throw new Error("Animated and multi-frame images are not supported");
    }
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > config.imageMaxPixels) {
      throw new Error("Image dimensions exceed the supported limit");
    }

    let pipeline = sharp(input, { limitInputPixels: config.imageMaxPixels }).rotate();
    const icc = metadata.icc;
    if (icc && icc.length >= 20 && icc.toString("ascii", 16, 20) === "RGB ") {
      pipeline = pipeline.keepIccProfile();
    }
    const { data, info } = await pipeline.webp({ quality: 85, effort: 6 }).toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      isHorizontal: info.width > info.height,
      width: info.width,
      height: info.height,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Image could not be decoded";
    throw Object.assign(new Error(`Invalid or unsupported image: ${detail}`), { statusCode: 400 });
  }
}

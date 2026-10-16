import { randomUUID } from "node:crypto";
import path from "node:path";
import type { PhotoPresentationUpdate } from "@portfolio-photos/contracts";
import { Prisma } from "./generated/prisma/client.js";
import { prisma } from "./db.js";
import { normalizeImage } from "./image.js";
import { queueGalleryPublication } from "./publication.js";
import { deletePhoto, savePhoto } from "./storage.js";
import { toPhotoDto } from "./photo-dto.js";

export class HttpError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
  }
}

export async function getAllPhotos() {
  const photos = await prisma.photo.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return photos.map(toPhotoDto);
}

function safeFilename(filename: string): string {
  return path.posix.basename(filename.replaceAll("\\", "/")) || "unnamed image";
}

function webpFilename(filename: string): string {
  const safe = safeFilename(filename);
  const stem = path.posix.parse(safe).name;
  const clean = stem.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-]+|[.-]+$/g, "").slice(0, 100) || "photo";
  return `${randomUUID().replaceAll("-", "")}-${clean}.webp`;
}

export async function uploadPhoto(input: Buffer, originalFilename: string) {
  const filename = safeFilename(originalFilename);
  const normalized = await normalizeImage(input);
  const storedName = webpFilename(filename);
  let uploaded = false;
  try {
    const photoUrl = await savePhoto(normalized.buffer, storedName);
    uploaded = true;
    await prisma.$transaction(async (tx) => {
      await tx.photo.create({
        data: {
          isHorizontal: normalized.isHorizontal,
          photoUrl,
          name: filename.slice(0, 255),
          width: normalized.width,
          height: normalized.height,
          createdAt: new Date(),
        },
      });
      await queueGalleryPublication(tx);
    }, { isolationLevel: "Serializable" });
    return storedName;
  } catch (error) {
    if (uploaded) await deletePhoto(storedName);
    throw error;
  }
}

async function validatePublishedSeries(tx: Prisma.TransactionClient, seriesId: number, photoCountOverride?: number) {
  const series = await tx.series.findUnique({ where: { id: seriesId } });
  if (!series?.published) return;
  const count = photoCountOverride ?? await tx.photo.count({ where: { seriesId } });
  if (count <= 5) return;
  const previewCount = await tx.photo.count({ where: { seriesId, showInPreview: true } });
  if (previewCount < 1 || previewCount > 6) {
    throw new HttpError(422, "A published series with more than five photos needs between one and six preview photos");
  }
}

export async function updatePhotoPresentation(photoId: number, changes: PhotoPresentationUpdate) {
  try {
    return await prisma.$transaction(async (tx) => {
      const photo = await tx.photo.findUnique({ where: { id: photoId } });
      if (!photo) throw new HttpError(404, "Photo not found");

      const oldSeriesId = photo.seriesId;
      let newSeriesId = oldSeriesId;
      const next: Record<string, unknown> = { ...changes };
      if (Object.hasOwn(changes, "seriesSlug")) {
        const slug = changes.seriesSlug;
        delete next.seriesSlug;
        if (slug === null) {
          newSeriesId = null;
          Object.assign(next, { seriesSlug: null, seriesId: null, seriesPosition: null, showInPreview: false, previewPosition: null });
        } else {
          const series = await tx.series.findUnique({ where: { slug: slug! } });
          if (!series) throw new HttpError(422, "seriesSlug must reference an existing series");
          if (oldSeriesId !== null && oldSeriesId !== series.id) throw new HttpError(409, "Photo is already assigned to another series");
          newSeriesId = series.id;
          const last = await tx.photo.aggregate({ where: { seriesId: series.id }, _max: { seriesPosition: true } });
          Object.assign(next, {
            seriesSlug: series.slug,
            seriesId: series.id,
            ...(photo.seriesPosition === null ? { seriesPosition: (last._max.seriesPosition ?? -1) + 1 } : {}),
          });
        }
      }

      const updated = await tx.photo.update({ where: { id: photoId }, data: next as never });
      if (oldSeriesId !== null) await validatePublishedSeries(tx, oldSeriesId);
      if (newSeriesId !== null && newSeriesId !== oldSeriesId) await validatePublishedSeries(tx, newSeriesId);
      await queueGalleryPublication(tx);
      return toPhotoDto(updated);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      throw new HttpError(409, "Photo membership changed; retry the update");
    }
    throw error;
  }
}

function objectKey(photoUrl: string | null, filename: string | null, bucket: string): string {
  if (!photoUrl) return filename ?? "";
  const pathname = decodeURIComponent(new URL(photoUrl).pathname).replace(/^\/+/, "");
  const prefix = bucket ? `${bucket}/` : "";
  return prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) : filename ?? pathname;
}

export async function deletePhotoRecord(photoId: number) {
  const observed = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!observed) throw new HttpError(404, `Photo with id ${photoId} not founded`);
  if (observed.seriesId !== null && observed.showInPreview) {
    const series = await prisma.series.findUnique({ where: { id: observed.seriesId } });
    if (series?.published) {
      const total = await prisma.photo.count({ where: { seriesId: observed.seriesId } });
      const previewTotal = await prisma.photo.count({ where: { seriesId: observed.seriesId, showInPreview: true } });
      if (total - 1 > 5 && previewTotal <= 1) {
        throw new HttpError(422, "A published series with more than five photos needs between one and six preview photos");
      }
    }
  }
  const key = objectKey(observed.photoUrl, observed.name, process.env.s3_bucket_name ?? "");
  await deletePhoto(key);
  try {
    await prisma.$transaction(async (tx) => {
      const photo = await tx.photo.findUnique({ where: { id: photoId } });
      if (!photo) throw new HttpError(404, `Photo with id ${photoId} not founded`);
      if (photo.seriesId !== null) {
        const series = await tx.series.findUnique({ where: { id: photo.seriesId } });
        if (series?.published) {
          const remainingCount = await tx.photo.count({ where: { seriesId: photo.seriesId } }) - 1;
          if (remainingCount > 5 && photo.showInPreview) {
            const previews = await tx.photo.count({ where: { seriesId: photo.seriesId, showInPreview: true } });
            if (previews <= 1) throw new HttpError(422, "A published series with more than five photos needs between one and six preview photos");
          }
        }
      }
      await tx.photo.delete({ where: { id: photoId } });
      await queueGalleryPublication(tx);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      throw new HttpError(409, "Photo membership changed; retry the deletion");
    }
    throw error;
  }
  return { status: `Photo  with id ${photoId} deleted` };
}

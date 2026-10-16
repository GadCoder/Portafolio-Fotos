import type { AdminSeriesDto, PublicSeriesDto, SeriesMetadata, SeriesUpdate } from "@portfolio-photos/contracts";
import { Prisma } from "./generated/prisma/client.js";
import { prisma } from "./db.js";
import { HttpError } from "./photo-repository.js";
import { queueGalleryPublication } from "./publication.js";
import { toPhotoDto } from "./photo-dto.js";

type Transaction = Prisma.TransactionClient;

function orderedPhotos(tx: Transaction, seriesId: number) {
  return tx.photo.findMany({
    where: { seriesId },
    orderBy: [{ seriesPosition: { sort: "asc", nulls: "last" } }, { id: "asc" }],
  });
}

async function validatePublishedSeries(tx: Transaction, seriesId: number, photos?: Awaited<ReturnType<typeof orderedPhotos>>) {
  const series = await tx.series.findUnique({ where: { id: seriesId } });
  if (!series?.published) return;
  const members = photos ?? await orderedPhotos(tx, seriesId);
  if (members.length <= 5) return;
  const previewCount = members.filter((photo) => photo.showInPreview).length;
  if (previewCount < 1 || previewCount > 6) {
    throw new HttpError(422, "A published series with more than five photos needs between one and six preview photos");
  }
}

async function seriesDto(tx: Transaction, seriesId: number, admin: boolean): Promise<AdminSeriesDto | PublicSeriesDto> {
  const series = await tx.series.findUnique({ where: { id: seriesId } });
  if (!series) throw new HttpError(404, "Series not found");
  const photos = await orderedPhotos(tx, series.id);
  await validatePublishedSeries(tx, series.id, photos);
  const selected = photos.filter((photo) => photo.showInPreview).sort((a, b) =>
    (a.previewPosition ?? Number.MAX_SAFE_INTEGER) - (b.previewPosition ?? Number.MAX_SAFE_INTEGER) || a.id - b.id,
  );
  const preview = photos.length <= 5 ? photos : selected;
  const data = {
    id: series.id,
    slug: series.slug,
    title: series.title,
    description: series.description,
    year: series.year,
    position: series.position,
    totalPhotos: photos.length,
    previewPhotos: preview.map(toPhotoDto),
    photos: photos.map(toPhotoDto),
  };
  return admin ? { ...data, published: series.published } : data;
}

function httpDatabaseError(error: unknown): never {
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "P2002") throw new HttpError(409, "Series slug already exists");
    if (error.code === "P2034") throw new HttpError(409, "Series changed; retry the request");
  }
  throw error;
}

export async function listSeries(admin = false): Promise<(AdminSeriesDto | PublicSeriesDto)[]> {
  const rows = await prisma.series.findMany({
    where: admin ? undefined : { published: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  return Promise.all(rows.map((series) => prisma.$transaction((tx) => seriesDto(tx, series.id, admin))));
}

export async function getPublishedSeries(slug: string): Promise<PublicSeriesDto> {
  const series = await prisma.series.findFirst({ where: { slug, published: true } });
  if (!series) throw new HttpError(404, "Series not found");
  return prisma.$transaction(async (tx) => await seriesDto(tx, series.id, false) as PublicSeriesDto);
}

export async function createSeries(values: SeriesMetadata): Promise<AdminSeriesDto> {
  try {
    return await prisma.$transaction(async (tx) => {
      const position = values.position ?? ((await tx.series.aggregate({ _max: { position: true } }))._max.position ?? -1) + 1;
      const now = new Date();
      const created = await tx.series.create({
        data: { ...values, position, createdAt: now, updatedAt: now },
      });
      await validatePublishedSeries(tx, created.id);
      await queueGalleryPublication(tx);
      return await seriesDto(tx, created.id, true) as AdminSeriesDto;
    }, { isolationLevel: "Serializable" });
  } catch (error) { return httpDatabaseError(error); }
}

export async function updateSeries(seriesId: number, changes: SeriesUpdate): Promise<AdminSeriesDto> {
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.series.findUnique({ where: { id: seriesId } });
      if (!current) throw new HttpError(404, "Series not found");
      if (changes.slug !== undefined && changes.slug !== null) {
        const duplicate = await tx.series.findFirst({ where: { slug: changes.slug, id: { not: seriesId } } });
        if (duplicate) throw new HttpError(409, "Series slug already exists");
      }
      const next = await tx.series.update({
        where: { id: seriesId },
        data: { ...changes, updatedAt: new Date() } as never,
      });
      if (changes.slug !== undefined && changes.slug !== null) {
        await tx.photo.updateMany({ where: { seriesId }, data: { seriesSlug: next.slug } });
      }
      await validatePublishedSeries(tx, seriesId);
      await queueGalleryPublication(tx);
      return await seriesDto(tx, seriesId, true) as AdminSeriesDto;
    }, { isolationLevel: "Serializable" });
  } catch (error) { return httpDatabaseError(error); }
}

export async function removeSeries(seriesId: number): Promise<{ status: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const series = await tx.series.findUnique({ where: { id: seriesId } });
      if (!series) throw new HttpError(404, "Series not found");
      await tx.photo.updateMany({
        where: { seriesId },
        data: { seriesId: null, seriesSlug: null, seriesPosition: null, showInPreview: false, previewPosition: null },
      });
      await tx.series.delete({ where: { id: seriesId } });
      await queueGalleryPublication(tx);
    }, { isolationLevel: "Serializable" });
    return { status: "deleted" };
  } catch (error) { return httpDatabaseError(error); }
}

export async function reorderSeries(ids: number[]): Promise<AdminSeriesDto[]> {
  try {
    await prisma.$transaction(async (tx) => {
      const all = await tx.series.findMany({ select: { id: true }, orderBy: { id: "asc" } });
      const known = new Set(all.map(({ id }) => id));
      if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
        throw new HttpError(422, "seriesIds must contain every series ID exactly once");
      }
      for (const [position, id] of ids.entries()) {
        await tx.series.update({ where: { id }, data: { position, updatedAt: new Date() } });
      }
      await queueGalleryPublication(tx);
    }, { isolationLevel: "Serializable" });
    return await listSeries(true) as AdminSeriesDto[];
  } catch (error) { return httpDatabaseError(error); }
}

export async function replaceMembers(seriesId: number, photoIds: number[]): Promise<AdminSeriesDto> {
  try {
    return await prisma.$transaction(async (tx) => {
      const series = await tx.series.findUnique({ where: { id: seriesId } });
      if (!series) throw new HttpError(404, "Series not found");
      if (photoIds.length !== new Set(photoIds).size) throw new HttpError(422, "photoIds must not contain duplicates");
      const photos = photoIds.length ? await tx.photo.findMany({ where: { id: { in: photoIds } }, orderBy: { id: "asc" } }) : [];
      const byId = new Map(photos.map((photo) => [photo.id, photo]));
      if (byId.size !== photoIds.length) throw new HttpError(404, "One or more photos were not found");
      if (photos.some((photo) => photo.seriesId !== null && photo.seriesId !== seriesId)) {
        throw new HttpError(409, "A photo is already assigned to another series");
      }
      await tx.photo.updateMany({
        where: { seriesId, id: { notIn: photoIds } },
        data: { seriesId: null, seriesSlug: null, seriesPosition: null, showInPreview: false, previewPosition: null },
      });
      for (const [position, id] of photoIds.entries()) {
        const photo = byId.get(id)!;
        await tx.photo.update({
          where: { id },
          data: {
            seriesId,
            seriesSlug: series.slug,
            seriesPosition: position,
            ...(photo.seriesId === seriesId ? {} : { showInPreview: false, previewPosition: null }),
          },
        });
      }
      const members = photoIds.length ? await tx.photo.findMany({ where: { seriesId }, orderBy: [{ seriesPosition: { sort: "asc", nulls: "last" } }, { id: "asc" }] }) : [];
      await validatePublishedSeries(tx, seriesId, members);
      await queueGalleryPublication(tx);
      return await seriesDto(tx, seriesId, true) as AdminSeriesDto;
    }, { isolationLevel: "Serializable" });
  } catch (error) { return httpDatabaseError(error); }
}

export async function replacePreview(seriesId: number, photoIds: number[]): Promise<AdminSeriesDto> {
  try {
    return await prisma.$transaction(async (tx) => {
      const series = await tx.series.findUnique({ where: { id: seriesId } });
      if (!series) throw new HttpError(404, "Series not found");
      if (photoIds.length > 6 || photoIds.length !== new Set(photoIds).size) {
        throw new HttpError(422, "Preview must contain at most six unique photo IDs");
      }
      const members = await orderedPhotos(tx, seriesId);
      const byId = new Map(members.map((photo) => [photo.id, photo]));
      if (photoIds.some((id) => !byId.has(id))) throw new HttpError(422, "Preview photos must belong to this series");
      await tx.photo.updateMany({ where: { seriesId }, data: { showInPreview: false, previewPosition: null } });
      for (const [position, id] of photoIds.entries()) {
        await tx.photo.update({ where: { id }, data: { showInPreview: true, previewPosition: position } });
      }
      await validatePublishedSeries(tx, seriesId);
      await queueGalleryPublication(tx);
      return await seriesDto(tx, seriesId, true) as AdminSeriesDto;
    }, { isolationLevel: "Serializable" });
  } catch (error) { return httpDatabaseError(error); }
}

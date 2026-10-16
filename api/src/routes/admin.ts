import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AdminSeriesSchema,
  LoginRequestSchema,
  PhotoIdsSchema,
  PhotoPresentationUpdateSchema,
  SeriesMetadataSchema,
  SeriesOrderSchema,
  SeriesUpdateSchema,
  UploadResponseSchema,
} from "@portfolio-photos/contracts";
import { z } from "zod";
import { config, MAX_UPLOAD_BATCH_SIZE, MAX_UPLOAD_FILES, MAX_UPLOAD_SIZE } from "../config.js";
import { createAdminSession, getActiveAdminSession, PREAUTH_COOKIE, revokeAdminSession, SESSION_COOKIE, authenticateUser } from "../admin-session.js";
import { HttpError, deletePhotoRecord, getAllPhotos, updatePhotoPresentation, uploadPhoto } from "../photo-repository.js";
import { requestImmediateGalleryDeploy } from "../publication.js";
import { assertTrustedOrigin, constantTimeEquals, newCsrfToken } from "../security.js";
import { createSeries, listSeries, removeSeries, reorderSeries, replaceMembers, replacePreview, updateSeries } from "../series-repository.js";

function invalid(reply: FastifyReply, issues: z.core.$ZodIssue[]) {
  return reply.code(422).send({
    detail: issues.map((issue) => ({ loc: ["body", ...issue.path], msg: issue.message })),
  });
}

function setSessionCookie(reply: FastifyReply, name: string, value: string, maxAge: number) {
  reply.setCookie(name, value, {
    path: "/", maxAge, httpOnly: true, secure: config.cookieSecure, sameSite: "lax",
  });
}

async function requireSession(request: FastifyRequest, reply: FastifyReply, csrf?: string, write = false) {
  const session = await getActiveAdminSession(request.cookies[SESSION_COOKIE]);
  if (!session) {
    reply.code(401).send({ detail: "Authentication required" });
    return null;
  }
  if (write) {
    try { assertTrustedOrigin(request); }
    catch (error) {
      reply.code(403).send({ detail: error instanceof Error ? error.message : "Cross-origin request rejected" });
      return null;
    }
    if (!constantTimeEquals(session.csrfToken, csrf)) {
      reply.code(403).send({ detail: "Invalid CSRF token" });
      return null;
    }
  }
  return session;
}

function parseId(raw: string): number | null {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/api/session", async (request, reply) => {
    const session = await getActiveAdminSession(request.cookies[SESSION_COOKIE]);
    if (session) return { authenticated: true, user: session.user, csrf_token: session.csrfToken };
    const token = newCsrfToken();
    setSessionCookie(reply, PREAUTH_COOKIE, token, 300);
    return { authenticated: false, csrf_token: token };
  });

  app.post<{ Headers: { "x-csrf-token"?: string } }>("/admin/api/login", async (request, reply) => {
    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    try { assertTrustedOrigin(request); }
    catch (error) { return reply.code(403).send({ detail: error instanceof Error ? error.message : "Cross-origin request rejected" }); }
    if (!constantTimeEquals(request.cookies[PREAUTH_COOKIE], request.headers["x-csrf-token"])) {
      return reply.code(403).send({ detail: "Invalid CSRF token" });
    }
    if (!authenticateUser(parsed.data.user, parsed.data.password)) {
      return reply.code(401).send({ detail: "Invalid credentials" });
    }
    const { token, session } = await createAdminSession(parsed.data.user);
    setSessionCookie(reply, SESSION_COOKIE, token, config.adminSessionMaxAge);
    reply.clearCookie(PREAUTH_COOKIE, { path: "/" });
    return { authenticated: true, user: parsed.data.user, csrf_token: session.csrfToken };
  });

  app.post<{ Headers: { "x-csrf-token"?: string } }>("/admin/api/logout", async (request, reply) => {
    const session = await requireSession(request, reply, request.headers["x-csrf-token"], true);
    if (!session) return;
    await revokeAdminSession(request.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: "/", secure: config.cookieSecure, httpOnly: true, sameSite: "lax" });
    return reply.code(204).send();
  });

  app.post<{ Headers: { "x-csrf-token"?: string } }>("/admin/api/deploy", async (request, reply) => {
    const session = await requireSession(request, reply, request.headers["x-csrf-token"], true);
    if (!session) return;
    try {
      await requestImmediateGalleryDeploy();
      return reply.code(202).send({ status: "queued" });
    } catch (error) {
      const notConfigured = error instanceof Error && error.message === "Cloudflare Pages deploy hook is not configured";
      return reply.code(notConfigured ? 503 : 502).send({ detail: notConfigured ? error.message : "Could not request Cloudflare Pages deployment" });
    }
  });

  app.get("/admin/api/photos", async (request, reply) => {
    if (!await requireSession(request, reply)) return;
    return reply.send(await getAllPhotos());
  });

  app.post<{ Headers: { "x-csrf-token"?: string } }>("/admin/api/photos/upload", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    let files: { filename: string; buffer: Buffer }[];
    try {
      files = [];
      let batchBytes = 0;
      for await (const part of request.files({ limits: { files: MAX_UPLOAD_FILES, fileSize: MAX_UPLOAD_BATCH_SIZE } })) {
        if (part.fieldname !== "files") throw new HttpError(400, "Upload files must use the files field");
        const chunks: Buffer[] = [];
        let fileBytes = 0;
        for await (const chunk of part.file) {
          const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          fileBytes += data.length;
          batchBytes += data.length;
          if (batchBytes > MAX_UPLOAD_BATCH_SIZE) {
            throw new HttpError(413, "Selected files exceed the 90 MB total upload limit");
          }
          chunks.push(data);
        }
        if (part.file.truncated) throw new HttpError(413, "File exceeds the multipart size limit");
        files.push({ filename: part.filename || "unnamed image", buffer: Buffer.concat(chunks, fileBytes) });
      }
    } catch (error) {
      if (error instanceof HttpError) return reply.code(error.statusCode).send({ detail: error.message });
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      const message = error instanceof Error ? error.message : "Invalid multipart upload";
      return reply.code(code === "FST_FILES_LIMIT" ? 400 : 413).send({ detail: message });
    }
    if (!files.length || files.length > MAX_UPLOAD_FILES) {
      return reply.code(400).send({ detail: `Choose between 1 and ${MAX_UPLOAD_FILES} images` });
    }
    if (files.reduce((total, file) => total + file.buffer.length, 0) > MAX_UPLOAD_BATCH_SIZE) {
      return reply.code(413).send({ detail: "Selected files exceed the 90 MB total upload limit" });
    }
    const results = [];
    for (const file of files) {
      if (file.buffer.length > MAX_UPLOAD_SIZE) {
        results.push({ filename: file.filename, success: false as const, error: "File exceeds the 50 MB limit" });
        continue;
      }
      try {
        const stored = await uploadPhoto(file.buffer, file.filename);
        results.push({ filename: file.filename, stored_name: stored, success: true as const });
      } catch (error) {
        const statusCode = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
        results.push({
          filename: file.filename,
          success: false as const,
          error: error instanceof HttpError || statusCode === 400
            ? error instanceof Error ? error.message : "Invalid or unsupported image"
            : "Upload failed",
        });
      }
    }
    const output = UploadResponseSchema.parse({ results });
    return reply.send(output);
  });

  app.patch<{ Params: { photoId: string }; Headers: { "x-csrf-token"?: string } }>("/admin/api/photos/:photoId/presentation", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    const photoId = parseId(request.params.photoId);
    if (photoId === null) return reply.code(422).send({ detail: "photo_id must be a positive integer" });
    const parsed = PhotoPresentationUpdateSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    return reply.send(await updatePhotoPresentation(photoId, parsed.data));
  });

  app.delete<{ Params: { photoId: string }; Headers: { "x-csrf-token"?: string } }>("/admin/api/photos/:photoId", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    const photoId = parseId(request.params.photoId);
    if (photoId === null) return reply.code(422).send({ detail: "photo_id must be a positive integer" });
    return reply.send(await deletePhotoRecord(photoId));
  });

  app.get("/admin/api/series", async (request, reply) => {
    if (!await requireSession(request, reply)) return;
    return reply.send(await listSeries(true));
  });

  app.post<{ Headers: { "x-csrf-token"?: string } }>("/admin/api/series", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    const parsed = SeriesMetadataSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    const result = await createSeries(parsed.data);
    return reply.send(AdminSeriesSchema.parse(result));
  });

  app.patch<{ Params: { seriesId: string }; Headers: { "x-csrf-token"?: string } }>("/admin/api/series/:seriesId", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    const seriesId = parseId(request.params.seriesId);
    if (seriesId === null) return reply.code(422).send({ detail: "series_id must be a positive integer" });
    const parsed = SeriesUpdateSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    const changes = parsed.data;
    if (["slug", "title", "position", "published"].some((field) => Object.hasOwn(changes, field) && changes[field as keyof typeof changes] === null)) {
      return reply.code(422).send({ detail: "slug, title, position, and published cannot be null" });
    }
    return reply.send(await updateSeries(seriesId, changes));
  });

  app.delete<{ Params: { seriesId: string }; Headers: { "x-csrf-token"?: string } }>("/admin/api/series/:seriesId", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    const seriesId = parseId(request.params.seriesId);
    if (seriesId === null) return reply.code(422).send({ detail: "series_id must be a positive integer" });
    return reply.send(await removeSeries(seriesId));
  });

  app.put<{ Headers: { "x-csrf-token"?: string } }>("/admin/api/series/order", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    const parsed = SeriesOrderSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    return reply.send(await reorderSeries(parsed.data.seriesIds));
  });

  app.put<{ Params: { seriesId: string }; Headers: { "x-csrf-token"?: string } }>("/admin/api/series/:seriesId/photos", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    const seriesId = parseId(request.params.seriesId);
    if (seriesId === null) return reply.code(422).send({ detail: "series_id must be a positive integer" });
    const parsed = PhotoIdsSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    return reply.send(await replaceMembers(seriesId, parsed.data.photoIds));
  });

  app.put<{ Params: { seriesId: string }; Headers: { "x-csrf-token"?: string } }>("/admin/api/series/:seriesId/preview", async (request, reply) => {
    if (!await requireSession(request, reply, request.headers["x-csrf-token"], true)) return;
    const seriesId = parseId(request.params.seriesId);
    if (seriesId === null) return reply.code(422).send({ detail: "series_id must be a positive integer" });
    const parsed = PhotoIdsSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    return reply.send(await replacePreview(seriesId, parsed.data.photoIds));
  });
}

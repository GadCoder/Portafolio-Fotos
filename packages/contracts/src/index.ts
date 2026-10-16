import { z } from "zod";

const positiveId = z.number().int().positive();
const nonNegativePosition = z.number().int().nonnegative();
const nullableText = z.string().nullable();

export const PhotoPresentationSchema = z.object({
  featured: z.boolean().default(false),
  featuredLayout: z.enum(["wide", "contained"]).nullable().default(null),
  title: nullableText.default(null),
  location: nullableText.default(null),
  seriesSlug: nullableText.default(null),
});

export const PhotoSchema = PhotoPresentationSchema.extend({
  id: positiveId,
  is_horizontal: z.boolean(),
  photo_url: z.string().min(1),
  name: z.string(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  seriesId: positiveId.nullable().optional(),
  seriesPosition: nonNegativePosition.nullable().optional(),
  showInPreview: z.boolean().optional(),
  previewPosition: nonNegativePosition.nullable().optional(),
  created_at: z.string().optional().default(""),
});

export const PhotoPresentationUpdateSchema = z.object({
  featured: z.boolean().optional(),
  featuredLayout: z.enum(["wide", "contained"]).nullable().optional(),
  title: z.string().trim().max(255).nullable().optional(),
  location: z.string().trim().max(255).nullable().optional(),
  seriesSlug: z.string().trim().max(255).nullable().optional(),
}).strict();

export const SeriesSchema = z.object({
  id: positiveId,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  description: nullableText,
  year: z.number().int().min(1800).max(2200).nullable().optional(),
  position: nonNegativePosition,
  totalPhotos: z.number().int().nonnegative(),
  previewPhotos: z.array(PhotoSchema).max(6),
  photos: z.array(PhotoSchema),
});

export const PublicSeriesSchema = SeriesSchema.refine(
  (series) => series.photos.length === series.totalPhotos,
  "totalPhotos must match photos.length",
);

export const AdminSeriesSchema = SeriesSchema.extend({ published: z.boolean() }).refine(
  (series) => series.photos.length === series.totalPhotos,
  "totalPhotos must match photos.length",
);

export const SeriesMetadataSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().nullable().optional(),
  year: z.number().int().min(1800).max(2200).nullable().optional(),
  position: nonNegativePosition.optional(),
  published: z.boolean().optional().default(false),
}).strict();

export const SeriesUpdateSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable().optional(),
  title: z.string().trim().min(1).max(255).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  year: z.number().int().min(1800).max(2200).nullable().optional(),
  position: nonNegativePosition.nullable().optional(),
  published: z.boolean().nullable().optional(),
}).strict();

export const PhotoIdsSchema = z.object({ photoIds: z.array(positiveId) }).strict();
export const SeriesOrderSchema = z.object({ seriesIds: z.array(positiveId) }).strict();

export const UnauthenticatedSessionSchema = z.object({
  authenticated: z.literal(false),
  csrf_token: z.string().min(1),
});

export const AuthenticatedSessionSchema = z.object({
  authenticated: z.literal(true),
  user: z.string(),
  csrf_token: z.string().min(1),
});

export const SessionSchema = z.discriminatedUnion("authenticated", [
  UnauthenticatedSessionSchema,
  AuthenticatedSessionSchema,
]);

export const LoginRequestSchema = z.object({
  user: z.string(),
  password: z.string(),
}).strict();

export const UploadItemResultSchema = z.discriminatedUnion("success", [
  z.object({ filename: z.string(), stored_name: z.string(), success: z.literal(true) }),
  z.object({ filename: z.string(), success: z.literal(false), error: z.string() }),
]);

export const UploadResponseSchema = z.object({ results: z.array(UploadItemResultSchema) });
export const ApiErrorSchema = z.object({ detail: z.unknown() });

export type PhotoPresentation = z.infer<typeof PhotoPresentationSchema>;
export type PhotoDto = z.infer<typeof PhotoSchema>;
export type PhotoPresentationUpdate = z.infer<typeof PhotoPresentationUpdateSchema>;
export type PublicSeriesDto = z.infer<typeof PublicSeriesSchema>;
export type AdminSeriesDto = z.infer<typeof AdminSeriesSchema>;
export type SeriesMetadata = z.infer<typeof SeriesMetadataSchema>;
export type SeriesUpdate = z.infer<typeof SeriesUpdateSchema>;
export type SessionDto = z.infer<typeof SessionSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

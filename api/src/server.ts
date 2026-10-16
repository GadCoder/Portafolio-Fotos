import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { config, MAX_UPLOAD_BATCH_SIZE, MAX_UPLOAD_FILES } from "./config.js";
import { prisma } from "./db.js";
import { startPublicationWorker } from "./publication.js";
import { HttpError } from "./photo-repository.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerPublicRoutes } from "./routes/public.js";

const app = Fastify({ logger: true, trustProxy: true });

await app.register(cookie);
await app.register(cors, {
  origin: config.portfolioOrigins,
  credentials: false,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
});
await app.register(multipart, {
  limits: { fileSize: MAX_UPLOAD_BATCH_SIZE, files: MAX_UPLOAD_FILES },
});

app.get("/healthz", async () => ({ status: "ok" }));

await app.register(registerPublicRoutes);
await app.register(registerAdminRoutes);

app.setErrorHandler((error, request, reply) => {
  const errorStatus = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
  const status = error instanceof HttpError ? error.statusCode :
    typeof errorStatus === "number" && errorStatus >= 400 && errorStatus < 600 ? errorStatus : 500;
  if (status >= 500) request.log.error({ err: error }, "API request failed");
  const detail = status >= 500 ? "Internal server error" : error instanceof Error ? error.message : "Request failed";
  return reply.code(status).send({ detail });
});

app.addHook("onClose", async () => {
  stopPublicationWorker();
  await prisma.$disconnect();
});

const stopPublicationWorker = await startPublicationWorker();

await app.listen({ port: config.port, host: config.host });

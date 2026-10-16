import type { FastifyInstance } from "fastify";
import { getAllPhotos } from "../photo-repository.js";
import { getPublishedSeries, listSeries } from "../series-repository.js";

export async function registerPublicRoutes(app: FastifyInstance): Promise<void> {
  app.get("/photo/get-all-photos/", async (_request, reply) => reply.send(await getAllPhotos()));
  app.get("/series/", async (_request, reply) => reply.send(await listSeries(false)));
  app.get<{ Params: { slug: string } }>("/series/:slug/", async (request, reply) => {
    reply.send(await getPublishedSeries(request.params.slug));
  });
}

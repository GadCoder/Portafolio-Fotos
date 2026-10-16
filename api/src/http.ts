import type { FastifyReply } from "fastify";

export function fail(reply: FastifyReply, statusCode: number, detail: string): FastifyReply {
  return reply.code(statusCode).send({ detail });
}

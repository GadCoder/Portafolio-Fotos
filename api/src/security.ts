import { randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { config } from "./config.js";

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function constantTimeEquals(expected: string | undefined, supplied: string | undefined): boolean {
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export function assertTrustedOrigin(request: FastifyRequest): void {
  const origin = request.headers.origin;
  if (origin) {
    const host = request.headers.host ?? "";
    const expected = `${request.protocol}://${host}`;
    const normalized = origin.replace(/\/$/, "");
    if (normalized !== expected && !config.portfolioOrigins.includes(normalized)) {
      throw Object.assign(new Error("Cross-origin request rejected"), { statusCode: 403 });
    }
    return;
  }
  if (request.headers["sec-fetch-site"] === "cross-site") {
    throw Object.assign(new Error("Cross-origin request rejected"), { statusCode: 403 });
  }
}

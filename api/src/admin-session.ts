import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "./db.js";
import { config } from "./config.js";

export const SESSION_COOKIE = "portfolio_admin_session";
export const PREAUTH_COOKIE = "portfolio_admin_login_csrf";

function digest(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function equalBytes(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authenticateUser(user: string, password: string): boolean {
  let expectedUser: Buffer;
  try {
    expectedUser = Buffer.from(config.appUser, "utf8");
    const suppliedUser = Buffer.from(user, "utf8");
    const userMatches = equalBytes(expectedUser, suppliedUser);
    const [algorithm, roundsText, salt, encoded] = config.appPasswordHash.split("$", 4);
    const rounds = Number(roundsText);
    if (algorithm !== "pbkdf2_sha256" || !Number.isInteger(rounds) || rounds < 1 || !salt || !encoded) return false;
    const expected = Buffer.from(encoded, "base64url");
    if (!expected.length) return false;
    const actual = pbkdf2Sync(password, salt, rounds, expected.length, "sha256");
    return userMatches && equalBytes(actual, expected);
  } catch {
    return false;
  }
}

export async function createAdminSession(user: string) {
  const token = randomBytes(48).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.adminSessionMaxAge * 1000);
  const session = await prisma.$transaction(async (tx) => {
    await tx.adminSession.deleteMany({ where: { user } });
    return tx.adminSession.create({
      data: { tokenHash: digest(token), user, csrfToken, createdAt: now, expiresAt },
    });
  });
  return { token, session };
}

export async function getActiveAdminSession(token?: string) {
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: digest(token) } });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.adminSession.delete({ where: { id: session.id } });
    return null;
  }
  return session;
}

export async function revokeAdminSession(token?: string) {
  if (!token) return;
  await prisma.adminSession.deleteMany({ where: { tokenHash: digest(token) } });
}

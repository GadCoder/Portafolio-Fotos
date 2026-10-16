import "dotenv/config";

export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
export const MAX_UPLOAD_BATCH_SIZE = 90 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 20;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

const appEnv = process.env.APP_ENV?.trim().toLowerCase() ?? "";
const cookieSecureRequested = (process.env.COOKIE_SECURE ?? "true").trim().toLowerCase() === "true";
const localEnvironments = new Set(["local", "dev", "development", "test", "testing"]);
const deployHook = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL?.trim();
function isTrustedDeployHook(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "api.cloudflare.com"
      && url.pathname.startsWith("/client/v4/pages/webhooks/deploy_hooks/")
      && Boolean(url.pathname.split("/").at(-1))
      && !url.username && !url.password
      && (url.port === "" || url.port === "443")
      && !url.hash;
  } catch { return false; }
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  appUser: required("APP_USER"),
  appPasswordHash: required("APP_PASSWORD_HASH"),
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? "0.0.0.0",
  cookieSecure: localEnvironments.has(appEnv) ? cookieSecureRequested : true,
  adminSessionMaxAge: Math.max(60, Math.min(Number(process.env.ADMIN_SESSION_MAX_AGE ?? 28800), 604800)),
  portfolioOrigins: (process.env.PORTFOLIO_ORIGINS ?? "https://portfolio.gadcoder.com")
    .split(",").map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean),
  cloudflareDeployHookUrl: isTrustedDeployHook(deployHook) ? deployHook : undefined,
  imageMaxPixels: Number(process.env.IMAGE_MAX_PIXELS ?? 80_000_000),
  s3Key: required("s3_key"),
  s3SecretKey: required("s3_secret_key"),
  s3Endpoint: required("s3_endpoint"),
  s3BucketName: required("s3_bucket_name"),
  s3Url: required("s3_url"),
};

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}
if (!Number.isInteger(config.adminSessionMaxAge)) {
  throw new Error("ADMIN_SESSION_MAX_AGE must be an integer");
}
if (!Number.isInteger(config.imageMaxPixels) || config.imageMaxPixels < 1) {
  throw new Error("IMAGE_MAX_PIXELS must be a positive integer");
}

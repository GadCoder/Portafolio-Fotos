import { config } from "./config.js";
import { prisma } from "./db.js";
import { Prisma } from "./generated/prisma/client.js";

type Transaction = Prisma.TransactionClient;

export async function queueGalleryPublication(tx: Transaction): Promise<void> {
  const updated = await tx.galleryPublication.updateMany({
    where: { id: 1 },
    data: { revision: { increment: 1 }, changedAt: new Date() },
  });
  if (updated.count !== 1) throw new Error("Gallery publication migration has not been applied");
}

async function triggerCloudflareDeploy(): Promise<void> {
  if (!config.cloudflareDeployHookUrl) throw new Error("Cloudflare Pages deploy hook is not configured");
  const response = await fetch(config.cloudflareDeployHookUrl, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Cloudflare deploy hook returned HTTP ${response.status}`);
}

export async function deployPendingGallery(force = false): Promise<void> {
  const state = await prisma.galleryPublication.findUnique({ where: { id: 1 } });
  if (!state) throw new Error("Gallery publication migration has not been applied");
  if (!force && state.revision <= state.requestedRevision) return;
  if (!force && Date.now() - state.changedAt.getTime() < 15_000) return;

  const revision = state.revision;
  await triggerCloudflareDeploy();
  await prisma.galleryPublication.updateMany({
    where: { id: 1, requestedRevision: { lt: revision } },
    data: { requestedRevision: revision },
  });
}

export async function startPublicationWorker(): Promise<() => void> {
  if (!config.cloudflareDeployHookUrl) return () => undefined;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  const poll = async (): Promise<void> => {
    let delay = 5_000;
    try {
      await deployPendingGallery();
    } catch (error) {
      delay = 60_000;
      const errorType = error instanceof Error ? error.name : "UnknownError";
      console.error(`Gallery deployment request failed (${errorType}); retrying in 60 seconds`);
    }
    if (!stopped) timer = setTimeout(() => void poll(), delay);
  };
  void poll();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

export async function requestImmediateGalleryDeploy(): Promise<void> {
  const state = await prisma.galleryPublication.findUnique({ where: { id: 1 } });
  if (!state) throw new Error("Gallery publication migration has not been applied");
  await triggerCloudflareDeploy();
  await prisma.galleryPublication.updateMany({
    where: { id: 1, requestedRevision: { lt: state.revision } },
    data: { requestedRevision: state.revision },
  });
}

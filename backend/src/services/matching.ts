import { prisma } from "../db.ts";
import type { Job, Provider } from "../generated/prisma/client.ts";

/** Reliability-based fair pricing: more reliable providers earn a larger share of the job price
 *  instead of a pure auction, per the "fair pay for reliable providers" differentiator. */
export function payoutShare(job: Pick<Job, "price" | "chunkCount">, provider: Pick<Provider, "reliabilityScore">) {
  const perChunk = job.price / job.chunkCount;
  const reliabilityMultiplier = 0.6 + 0.4 * provider.reliabilityScore;
  return Number((perChunk * reliabilityMultiplier).toFixed(4));
}

/** Shadow/verifier providers do a full redundant run too, so they earn a reduced verification
 *  fee (half the primary rate) whenever their result contributes to a verified payout. */
export function verifierPayoutShare(job: Pick<Job, "price" | "chunkCount">, provider: Pick<Provider, "reliabilityScore">) {
  return Number((payoutShare(job, provider) * 0.5).toFixed(4));
}

function isEligible(
  job: Pick<Job, "minCpuCores" | "minRamGb" | "requiresGpu" | "reliabilityMin" | "requesterId">,
  provider: Provider
) {
  if (provider.status !== "ONLINE" && provider.status !== "IDLE") return false;
  if (provider.cpuCores < job.minCpuCores) return false;
  if (provider.ramGb < job.minRamGb) return false;
  if (job.requiresGpu && !provider.hasGpu) return false;
  if (provider.reliabilityScore < job.reliabilityMin) return false;
  // Idle-time-aware scheduling: only take jobs when genuinely idle (plugged in, on wifi).
  if (!provider.isCharging || !provider.isOnWifi) return false;
  if (provider.cpuTempC > 85) return false;
  // Can't rent your own machine — same rule as hiding it from the public listing.
  if (job.requesterId && provider.ownerId && provider.ownerId === job.requesterId) return false;
  return true;
}

/** Finds `count` distinct idle providers eligible for a job, best reliability first. */
export async function findEligibleProviders(
  job: Pick<Job, "minCpuCores" | "minRamGb" | "requiresGpu" | "reliabilityMin" | "requesterId">,
  count: number,
  excludeIds: string[] = []
) {
  const candidates = await prisma.provider.findMany({
    where: { id: { notIn: excludeIds } },
    orderBy: { reliabilityScore: "desc" },
  });
  return candidates.filter((p) => isEligible(job, p)).slice(0, count);
}

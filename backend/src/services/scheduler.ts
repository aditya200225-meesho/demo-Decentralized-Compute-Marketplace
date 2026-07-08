import crypto from "node:crypto";
import { prisma } from "../db.ts";
import { findEligibleProviders, payoutShare, verifierPayoutShare } from "./matching.ts";
import { evaluateGroupRules } from "./groupRules.ts";
import { uploadOutputObject } from "./storage.ts";

const TICK_MS = 1200;
const PROGRESS_PER_TICK = 18;
const DISPUTE_CHANCE = 0.06;
const RULE_ENFORCEMENT_EVERY_N_TICKS = 20;
const MAX_STRIKES = 5;

function simulateOutputHash(jobId: string, chunkIndex: number, tamper: boolean) {
  const input = `${jobId}:${chunkIndex}:${tamper ? crypto.randomUUID() : "canonical"}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

async function matchPendingJobs() {
  const pendingJobs = await prisma.job.findMany({
    where: { status: "PENDING" },
    include: { chunks: true },
  });

  for (const job of pendingJobs) {
    const unassigned = job.chunks.filter((c) => c.status === "PENDING" && !c.providerId);
    if (unassigned.length === 0) continue;

    let allMatched = job.chunks.length > 0;
    for (const chunk of unassigned) {
      const candidates = await findEligibleProviders(job, 8);
      if (candidates.length === 0) {
        allMatched = false;
        continue;
      }

      const primary = candidates[0];
      // Co-op members pool redundant verification with a group-mate; ungrouped machines run solo (trust-based).
      const shadow = primary.groupId
        ? candidates.find((c) => c.id !== primary.id && c.groupId === primary.groupId) ?? null
        : null;

      const ops = [
        prisma.jobChunk.update({
          where: { id: chunk.id },
          data: {
            providerId: primary.id,
            shadowProviderId: shadow?.id ?? null,
            status: "RUNNING",
            startedAt: new Date(),
          },
        }),
        prisma.provider.update({ where: { id: primary.id }, data: { status: "BUSY" } }),
      ];
      if (shadow) ops.push(prisma.provider.update({ where: { id: shadow.id }, data: { status: "BUSY" } }));
      await prisma.$transaction(ops);
    }

    if (allMatched) {
      // Credits were already held from the requester's wallet at submission time — just move the job forward.
      await prisma.job.update({ where: { id: job.id }, data: { status: "RUNNING", matchedAt: new Date() } });
    }
  }
}

async function progressRunningChunks() {
  const runningChunks = await prisma.jobChunk.findMany({ where: { status: "RUNNING" } });

  for (const chunk of runningChunks) {
    const nextProgress = Math.min(100, chunk.progress + PROGRESS_PER_TICK);
    if (nextProgress < 100) {
      await prisma.jobChunk.update({ where: { id: chunk.id }, data: { progress: nextProgress } });
      continue;
    }

    let outputHash: string;
    let shadowHash: string | null;
    let verified: boolean;

    if (chunk.shadowProviderId) {
      // Redundant (co-op) path: independently "run" on both machines and compare.
      const tamper = Math.random() < DISPUTE_CHANCE;
      outputHash = simulateOutputHash(chunk.jobId, chunk.index, false);
      shadowHash = simulateOutputHash(chunk.jobId, chunk.index, tamper);
      verified = outputHash === shadowHash;
    } else {
      // Solo path: single machine, no second run to compare against — trust-based.
      outputHash = simulateOutputHash(chunk.jobId, chunk.index, false);
      shadowHash = null;
      verified = true;
    }

    await prisma.jobChunk.update({
      where: { id: chunk.id },
      data: {
        progress: 100,
        status: "DONE",
        outputHash,
        shadowHash,
        verified,
        completedAt: new Date(),
      },
    });

    if (chunk.providerId) await uploadOutputObject(chunk, chunk.providerId, "primary");
    if (chunk.shadowProviderId) await uploadOutputObject(chunk, chunk.shadowProviderId, "shadow");

    for (const providerId of [chunk.providerId, chunk.shadowProviderId].filter(Boolean) as string[]) {
      await prisma.provider.update({
        where: { id: providerId },
        data: {
          status: "ONLINE",
          jobsCompleted: verified ? { increment: 1 } : undefined,
          jobsFailed: verified ? undefined : { increment: 1 },
        },
      });
    }
  }
}

async function recomputeReliability() {
  const providers = await prisma.provider.findMany({
    where: { OR: [{ jobsCompleted: { gt: 0 } }, { jobsFailed: { gt: 0 } }] },
  });
  for (const p of providers) {
    const total = p.jobsCompleted + p.jobsFailed;
    const score = total === 0 ? 1 : Math.max(0.1, p.jobsCompleted / total);
    if (Math.abs(score - p.reliabilityScore) > 0.001) {
      await prisma.provider.update({ where: { id: p.id }, data: { reliabilityScore: score } });
    }
  }
}

async function settleCompletedJobs() {
  const runningJobs = await prisma.job.findMany({
    where: { status: "RUNNING" },
    include: { chunks: { include: { provider: true, shadowProvider: true } } },
  });

  for (const job of runningJobs) {
    if (job.chunks.length === 0 || !job.chunks.every((c) => c.status === "DONE")) continue;

    const allVerified = job.chunks.every((c) => c.verified);

    if (allVerified) {
      const ops = [];
      for (const chunk of job.chunks) {
        if (chunk.provider) {
          const amount = payoutShare(job, chunk.provider);
          ops.push(
            prisma.provider.update({ where: { id: chunk.provider.id }, data: { creditBalance: { increment: amount } } }),
            prisma.ledgerEntry.create({
              data: { providerId: chunk.provider.id, jobId: job.id, type: "EARNING", amount, note: `Chunk ${chunk.index} verified & paid (primary)` },
            })
          );
        }
        if (chunk.shadowProvider) {
          const amount = verifierPayoutShare(job, chunk.shadowProvider);
          ops.push(
            prisma.provider.update({ where: { id: chunk.shadowProvider.id }, data: { creditBalance: { increment: amount } } }),
            prisma.ledgerEntry.create({
              data: { providerId: chunk.shadowProvider.id, jobId: job.id, type: "EARNING", amount, note: `Chunk ${chunk.index} shadow-verified & paid` },
            })
          );
        }
      }
      ops.push(
        prisma.ledgerEntry.create({
          data: { userId: job.requesterId, jobId: job.id, type: "ESCROW_RELEASE", amount: job.price, note: "Escrow released to providers" },
        }),
        prisma.job.update({ where: { id: job.id }, data: { status: "PAID", completedAt: new Date() } })
      );
      await prisma.$transaction(ops);
    } else {
      const disputeOps: any[] = [
        prisma.ledgerEntry.create({
          data: {
            userId: job.requesterId,
            jobId: job.id,
            type: "ESCROW_REFUND",
            amount: job.price,
            note: "Verification mismatch between primary and shadow run — credits refunded",
          },
        }),
        prisma.job.update({
          where: { id: job.id },
          data: { status: "DISPUTED", disputeReason: "Redundant verification hashes did not match", completedAt: new Date() },
        }),
      ];
      if (job.requesterId) {
        disputeOps.push(
          prisma.user.update({ where: { id: job.requesterId }, data: { creditBalance: { increment: job.price } } })
        );
      }
      await prisma.$transaction(disputeOps);
    }
  }
}

async function jitterIdleState() {
  const idleOrOnline = await prisma.provider.findMany({ where: { status: { in: ["ONLINE", "IDLE"] } } });
  for (const p of idleOrOnline) {
    if (Math.random() < 0.15) {
      await prisma.provider.update({
        where: { id: p.id },
        data: {
          isCharging: Math.random() > 0.1,
          isOnWifi: Math.random() > 0.05,
          cpuTempC: 40 + Math.floor(Math.random() * 30),
          batteryPct: Math.max(20, Math.min(100, p.batteryPct + Math.floor(Math.random() * 7) - 3)),
          status: Math.random() > 0.3 ? "ONLINE" : "IDLE",
        },
      });
    }
  }
}

/** Cheap per-tick uptime accounting: two bulk updates regardless of provider count. */
async function trackUptime() {
  await prisma.provider.updateMany({
    where: { status: { not: "OFFLINE" } },
    data: { onlineTicks: { increment: 1 }, totalTicks: { increment: 1 } },
  });
  await prisma.provider.updateMany({
    where: { status: "OFFLINE" },
    data: { totalTicks: { increment: 1 } },
  });
}

/** Periodically re-checks every grouped machine against its group's current rules; repeated
 *  violations (>5 strikes) auto-remove the machine, matching the manual-remove path. */
async function enforceGroupRules() {
  const memberships = await prisma.groupMembership.findMany({
    where: { status: "ACTIVE" },
    include: { provider: true, group: { include: { rule: true } } },
  });

  for (const m of memberships) {
    const { passed, failures } = evaluateGroupRules(m.provider, m.group.rule);
    if (passed) continue;

    const newStrikes = m.strikeCount + 1;
    if (newStrikes > MAX_STRIKES) {
      await prisma.$transaction([
        prisma.provider.update({ where: { id: m.providerId }, data: { groupId: null, groupRole: null } }),
        prisma.groupMembership.update({ where: { id: m.id }, data: { status: "REMOVED", endedAt: new Date(), strikeCount: newStrikes } }),
      ]);
      if (m.provider.ownerId) {
        await prisma.notification.create({
          data: {
            userId: m.provider.ownerId,
            type: "REMOVED_FROM_GROUP",
            message: `${m.provider.name} was automatically removed from "${m.group.name}" after repeated rule violations (${failures.join(", ")}).`,
            groupId: m.groupId,
          },
        });
      }
    } else {
      await prisma.groupMembership.update({ where: { id: m.id }, data: { strikeCount: newStrikes } });
      if (m.provider.ownerId) {
        await prisma.notification.create({
          data: {
            userId: m.provider.ownerId,
            type: "RULE_VIOLATION_WARNING",
            message: `${m.provider.name} no longer meets "${m.group.name}"'s rules (${failures.join(", ")}). Warning ${newStrikes}/${MAX_STRIKES}.`,
            groupId: m.groupId,
          },
        });
      }
    }
  }
}

let ticking = false;
let tickCount = 0;

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    await matchPendingJobs();
    await progressRunningChunks();
    await recomputeReliability();
    await settleCompletedJobs();
    await jitterIdleState();
    await trackUptime();
    tickCount += 1;
    if (tickCount % RULE_ENFORCEMENT_EVERY_N_TICKS === 0) {
      await enforceGroupRules();
    }
  } catch (err) {
    console.error("[scheduler] tick error", err);
  } finally {
    ticking = false;
  }
}

export function startScheduler() {
  setInterval(tick, TICK_MS);
  console.log(`[scheduler] started, tick every ${TICK_MS}ms`);
}

import crypto from "node:crypto";
import { prisma } from "../db.ts";
import { findEligibleProviders, payoutShare } from "./matching.ts";

const TICK_MS = 1200;
const PROGRESS_PER_TICK = 18;
const DISPUTE_CHANCE = 0.06;

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
      const picked = await findEligibleProviders(job, 2);
      if (picked.length < 2) {
        allMatched = false;
        continue;
      }
      const [primary, shadow] = picked;
      await prisma.$transaction([
        prisma.jobChunk.update({
          where: { id: chunk.id },
          data: {
            providerId: primary.id,
            shadowProviderId: shadow.id,
            status: "RUNNING",
            startedAt: new Date(),
          },
        }),
        prisma.provider.update({ where: { id: primary.id }, data: { status: "BUSY" } }),
        prisma.provider.update({ where: { id: shadow.id }, data: { status: "BUSY" } }),
      ]);
    }

    if (allMatched) {
      await prisma.$transaction([
        prisma.job.update({ where: { id: job.id }, data: { status: "RUNNING", matchedAt: new Date() } }),
        prisma.ledgerEntry.create({
          data: { jobId: job.id, type: "ESCROW_HOLD", amount: job.price, note: "Escrow held pending verified completion" },
        }),
      ]);
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

    const tamper = Math.random() < DISPUTE_CHANCE;
    const outputHash = simulateOutputHash(chunk.jobId, chunk.index, false);
    const shadowHash = simulateOutputHash(chunk.jobId, chunk.index, tamper);
    const verified = outputHash === shadowHash;

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
    include: { chunks: { include: { provider: true } } },
  });

  for (const job of runningJobs) {
    if (job.chunks.length === 0 || !job.chunks.every((c) => c.status === "DONE")) continue;

    const allVerified = job.chunks.every((c) => c.verified);

    if (allVerified) {
      const ops = [];
      for (const chunk of job.chunks) {
        if (!chunk.provider) continue;
        const amount = payoutShare(job, chunk.provider);
        ops.push(
          prisma.provider.update({ where: { id: chunk.provider.id }, data: { creditBalance: { increment: amount } } }),
          prisma.ledgerEntry.create({
            data: { providerId: chunk.provider.id, jobId: job.id, type: "EARNING", amount, note: `Chunk ${chunk.index} verified & paid` },
          })
        );
      }
      ops.push(
        prisma.ledgerEntry.create({
          data: { jobId: job.id, type: "ESCROW_RELEASE", amount: job.price, note: "Escrow released to providers" },
        }),
        prisma.job.update({ where: { id: job.id }, data: { status: "PAID", completedAt: new Date() } })
      );
      await prisma.$transaction(ops);
    } else {
      await prisma.$transaction([
        prisma.ledgerEntry.create({
          data: { jobId: job.id, type: "ESCROW_REFUND", amount: job.price, note: "Verification mismatch between primary and shadow run" },
        }),
        prisma.job.update({
          where: { id: job.id },
          data: { status: "DISPUTED", disputeReason: "Redundant verification hashes did not match", completedAt: new Date() },
        }),
      ]);
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

let ticking = false;

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    await matchPendingJobs();
    await progressRunningChunks();
    await recomputeReliability();
    await settleCompletedJobs();
    await jitterIdleState();
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

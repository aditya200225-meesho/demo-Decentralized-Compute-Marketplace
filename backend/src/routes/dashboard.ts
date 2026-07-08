import { Router } from "express";
import { prisma } from "../db.ts";

export const dashboardRouter = Router();

/** Centralized view of every job-chunk assignment: which machine ran it, which machine
 *  shadow-verified it, and whether the redundant run matched. Powers the judge-facing dashboard. */
dashboardRouter.get("/dashboard/assignments", async (_req, res) => {
  const chunks = await prisma.jobChunk.findMany({
    where: { providerId: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 300,
    include: {
      job: { include: { template: true } },
      provider: true,
      shadowProvider: true,
    },
  });
  res.json(chunks);
});

dashboardRouter.get("/dashboard/stats", async (_req, res) => {
  const [jobs, chunks, disputedJobs, paidJobs, ledger] = await Promise.all([
    prisma.job.count(),
    prisma.jobChunk.count({ where: { providerId: { not: null } } }),
    prisma.job.count({ where: { status: "DISPUTED" } }),
    prisma.job.count({ where: { status: "PAID" } }),
    prisma.ledgerEntry.findMany({ where: { type: { in: ["EARNING", "ESCROW_REFUND"] } } }),
  ]);
  const totalPaidOut = ledger.filter((l) => l.type === "EARNING").reduce((s, l) => s + l.amount, 0);
  const totalRefunded = ledger.filter((l) => l.type === "ESCROW_REFUND").reduce((s, l) => s + l.amount, 0);

  res.json({
    totalJobs: jobs,
    totalRedundantAssignments: chunks,
    disputedJobs,
    paidJobs,
    totalPaidOut: Number(totalPaidOut.toFixed(4)),
    totalRefunded: Number(totalRefunded.toFixed(4)),
  });
});

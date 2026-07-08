import { Router } from "express";
import { prisma } from "../db.ts";
import { uploadInputObject } from "../services/storage.ts";
import { requireAuth } from "../middleware/auth.ts";

export const jobsRouter = Router();

jobsRouter.get("/jobs", async (_req, res) => {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      chunks: { include: { provider: true, shadowProvider: true }, orderBy: { index: "asc" } },
      template: true,
    },
    take: 100,
  });
  res.json(jobs);
});

jobsRouter.get("/jobs/:id", async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: {
      template: true,
      chunks: { include: { provider: true, shadowProvider: true }, orderBy: { index: "asc" } },
      ledgerEntries: { orderBy: { createdAt: "desc" } },
      storageObjects: { include: { uploadedByProvider: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!job) return res.status(404).json({ error: "not found" });
  res.json(job);
});

jobsRouter.post("/jobs", requireAuth, async (req, res) => {
  const { requesterName, templateId, chunkCount, reliabilityMin } = req.body ?? {};
  if (!requesterName) return res.status(400).json({ error: "requesterName is required" });
  if (!templateId) return res.status(400).json({ error: "templateId is required" });

  const template = await prisma.jobTemplate.findUnique({ where: { id: templateId } });
  if (!template) return res.status(404).json({ error: "template not found" });

  const chunks = Math.max(1, Math.min(8, Number(chunkCount) || 1));
  const price = template.basePrice * chunks;

  const requester = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!requester || requester.creditBalance < price) {
    return res.status(402).json({
      error: `insufficient credits — this job costs ${price.toFixed(2)}, you have ${(requester?.creditBalance ?? 0).toFixed(2)}. Buy more credits first.`,
    });
  }

  const job = await prisma.job.create({
    data: {
      requesterName,
      requesterId: req.user!.id,
      templateId: template.id,
      taskType: template.taskType,
      minCpuCores: template.minCpuCores,
      minRamGb: template.minRamGb,
      requiresGpu: template.requiresGpu,
      privacyMode: template.privacyMode,
      price,
      chunkCount: chunks,
      reliabilityMin: Number(reliabilityMin) || 0,
      status: "PENDING",
      chunks: {
        create: Array.from({ length: chunks }, (_, index) => ({ index })),
      },
    },
    include: { chunks: true, template: true },
  });

  // Credits are held for the job (and compute cost) up front — released to providers on
  // verified completion, refunded to the requester if the redundant verification disputes it.
  await prisma.$transaction([
    prisma.user.update({ where: { id: req.user!.id }, data: { creditBalance: { decrement: price } } }),
    prisma.ledgerEntry.create({
      data: {
        userId: req.user!.id,
        jobId: job.id,
        type: "ESCROW_HOLD",
        amount: price,
        note: `Credits held for ${chunks} chunk${chunks > 1 ? "s" : ""} of compute`,
      },
    }),
  ]);

  await uploadInputObject(job);

  res.status(201).json(job);
});

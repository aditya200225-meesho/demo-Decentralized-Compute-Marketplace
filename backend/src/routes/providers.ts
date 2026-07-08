import { Router } from "express";
import { prisma } from "../db.ts";
import { detectHostSpecs } from "../services/hardware.ts";

export const providersRouter = Router();

providersRouter.get("/providers", async (_req, res) => {
  const providers = await prisma.provider.findMany({
    orderBy: { reliabilityScore: "desc" },
    include: { team: true },
  });
  res.json(providers);
});

providersRouter.get("/providers/:id", async (req, res) => {
  const provider = await prisma.provider.findUnique({
    where: { id: req.params.id },
    include: {
      team: true,
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 50 },
      chunks: { include: { job: true }, orderBy: { startedAt: "desc" }, take: 20 },
    },
  });
  if (!provider) return res.status(404).json({ error: "not found" });
  res.json(provider);
});

/** Real-machine registration: auto-detects the caller's actual CPU/RAM via os module. */
providersRouter.post("/providers/register", async (req, res) => {
  const { name, teamId } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });

  const specs = detectHostSpecs();
  const provider = await prisma.provider.create({
    data: {
      name,
      cpuCores: specs.cpuCores,
      ramGb: specs.ramGb,
      hasGpu: specs.hasGpu,
      gpuModel: specs.gpuModel,
      status: "ONLINE",
      isVirtual: false,
      teamId: teamId ?? null,
    },
  });
  res.status(201).json(provider);
});

providersRouter.patch("/providers/:id/status", async (req, res) => {
  const { status } = req.body ?? {};
  if (!["ONLINE", "IDLE", "BUSY", "OFFLINE"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  const provider = await prisma.provider.update({ where: { id: req.params.id }, data: { status } });
  res.json(provider);
});

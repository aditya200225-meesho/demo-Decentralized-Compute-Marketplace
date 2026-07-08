import { Router } from "express";
import { prisma } from "../db.ts";
import { detectHostSpecs } from "../services/hardware.ts";
import { generateMachineCode } from "../services/ids.ts";
import { computeUptimePct } from "../services/groupRules.ts";
import { requireAuth, optionalAuth } from "../middleware/auth.ts";

export const providersRouter = Router();

providersRouter.get("/providers", optionalAuth, async (req, res) => {
  const providers = await prisma.provider.findMany({
    where: req.user ? { OR: [{ ownerId: null }, { ownerId: { not: req.user.id } }] } : undefined,
    orderBy: { reliabilityScore: "desc" },
    include: { group: { select: { id: true, name: true } } },
  });
  res.json(providers);
});

providersRouter.get("/providers/mine", requireAuth, async (req, res) => {
  const providers = await prisma.provider.findMany({
    where: { ownerId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      group: { select: { id: true, name: true } },
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { job: { include: { template: true } } },
      },
      chunks: {
        include: { job: { include: { template: true } }, shadowProvider: true },
        orderBy: { startedAt: "desc" },
        take: 50,
      },
      shadowChunks: {
        include: { job: { include: { template: true } }, provider: true },
        orderBy: { startedAt: "desc" },
        take: 50,
      },
    },
  });

  const withUptime = providers.map((p) => ({ ...p, uptimePct: Number(computeUptimePct(p).toFixed(1)) }));
  res.json(withUptime);
});

providersRouter.get("/providers/:id", async (req, res) => {
  const provider = await prisma.provider.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      group: { select: { id: true, name: true } },
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { job: { include: { template: true } } },
      },
      chunks: {
        include: { job: { include: { template: true } }, shadowProvider: true },
        orderBy: { startedAt: "desc" },
        take: 50,
      },
      shadowChunks: {
        include: { job: { include: { template: true } }, provider: true },
        orderBy: { startedAt: "desc" },
        take: 50,
      },
    },
  });
  if (!provider) return res.status(404).json({ error: "not found" });
  res.json(provider);
});

/** Real-machine registration: auto-detects the caller's actual CPU/RAM via os module. */
providersRouter.post("/providers/register", requireAuth, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });

  const specs = detectHostSpecs();
  const machineCode = await generateMachineCode();
  const provider = await prisma.provider.create({
    data: {
      name,
      cpuCores: specs.cpuCores,
      ramGb: specs.ramGb,
      hasGpu: specs.hasGpu,
      gpuModel: specs.gpuModel,
      status: "ONLINE",
      isVirtual: false,
      machineCode,
      ownerId: req.user!.id,
    },
  });
  res.status(201).json(provider);
});

/** Owners can toggle their own machine's status; anyone logged in can also pause/resume a
 *  simulated (ownerless) virtual provider — a testing control so real machines can be made to
 *  win matching without waiting on the random idle-state jitter. */
providersRouter.patch("/providers/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body ?? {};
  if (!["ONLINE", "IDLE", "BUSY", "OFFLINE"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  const provider = await prisma.provider.findUnique({ where: { id: (req.params.id as string) } });
  if (!provider) return res.status(404).json({ error: "not found" });
  const isMine = provider.ownerId === req.user!.id;
  const isTogglableVirtual = provider.isVirtual && !provider.ownerId;
  if (!isMine && !isTogglableVirtual) return res.status(403).json({ error: "not your machine" });

  const updated = await prisma.provider.update({ where: { id: (req.params.id as string) }, data: { status } });
  res.json(updated);
});

import { Router } from "express";
import { prisma } from "../db.ts";

export const storageRouter = Router();

/** Global simulated-bucket browser across every job — an "S3 console" view for the demo. */
storageRouter.get("/storage", async (_req, res) => {
  const objects = await prisma.storageObject.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      job: { select: { id: true, requesterName: true, template: { select: { name: true } } } },
      uploadedByProvider: { select: { id: true, name: true } },
    },
  });
  res.json(objects);
});

/** Returns a small, honest JSON descriptor standing in for the object's bytes — no real payload
 *  is ever generated. sizeBytes/contentHash are the simulated values shown in the UI. */
storageRouter.get("/storage/:id/download", async (req, res) => {
  const object = await prisma.storageObject.findUnique({
    where: { id: req.params.id as string },
    include: { job: true, uploadedByProvider: { select: { name: true } } },
  });
  if (!object) return res.status(404).json({ error: "not found" });

  const filename = object.key.split("/").pop() ?? "object.json";
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
  res.json({
    note: "Simulated object — this marketplace does not execute real jobs or move real data. This descriptor stands in for the payload.",
    key: object.key,
    kind: object.kind,
    jobId: object.jobId,
    declaredSizeBytes: object.sizeBytes,
    contentHash: object.contentHash,
    uploadedBy: object.uploadedByProvider?.name ?? "requester",
    createdAt: object.createdAt,
  });
});

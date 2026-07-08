import { Router } from "express";
import { prisma } from "../db.ts";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error", message: (err as Error).message });
  }
});

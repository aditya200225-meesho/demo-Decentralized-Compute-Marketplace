import { Router } from "express";
import { prisma } from "../db.ts";

export const templatesRouter = Router();

templatesRouter.get("/templates", async (_req, res) => {
  const templates = await prisma.jobTemplate.findMany({ orderBy: { basePrice: "asc" } });
  res.json(templates);
});

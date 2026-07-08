import { Router } from "express";
import { prisma } from "../db.ts";

export const teamsRouter = Router();

teamsRouter.get("/teams", async (_req, res) => {
  const teams = await prisma.team.findMany({ include: { providers: true } });
  res.json(teams);
});

teamsRouter.post("/teams", async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const team = await prisma.team.create({ data: { name } });
  res.status(201).json(team);
});

teamsRouter.post("/teams/:id/join", async (req, res) => {
  const { providerId } = req.body ?? {};
  if (!providerId) return res.status(400).json({ error: "providerId is required" });
  const provider = await prisma.provider.update({
    where: { id: providerId },
    data: { teamId: req.params.id },
  });
  res.json(provider);
});

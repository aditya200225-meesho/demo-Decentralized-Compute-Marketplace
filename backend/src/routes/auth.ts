import { Router } from "express";
import { prisma } from "../db.ts";
import { hashPassword, verifyPassword, createSession } from "../services/auth.ts";
import { requireAuth } from "../middleware/auth.ts";

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: "username and password are required" });
  if (String(password).length < 4) return res.status(400).json({ error: "password must be at least 4 characters" });

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ error: "username already taken" });

  const user = await prisma.user.create({ data: { username, passwordHash: hashPassword(password) } });
  const session = await createSession(user.id);
  res.status(201).json({ token: session.token, user: { id: user.id, username: user.username } });
});

authRouter.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: "username and password are required" });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "invalid username or password" });
  }
  const session = await createSession(user.id);
  res.json({ token: session.token, user: { id: user.id, username: user.username } });
});

authRouter.post("/auth/logout", requireAuth, async (req, res) => {
  const header = req.header("authorization");
  const token = header?.slice("Bearer ".length).trim();
  if (token) await prisma.session.deleteMany({ where: { token } });
  res.status(204).end();
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  res.json({ id: req.user!.id, username: req.user!.username });
});

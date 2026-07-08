import type { NextFunction, Request, Response } from "express";
import { getSessionUser } from "../services/auth.ts";
import type { User } from "../generated/prisma/client.ts";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

function extractToken(req: Request) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const user = await getSessionUser(token);
    if (user) req.user = user;
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const user = token ? await getSessionUser(token) : null;
  if (!user) return res.status(401).json({ error: "authentication required" });
  req.user = user;
  next();
}

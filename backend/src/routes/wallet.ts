import { Router } from "express";
import { prisma } from "../db.ts";
import { requireAuth } from "../middleware/auth.ts";

export const walletRouter = Router();

/** Fixed simulated top-up packages (credits) — no real payment gateway is involved. */
export const TOPUP_PACKAGES = [5, 20, 50, 100];

walletRouter.get("/wallet", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const ledger = await prisma.ledgerEntry.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { job: { include: { template: true } } },
  });
  res.json({ creditBalance: user!.creditBalance, ledger, packages: TOPUP_PACKAGES });
});

walletRouter.post("/wallet/topup", requireAuth, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
    return res.status(400).json({ error: "amount must be a number between 0 and 1000 credits" });
  }

  const [user] = await prisma.$transaction([
    prisma.user.update({ where: { id: req.user!.id }, data: { creditBalance: { increment: amount } } }),
    prisma.ledgerEntry.create({
      data: {
        userId: req.user!.id,
        type: "TOPUP",
        amount,
        note: "Simulated credit purchase — no real payment was processed",
      },
    }),
  ]);
  res.json({ creditBalance: user.creditBalance });
});

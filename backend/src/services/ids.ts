import crypto from "node:crypto";
import { prisma } from "../db.ts";

/** Short, human-shareable machine ID used for co-op group invites (e.g. "K3F9QZ2"). */
export async function generateMachineCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 7);
    const existing = await prisma.provider.findUnique({ where: { machineCode: code } });
    if (!existing) return code;
  }
  throw new Error("failed to generate a unique machine code");
}

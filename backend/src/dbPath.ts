import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** Resolves DATABASE_URL to one absolute, unambiguous file path, used identically by both the
 *  Prisma CLI (schema push) and the app's own better-sqlite3 connection — relative `file:` URLs
 *  are otherwise resolved inconsistently (CLI: relative to schema.prisma; app: relative to cwd). */
export function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/hackathon.db";
  const relativeOrAbsolute = raw.replace(/^file:/, "");
  const absolute = path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.resolve(moduleDir, "..", relativeOrAbsolute);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  return absolute;
}

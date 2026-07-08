import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.ts";

const rawUrl = process.env.DATABASE_URL ?? "file:./data/hackathon.db";
const url = rawUrl.replace(/^file:/, "");
const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });

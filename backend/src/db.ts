import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.ts";
import { resolveDbPath } from "./dbPath.ts";

const adapter = new PrismaBetterSqlite3({ url: resolveDbPath() });

export const prisma = new PrismaClient({ adapter });

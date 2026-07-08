/*
  Warnings:

  - You are about to drop the column `verifyHash` on the `JobChunk` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "providerId" TEXT,
    "shadowProviderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "outputHash" TEXT,
    "shadowHash" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "JobChunk_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobChunk_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JobChunk_shadowProviderId_fkey" FOREIGN KEY ("shadowProviderId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_JobChunk" ("completedAt", "id", "index", "jobId", "outputHash", "progress", "providerId", "startedAt", "status", "verified") SELECT "completedAt", "id", "index", "jobId", "outputHash", "progress", "providerId", "startedAt", "status", "verified" FROM "JobChunk";
DROP TABLE "JobChunk";
ALTER TABLE "new_JobChunk" RENAME TO "JobChunk";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

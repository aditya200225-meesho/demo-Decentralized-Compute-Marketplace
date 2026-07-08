-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "ramGb" INTEGER NOT NULL,
    "hasGpu" BOOLEAN NOT NULL DEFAULT false,
    "gpuModel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "reliabilityScore" REAL NOT NULL DEFAULT 1,
    "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "jobsFailed" INTEGER NOT NULL DEFAULT 0,
    "creditBalance" REAL NOT NULL DEFAULT 0,
    "isVirtual" BOOLEAN NOT NULL DEFAULT true,
    "batteryPct" INTEGER NOT NULL DEFAULT 100,
    "isOnWifi" BOOLEAN NOT NULL DEFAULT true,
    "isCharging" BOOLEAN NOT NULL DEFAULT true,
    "cpuTempC" INTEGER NOT NULL DEFAULT 45,
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Provider_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "minCpuCores" INTEGER NOT NULL DEFAULT 1,
    "minRamGb" INTEGER NOT NULL DEFAULT 1,
    "requiresGpu" BOOLEAN NOT NULL DEFAULT false,
    "basePrice" REAL NOT NULL,
    "estCarbonG" REAL NOT NULL DEFAULT 10,
    "privacyMode" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterName" TEXT NOT NULL,
    "templateId" TEXT,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "chunkCount" INTEGER NOT NULL DEFAULT 1,
    "minCpuCores" INTEGER NOT NULL DEFAULT 1,
    "minRamGb" INTEGER NOT NULL DEFAULT 1,
    "requiresGpu" BOOLEAN NOT NULL DEFAULT false,
    "privacyMode" BOOLEAN NOT NULL DEFAULT true,
    "price" REAL NOT NULL,
    "reliabilityMin" REAL NOT NULL DEFAULT 0,
    "disputeReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Job_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "JobTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "providerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "outputHash" TEXT,
    "verifyHash" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "JobChunk_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobChunk_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT,
    "jobId" TEXT,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

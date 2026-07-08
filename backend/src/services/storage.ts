import crypto from "node:crypto";
import { prisma } from "../db.ts";

const BUCKET = "idle-compute-coop-bucket";

function contentHash(seed: string) {
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24);
}

/** Deterministic-looking but simulated size in bytes — no real payload is ever generated or moved. */
function simulateSize(seed: string, minMb: number, maxMb: number) {
  const n = parseInt(crypto.createHash("md5").update(seed).digest("hex").slice(0, 8), 16) / 0xffffffff;
  return Math.round((minMb + n * (maxMb - minMb)) * 1024 * 1024);
}

/** Simulates the requester uploading the job's input payload to a shared bucket at submission time. */
export async function uploadInputObject(job: { id: string; chunkCount: number; taskType: string }) {
  const key = `${BUCKET}/jobs/${job.id}/input.dat`;
  await prisma.storageObject.create({
    data: {
      jobId: job.id,
      key,
      kind: "INPUT",
      sizeBytes: simulateSize(job.id, 5, 400) * Math.max(1, Math.round(job.chunkCount / 2)),
      contentHash: contentHash(`${job.id}:input:${job.taskType}`),
    },
  });
}

/** Simulates a machine uploading its computed result for a chunk back to the bucket. */
export async function uploadOutputObject(chunk: { id: string; jobId: string; index: number }, providerId: string, role: "primary" | "shadow") {
  const key = `${BUCKET}/jobs/${chunk.jobId}/chunks/${chunk.index}/${role}-output.dat`;
  await prisma.storageObject.create({
    data: {
      jobId: chunk.jobId,
      chunkId: chunk.id,
      key,
      kind: "OUTPUT",
      sizeBytes: simulateSize(`${chunk.id}:${role}`, 1, 40),
      contentHash: contentHash(`${chunk.id}:${role}:${providerId}`),
      uploadedByProviderId: providerId,
    },
  });
}

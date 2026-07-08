export type ProviderStatus = "ONLINE" | "IDLE" | "BUSY" | "OFFLINE";
export type JobStatus =
  | "PENDING"
  | "MATCHED"
  | "RUNNING"
  | "VERIFYING"
  | "VERIFIED"
  | "DISPUTED"
  | "PAID"
  | "FAILED";
export type ChunkStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  providers?: Provider[];
}

export interface Provider {
  id: string;
  name: string;
  cpuCores: number;
  ramGb: number;
  hasGpu: boolean;
  gpuModel: string | null;
  status: ProviderStatus;
  reliabilityScore: number;
  jobsCompleted: number;
  jobsFailed: number;
  creditBalance: number;
  isVirtual: boolean;
  batteryPct: number;
  isOnWifi: boolean;
  isCharging: boolean;
  cpuTempC: number;
  teamId: string | null;
  team?: Team | null;
  createdAt: string;
}

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  taskType: string;
  minCpuCores: number;
  minRamGb: number;
  requiresGpu: boolean;
  basePrice: number;
  estCarbonG: number;
  privacyMode: boolean;
}

export interface JobChunk {
  id: string;
  jobId: string;
  index: number;
  providerId: string | null;
  provider?: Provider | null;
  shadowProviderId: string | null;
  shadowProvider?: Provider | null;
  status: ChunkStatus;
  progress: number;
  outputHash: string | null;
  shadowHash: string | null;
  verified: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface LedgerEntry {
  id: string;
  providerId: string | null;
  jobId: string | null;
  type: "ESCROW_HOLD" | "ESCROW_RELEASE" | "ESCROW_REFUND" | "EARNING" | "PAYOUT";
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface Job {
  id: string;
  requesterName: string;
  templateId: string | null;
  template?: JobTemplate | null;
  taskType: string;
  status: JobStatus;
  chunkCount: number;
  minCpuCores: number;
  minRamGb: number;
  requiresGpu: boolean;
  privacyMode: boolean;
  price: number;
  reliabilityMin: number;
  disputeReason: string | null;
  createdAt: string;
  matchedAt: string | null;
  completedAt: string | null;
  chunks: JobChunk[];
  ledgerEntries?: LedgerEntry[];
}

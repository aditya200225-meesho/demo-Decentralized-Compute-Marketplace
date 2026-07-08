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
export type GroupVisibility = "OPEN" | "INVITE_ONLY";
export type GroupRole = "ADMIN" | "MODERATOR" | "MEMBER";
export type InviteStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface User {
  id: string;
  username: string;
}

export interface GroupSummary {
  id: string;
  name: string;
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
  onlineTicks: number;
  totalTicks: number;
  uptimePct?: number;
  machineCode: string;
  ownerId: string | null;
  groupId: string | null;
  group?: GroupSummary | null;
  groupRole: GroupRole | null;
  createdAt: string;
  chunks?: JobChunk[];
  shadowChunks?: JobChunk[];
  ledgerEntries?: LedgerEntry[];
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
  job?: Job;
}

export interface LedgerEntry {
  id: string;
  providerId: string | null;
  jobId: string | null;
  type: "ESCROW_HOLD" | "ESCROW_RELEASE" | "ESCROW_REFUND" | "EARNING" | "PAYOUT";
  amount: number;
  note: string | null;
  createdAt: string;
  job?: Pick<Job, "id" | "requesterName" | "template"> | null;
}

export interface DashboardStats {
  totalJobs: number;
  totalRedundantAssignments: number;
  disputedJobs: number;
  paidJobs: number;
  totalPaidOut: number;
  totalRefunded: number;
}

export type StorageObjectKind = "INPUT" | "OUTPUT";

export interface StorageObject {
  id: string;
  jobId: string;
  job?: Pick<Job, "id" | "requesterName" | "template"> | null;
  chunkId: string | null;
  key: string;
  kind: StorageObjectKind;
  sizeBytes: number;
  contentHash: string;
  uploadedByProviderId: string | null;
  uploadedByProvider?: Pick<Provider, "id" | "name"> | null;
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
  storageObjects?: StorageObject[];
}

export interface GroupRule {
  id: string;
  groupId: string;
  minReliability: number | null;
  minJobsCompleted: number | null;
  minCpuCores: number | null;
  minRamGb: number | null;
  requiresGpu: boolean | null;
  minAccountAgeDays: number | null;
  minAvgJobsPerWeek: number | null;
  minUptimePct: number | null;
}

export interface CoopGroupSummary {
  id: string;
  name: string;
  visibility: GroupVisibility;
  createdAt: string;
  rule: GroupRule | null;
  memberCount: number;
  avgWeeklyEarningsPerMachine: number;
}

export interface GroupMemberSummary {
  id: string;
  name: string;
  role: GroupRole | null;
  reliabilityScore: number;
  strikeCount: number;
  joinedAt: string | null;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  providerId: string;
  provider?: { id: string; name: string; machineCode: string };
  invitedByProviderId: string | null;
  status: InviteStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface CoopGroupDetail {
  id: string;
  name: string;
  visibility: GroupVisibility;
  createdAt: string;
  rule: GroupRule | null;
  members: GroupMemberSummary[];
  pendingInvites: GroupInvite[];
}

export interface AppNotification {
  id: string;
  userId: string;
  type: "GROUP_INVITE" | "RULE_VIOLATION_WARNING" | "REMOVED_FROM_GROUP" | "INVITE_ACCEPTED";
  message: string;
  groupId: string | null;
  inviteId: string | null;
  read: boolean;
  createdAt: string;
}

export interface GroupRuleInput {
  minReliability?: number | null;
  minJobsCompleted?: number | null;
  minCpuCores?: number | null;
  minRamGb?: number | null;
  requiresGpu?: boolean | null;
  minAccountAgeDays?: number | null;
  minAvgJobsPerWeek?: number | null;
  minUptimePct?: number | null;
}

import { Badge } from "@/components/ui/badge";
import type { JobStatus, ProviderStatus } from "@/lib/types";

const JOB_VARIANT: Record<JobStatus, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  PENDING: "outline",
  MATCHED: "secondary",
  RUNNING: "warning",
  VERIFYING: "warning",
  VERIFIED: "success",
  DISPUTED: "destructive",
  PAID: "success",
  FAILED: "destructive",
};

const PROVIDER_VARIANT: Record<ProviderStatus, "default" | "secondary" | "outline" | "success"> = {
  ONLINE: "success",
  IDLE: "secondary",
  BUSY: "default",
  OFFLINE: "outline",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={JOB_VARIANT[status]}>{status}</Badge>;
}

export function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  return <Badge variant={PROVIDER_VARIANT[status]}>{status}</Badge>;
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProviderStatusBadge, JobStatusBadge } from "@/components/StatusBadge";
import { ShieldCheck, ShieldAlert, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Provider } from "@/lib/types";

function fmtDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return `${(ms / 1000).toFixed(1)}s`;
}

export function MyMachineDetailDialog({
  provider,
  open,
  onOpenChange,
  onChanged,
}: {
  provider: Provider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  if (!provider) return null;

  const primaryJobs = (provider.chunks ?? []).map((c) => ({ chunk: c, role: c.shadowProviderId ? "Primary (co-op)" : "Solo" as const }));
  const shadowJobs = (provider.shadowChunks ?? []).map((c) => ({ chunk: c, role: "Verifier (co-op)" as const }));
  const jobHistory = [...primaryJobs, ...shadowJobs].sort((a, b) => {
    const ta = a.chunk.startedAt ? new Date(a.chunk.startedAt).getTime() : 0;
    const tb = b.chunk.startedAt ? new Date(b.chunk.startedAt).getTime() : 0;
    return tb - ta;
  });

  const earningByJob = new Map<string, number>();
  for (const entry of provider.ledgerEntries ?? []) {
    if (entry.type !== "EARNING" || !entry.jobId) continue;
    earningByJob.set(entry.jobId, (earningByJob.get(entry.jobId) ?? 0) + entry.amount);
  }
  const totalEarned = [...earningByJob.values()].reduce((s, v) => s + v, 0);
  const runningCount = jobHistory.filter((j) => j.chunk.status === "RUNNING" || j.chunk.status === "PENDING").length;
  const failedCount = jobHistory.filter((j) => j.chunk.status === "DONE" && !j.chunk.verified).length;
  const doneCount = jobHistory.filter((j) => j.chunk.status === "DONE" && j.chunk.verified).length;

  async function handleLeaveGroup() {
    if (!provider!.groupId) return;
    if (!confirm(`Leave "${provider!.group?.name}"?`)) return;
    await api.leaveGroup(provider!.groupId, provider!.id);
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{provider.name}</DialogTitle>
            <ProviderStatusBadge status={provider.status} />
          </div>
          <DialogDescription>
            Machine ID <span className="font-mono">{provider.machineCode}</span> · {provider.cpuCores} cores ·{" "}
            {provider.ramGb} GB RAM{provider.hasGpu ? ` · ${provider.gpuModel}` : ""} · uptime{" "}
            {(provider.uptimePct ?? 100).toFixed(1)}%
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 rounded-md border p-3 text-center text-sm">
          <div>
            <p className="text-lg font-semibold">{runningCount}</p>
            <p className="text-xs text-muted-foreground">running</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-600">{doneCount}</p>
            <p className="text-xs text-muted-foreground">done</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-500">{failedCount}</p>
            <p className="text-xs text-muted-foreground">failed</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{provider.creditBalance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">credits</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3 text-sm">
          {provider.groupId ? (
            <>
              <span className="flex items-center gap-2">
                <Users className="size-4" /> In co-op group <span className="font-medium">{provider.group?.name}</span>
                {provider.groupRole && <Badge variant="outline">{provider.groupRole}</Badge>}
              </span>
              <Button size="sm" variant="outline" onClick={handleLeaveGroup}>
                Leave group
              </Button>
            </>
          ) : (
            <span className="text-muted-foreground">Not in a co-op group — runs jobs solo. Browse the Co-op Groups tab to join one.</span>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Job history</h3>
          <div className="flex flex-col gap-1.5">
            {jobHistory.length === 0 && <p className="text-xs text-muted-foreground">No jobs run yet.</p>}
            {jobHistory.map(({ chunk, role }) => (
              <div key={`${role}-${chunk.id}`} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{chunk.job?.template?.name ?? chunk.job?.taskType ?? "job"}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {role} · chunk {chunk.index + 1} · took {fmtDuration(chunk.startedAt, chunk.completedAt)}
                    {chunk.job?.status && <JobStatusBadge status={chunk.job.status} />}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {chunk.status === "DONE" &&
                    (chunk.verified ? (
                      <ShieldCheck className="size-3.5 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="size-3.5 text-red-500" />
                    ))}
                  <span className="font-medium">
                    {chunk.jobId && earningByJob.has(chunk.jobId) ? `+${earningByJob.get(chunk.jobId)!.toFixed(4)} cr` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-medium">Earnings ledger</h3>
          <div className="flex flex-col gap-1.5 text-xs">
            {(provider.ledgerEntries ?? []).filter((l) => l.type === "EARNING").length === 0 && (
              <p className="text-muted-foreground">No earnings yet.</p>
            )}
            {(provider.ledgerEntries ?? [])
              .filter((l) => l.type === "EARNING")
              .map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {entry.job?.template?.name ?? entry.job?.requesterName ?? "job"} — {entry.note}
                  </span>
                  <span className="font-medium">+{entry.amount.toFixed(4)} cr</span>
                </div>
              ))}
          </div>
          <p className="mt-2 text-xs font-medium">Total earned: {totalEarned.toFixed(4)} credits</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

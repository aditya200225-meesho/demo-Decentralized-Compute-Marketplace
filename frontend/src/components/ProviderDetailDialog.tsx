import { useEffect, useState } from "react";
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
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Provider } from "@/lib/types";

export function ProviderDetailDialog({
  providerId,
  open,
  onOpenChange,
}: {
  providerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !providerId) return;
    let cancelled = false;
    setProvider(null);
    setError(null);

    async function load() {
      try {
        const p = await api.getProvider(providerId!);
        if (!cancelled) setProvider(p);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }
    load();
    const interval = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, providerId]);

  const primaryJobs = (provider?.chunks ?? []).map((c) => ({ chunk: c, role: "Primary runner" as const }));
  const shadowJobs = (provider?.shadowChunks ?? []).map((c) => ({ chunk: c, role: "Shadow verifier" as const }));
  const jobHistory = [...primaryJobs, ...shadowJobs].sort((a, b) => {
    const ta = a.chunk.startedAt ? new Date(a.chunk.startedAt).getTime() : 0;
    const tb = b.chunk.startedAt ? new Date(b.chunk.startedAt).getTime() : 0;
    return tb - ta;
  });

  const earningByJob = new Map<string, number>();
  for (const entry of provider?.ledgerEntries ?? []) {
    if (entry.type !== "EARNING" || !entry.jobId) continue;
    earningByJob.set(entry.jobId, (earningByJob.get(entry.jobId) ?? 0) + entry.amount);
  }
  const totalEarned = [...earningByJob.values()].reduce((s, v) => s + v, 0);

  async function handleToggleStatus() {
    if (!provider) return;
    const next = provider.status === "OFFLINE" ? "ONLINE" : "OFFLINE";
    const updated = await api.setProviderStatus(provider.id, next);
    setProvider({ ...provider, status: updated.status });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {!provider ? (
          <>
            <DialogHeader>
              <DialogTitle>Loading…</DialogTitle>
            </DialogHeader>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{provider.name}</DialogTitle>
                <ProviderStatusBadge status={provider.status} />
                {provider.isVirtual && <Badge variant="outline">simulated</Badge>}
                {provider.group && <Badge variant="outline">{provider.group.name}</Badge>}
              </div>
              <DialogDescription>
                {provider.cpuCores} cores · {provider.ramGb} GB RAM
                {provider.hasGpu ? ` · ${provider.gpuModel}` : ""} · reliability{" "}
                {(provider.reliabilityScore * 100).toFixed(0)}%
              </DialogDescription>
            </DialogHeader>

            {provider.isVirtual && !provider.ownerId && user && (
              <div className="flex items-center justify-between rounded-md border border-dashed p-2 text-xs">
                <span className="text-muted-foreground">
                  Testing control: pause this simulated bot so it stops competing for jobs.
                </span>
                <Button size="sm" variant="outline" onClick={handleToggleStatus}>
                  {provider.status === "OFFLINE" ? "Bring online" : "Take offline"}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 rounded-md border p-3 text-center text-sm">
              <div>
                <p className="text-lg font-semibold">{provider.jobsCompleted}</p>
                <p className="text-xs text-muted-foreground">jobs completed</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-red-500">{provider.jobsFailed}</p>
                <p className="text-xs text-muted-foreground">verification fails</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{provider.creditBalance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">credit balance</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Job history</h3>
              <div className="flex flex-col gap-1.5">
                {jobHistory.length === 0 && (
                  <p className="text-xs text-muted-foreground">No jobs run yet.</p>
                )}
                {jobHistory.map(({ chunk, role }) => (
                  <div key={`${role}-${chunk.id}`} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{chunk.job?.template?.name ?? chunk.job?.taskType ?? "job"}</span>
                      <span className="text-muted-foreground">
                        {role} · chunk {chunk.index + 1}
                        {chunk.job?.status && (
                          <>
                            {" "}
                            · <JobStatusBadge status={chunk.job.status} />
                          </>
                        )}
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
                        {chunk.jobId && earningByJob.has(chunk.jobId)
                          ? `+${earningByJob.get(chunk.jobId)!.toFixed(4)} cr`
                          : "—"}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

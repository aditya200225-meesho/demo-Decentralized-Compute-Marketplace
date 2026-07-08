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
import { JobStatusBadge } from "@/components/StatusBadge";
import { ShieldCheck, ShieldAlert, Hourglass, Database, Download, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString();
}

function fmtBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function JobDetailDialog({
  jobId,
  open,
  onOpenChange,
}: {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !jobId) return;
    let cancelled = false;
    setJob(null);
    setError(null);

    async function load() {
      try {
        const j = await api.getJob(jobId!);
        if (!cancelled) setJob(j);
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
  }, [open, jobId]);

  if (!open) return null;

  if (!job) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading…</DialogTitle>
          </DialogHeader>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </DialogContent>
      </Dialog>
    );
  }

  const earnings = (job.ledgerEntries ?? []).filter((l) => l.type === "EARNING");
  const inputObject = (job.storageObjects ?? []).find((o) => o.kind === "INPUT");
  const outputObjects = (job.storageObjects ?? []).filter((o) => o.kind === "OUTPUT");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{job.template?.name ?? job.taskType}</DialogTitle>
            <JobStatusBadge status={job.status} />
          </div>
          <DialogDescription>
            Requested by {job.requesterName} · {job.price.toFixed(2)} credits · submitted{" "}
            {new Date(job.createdAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        {job.status === "DISPUTED" && job.disputeReason && (
          <p className="rounded-md bg-red-500/10 p-2 text-sm text-red-500">{job.disputeReason} — escrow refunded.</p>
        )}

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Database className="size-4" /> Simulated bucket activity
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            No real files move — this shows the upload/pull/upload round-trip a real job would make through shared
            storage (like S3), with honestly-labeled simulated sizes and hashes.
          </p>
          <div className="flex flex-col gap-1.5">
            {inputObject && (
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                <span className="flex items-center gap-2">
                  <ArrowUpFromLine className="size-3.5 text-sky-600" />
                  <span className="font-mono">{inputObject.key.split("/").slice(-1)[0]}</span>
                  <span className="text-muted-foreground">
                    uploaded by {job.requesterName} · {fmtBytes(inputObject.sizeBytes)}
                  </span>
                </span>
                <a href={api.storageDownloadUrl(inputObject.id)} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">
                    <Download className="size-3.5" />
                  </Button>
                </a>
              </div>
            )}
            {outputObjects.map((obj) => (
              <div key={obj.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                <span className="flex items-center gap-2">
                  <ArrowDownToLine className="size-3.5 text-emerald-600" />
                  <span className="font-mono">{obj.key.split("/").slice(-2).join("/")}</span>
                  <span className="text-muted-foreground">
                    uploaded by {obj.uploadedByProvider?.name ?? "unknown"} · {fmtBytes(obj.sizeBytes)}
                  </span>
                </span>
                <a href={api.storageDownloadUrl(obj.id)} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">
                    <Download className="size-3.5" />
                  </Button>
                </a>
              </div>
            ))}
            {!inputObject && outputObjects.length === 0 && (
              <p className="text-xs text-muted-foreground">No bucket activity yet.</p>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-medium">Redundant verification log</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Every co-op chunk runs twice, independently, on two different machines. Their output hashes must match
            for the job to be paid out — this is what catches a bad or malicious result.
          </p>
          <div className="flex flex-col gap-2">
            {job.chunks.map((chunk) => (
              <div key={chunk.id} className="rounded-md border p-3 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    Chunk {chunk.index + 1}
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {chunk.shadowProviderId ? "co-op verified" : "solo"}
                    </Badge>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {chunk.status !== "DONE" ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Hourglass className="size-3.5" /> {chunk.status.toLowerCase()} ({chunk.progress}%)
                      </span>
                    ) : chunk.verified ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <ShieldCheck className="size-3.5" /> hashes matched
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <ShieldAlert className="size-3.5" /> mismatch
                      </span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Primary runner</p>
                    <p className="font-medium">
                      {chunk.provider?.name ?? "unassigned"}
                      {chunk.provider?.group && (
                        <span className="ml-1 font-normal text-muted-foreground">({chunk.provider.group.name})</span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {chunk.outputHash ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shadow verifier</p>
                    <p className="font-medium">
                      {chunk.shadowProvider?.name ?? (chunk.providerId ? "none — trust-based" : "unassigned")}
                      {chunk.shadowProvider?.group && (
                        <span className="ml-1 font-normal text-muted-foreground">({chunk.shadowProvider.group.name})</span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {chunk.shadowHash ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                  <span>started {fmtTime(chunk.startedAt)}</span>
                  <span>completed {fmtTime(chunk.completedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-medium">Escrow &amp; payout ledger</h3>
          <div className="flex flex-col gap-1.5 text-xs">
            {(job.ledgerEntries ?? []).length === 0 && (
              <p className="text-muted-foreground">No ledger activity yet.</p>
            )}
            {(job.ledgerEntries ?? []).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{entry.type}</Badge>
                  <span className="text-muted-foreground">{entry.note}</span>
                </span>
                <span className="font-medium">{entry.amount.toFixed(4)} cr</span>
              </div>
            ))}
          </div>
          {earnings.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Total paid to providers: {earnings.reduce((s, e) => s + e.amount, 0).toFixed(4)} credits
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

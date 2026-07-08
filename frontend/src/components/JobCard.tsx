import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { JobStatusBadge } from "@/components/StatusBadge";
import { ShieldCheck, ShieldAlert, Lock, Users } from "lucide-react";
import type { Job } from "@/lib/types";

export function JobCard({ job }: { job: Job }) {
  const overallProgress =
    job.chunks.length === 0
      ? 0
      : Math.round(job.chunks.reduce((sum, c) => sum + c.progress, 0) / job.chunks.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{job.template?.name ?? job.taskType}</CardTitle>
            <CardDescription>
              by {job.requesterName} · {job.price.toFixed(2)} credits · {job.chunkCount} chunk
              {job.chunkCount > 1 ? "s" : ""}
            </CardDescription>
          </div>
          <JobStatusBadge status={job.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={overallProgress} />

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {job.privacyMode && (
            <span className="flex items-center gap-1" title="Only outputs leave the provider, never raw data">
              <Lock className="size-3.5" /> privacy-preserving
            </span>
          )}
          {job.chunkCount > 1 && (
            <span className="flex items-center gap-1" title="Split across multiple devices">
              <Users className="size-3.5" /> chunked across {job.chunkCount} devices
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {job.chunks.map((chunk) => (
            <div key={chunk.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                chunk {chunk.index + 1} · {chunk.provider?.name ?? "unassigned"}
              </span>
              <div className="flex items-center gap-2">
                <span>{chunk.progress}%</span>
                {chunk.status === "DONE" &&
                  (chunk.verified ? (
                    <span title="Redundant verification matched">
                      <ShieldCheck className="size-3.5 text-emerald-600" />
                    </span>
                  ) : (
                    <span title="Verification mismatch">
                      <ShieldAlert className="size-3.5 text-red-500" />
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {job.status === "DISPUTED" && job.disputeReason && (
          <p className="text-xs text-red-500">{job.disputeReason} — escrow refunded.</p>
        )}
        {job.status === "PAID" && (
          <p className="text-xs text-emerald-600">Verified and paid out to providers from escrow.</p>
        )}
      </CardContent>
    </Card>
  );
}

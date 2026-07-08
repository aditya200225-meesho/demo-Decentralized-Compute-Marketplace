import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobStatusBadge } from "@/components/StatusBadge";
import { ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { StatTile } from "@/components/StatTile";

export function AssignmentsDashboard({
  onOpenJob,
  onOpenProvider,
}: {
  onOpenJob: (jobId: string) => void;
  onOpenProvider: (providerId: string) => void;
}) {
  const assignments = usePolling(useCallback(() => api.listAssignments(), []), 2000);
  const stats = usePolling(useCallback(() => api.getDashboardStats(), []), 3000);

  const rows = assignments.data ?? [];
  const s = stats.data;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Every job chunk is assigned to a primary machine and a shadow-verifier machine at once. This is the
        full assignment ledger across the marketplace — click a job or machine to drill in.
      </p>

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Redundant assignments" value={String(s.totalRedundantAssignments)} hint="chunk runs, primary+shadow pairs" />
          <StatTile label="Jobs paid out" value={String(s.paidJobs)} />
          <StatTile label="Jobs disputed" value={String(s.disputedJobs)} hint="verification mismatch → refunded" />
          <StatTile label="Total paid to providers" value={`${s.totalPaidOut.toFixed(2)} cr`} />
        </div>
      )}

      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Job</th>
                <th className="py-2 pr-3 font-medium">Chunk</th>
                <th className="py-2 pr-3 font-medium">Mode</th>
                <th className="py-2 pr-3 font-medium">Primary machine</th>
                <th className="py-2 pr-3 font-medium"></th>
                <th className="py-2 pr-3 font-medium">Shadow machine</th>
                <th className="py-2 pr-3 font-medium">Verified</th>
                <th className="py-2 pr-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((chunk) => (
                <tr key={chunk.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 pr-3">
                    <button
                      className="font-medium underline-offset-2 hover:underline"
                      onClick={() => onOpenJob(chunk.jobId)}
                    >
                      {chunk.job?.template?.name ?? chunk.job?.taskType ?? chunk.jobId.slice(0, 8)}
                    </button>
                    <p className="text-muted-foreground">{chunk.job?.requesterName}</p>
                  </td>
                  <td className="py-2 pr-3">#{chunk.index + 1}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="outline">{chunk.shadowProviderId ? "co-op" : "solo"}</Badge>
                  </td>
                  <td className="py-2 pr-3">
                    {chunk.provider ? (
                      <button
                        className="underline-offset-2 hover:underline"
                        onClick={() => onOpenProvider(chunk.provider!.id)}
                      >
                        {chunk.provider.name}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">unassigned</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    <ArrowRight className="size-3.5" />
                  </td>
                  <td className="py-2 pr-3">
                    {chunk.shadowProvider ? (
                      <button
                        className="underline-offset-2 hover:underline"
                        onClick={() => onOpenProvider(chunk.shadowProvider!.id)}
                      >
                        {chunk.shadowProvider.name}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">unassigned</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {chunk.status !== "DONE" ? (
                      <Badge variant="outline">{chunk.status.toLowerCase()}</Badge>
                    ) : chunk.verified ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <ShieldCheck className="size-3.5" /> match
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <ShieldAlert className="size-3.5" /> mismatch
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{chunk.job?.status && <JobStatusBadge status={chunk.job.status} />}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    No assignments yet — submit a job to see machines get matched.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

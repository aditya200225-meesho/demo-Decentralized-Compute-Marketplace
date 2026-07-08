import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { Database, Download } from "lucide-react";

function fmtBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageTab({ onOpenJob }: { onOpenJob: (jobId: string) => void }) {
  const objects = usePolling(useCallback(() => api.listStorage(), []), 2500);
  const rows = objects.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Database className="size-4" /> Simulated shared bucket ("{rows[0]?.key.split("/")[0] ?? "idle-compute-coop-bucket"}
        ") — every job's input and every machine's output pass through here. No real files are moved; sizes and
        hashes are simulated for the demo.
      </p>

      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Key</th>
                <th className="py-2 pr-3 font-medium">Kind</th>
                <th className="py-2 pr-3 font-medium">Job</th>
                <th className="py-2 pr-3 font-medium">Uploaded by</th>
                <th className="py-2 pr-3 font-medium">Size</th>
                <th className="py-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((obj) => (
                <tr key={obj.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 pr-3 font-mono">{obj.key}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="outline">{obj.kind}</Badge>
                  </td>
                  <td className="py-2 pr-3">
                    <button className="underline-offset-2 hover:underline" onClick={() => onOpenJob(obj.jobId)}>
                      {obj.job?.template?.name ?? obj.jobId.slice(0, 8)}
                    </button>
                  </td>
                  <td className="py-2 pr-3">{obj.uploadedByProvider?.name ?? obj.job?.requesterName ?? "—"}</td>
                  <td className="py-2 pr-3">{fmtBytes(obj.sizeBytes)}</td>
                  <td className="py-2 pr-3">
                    <a href={api.storageDownloadUrl(obj.id)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                        <Download className="size-3.5" />
                      </Button>
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    No bucket activity yet — submit a job to see input/output objects appear.
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

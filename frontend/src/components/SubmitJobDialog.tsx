import { useCallback, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WalletDialog } from "@/components/WalletDialog";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { JobTemplate } from "@/lib/types";

export function SubmitJobDialog({
  templates,
  onSubmitted,
  trigger,
}: {
  templates: JobTemplate[];
  onSubmitted: () => void;
  trigger: React.ReactNode;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [requesterName, setRequesterName] = useState(user?.username ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [chunkCount, setChunkCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = usePolling(useCallback(() => (open ? api.getWallet() : Promise.resolve(null)), [open]), 3000);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const chunks = Math.max(1, Math.min(8, Number(chunkCount) || 1));
  const estimatedCost = selectedTemplate ? selectedTemplate.basePrice * chunks : 0;
  const balance = wallet.data?.creditBalance ?? 0;
  const insufficientFunds = wallet.data != null && estimatedCost > balance;

  async function handleSubmit() {
    if (!requesterName || !templateId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitJob({ requesterName, templateId, chunkCount: chunks });
      setOpen(false);
      setRequesterName(user?.username ?? "");
      onSubmitted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a job</DialogTitle>
          <DialogDescription>
            Pick a template — hardware requirements and pricing auto-fill from it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requesterName">Your name</Label>
            <Input
              id="requesterName"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="e.g. Aditya"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Job template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — {t.basePrice.toFixed(2)} cr/chunk
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chunkCount">Split into how many chunks?</Label>
            <Input
              id="chunkCount"
              type="number"
              min={1}
              max={8}
              value={chunkCount}
              onChange={(e) => setChunkCount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Splits the job across multiple devices in parallel, like Folding@home.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3 text-sm">
            <span>
              This job costs <span className="font-medium">{estimatedCost.toFixed(2)}</span> credits — you have{" "}
              <span className="font-medium">{balance.toFixed(2)}</span>
            </span>
            {insufficientFunds && <WalletDialog trigger={<Button size="sm">Buy credits</Button>} />}
          </div>

          {insufficientFunds && (
            <p className="text-xs text-red-500">Not enough credits to submit this job — buy more above.</p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || !requesterName || !templateId || insufficientFunds}>
            {submitting ? "Submitting…" : "Submit job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

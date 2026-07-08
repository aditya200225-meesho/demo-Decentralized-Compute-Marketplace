import { useCallback, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { Wallet } from "lucide-react";

export function WalletDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const wallet = usePolling(useCallback(() => (open ? api.getWallet() : Promise.resolve(null)), [open]), 2500);
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(amount: number) {
    setBuying(amount);
    setError(null);
    try {
      await api.topUpWallet(amount);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBuying(null);
    }
  }

  const w = wallet.data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Wallet className="size-5" />
            <DialogTitle>Your credit wallet</DialogTitle>
          </div>
          <DialogDescription>
            Credits pay for the compute your jobs use — held when you submit a job, released to the machines that
            run it, and refunded automatically if redundant verification disputes the result.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-4 text-center">
          <p className="text-3xl font-semibold">{(w?.creditBalance ?? 0).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">credits available</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Buy credits</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Simulated purchase — no real payment is processed. In production this would go through a real payment
            gateway.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(w?.packages ?? [5, 20, 50, 100]).map((amount) => (
              <Button key={amount} size="sm" variant="outline" disabled={buying !== null} onClick={() => handleBuy(amount)}>
                {buying === amount ? "…" : `+${amount}`}
              </Button>
            ))}
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-medium">Wallet history</h3>
          <div className="flex flex-col gap-1.5 text-xs">
            {(w?.ledger ?? []).length === 0 && <p className="text-muted-foreground">No wallet activity yet.</p>}
            {(w?.ledger ?? []).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{entry.type}</Badge>
                  <span className="text-muted-foreground">
                    {entry.job?.template?.name ?? entry.note}
                  </span>
                </span>
                <span className={entry.type === "ESCROW_HOLD" ? "font-medium text-red-500" : "font-medium text-emerald-600"}>
                  {entry.type === "ESCROW_HOLD" ? "-" : "+"}
                  {entry.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

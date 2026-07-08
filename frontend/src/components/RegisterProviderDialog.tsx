import { useState } from "react";
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
import { api } from "@/lib/api";
import type { Provider } from "@/lib/types";

export function RegisterProviderDialog({
  onRegistered,
  trigger,
}: {
  onRegistered: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Provider | null>(null);

  async function handleSubmit() {
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      const provider = await api.registerProvider(name);
      setRegistered(provider);
      setName("");
      onRegistered();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) setRegistered(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {registered ? (
          <>
            <DialogHeader>
              <DialogTitle>{registered.name} is registered</DialogTitle>
              <DialogDescription>
                Save this machine ID — a co-op group admin needs it to invite your machine.
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-md border bg-muted/50 p-3 text-center font-mono text-lg tracking-wider">
              {registered.machineCode}
            </p>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Register this machine</DialogTitle>
              <DialogDescription>
                We auto-detect this machine's CPU cores and RAM and list it as an idle-hardware provider. It runs
                jobs solo (single-machine, trust-based) unless you join a co-op group for redundant verification.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="providerName">Machine name</Label>
              <Input
                id="providerName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Laptop"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <DialogFooter>
              <Button onClick={handleSubmit} disabled={submitting || !name}>
                {submitting ? "Registering…" : "Register"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

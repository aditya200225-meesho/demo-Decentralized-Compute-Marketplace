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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { GroupVisibility, Provider } from "@/lib/types";

export function CreateGroupDialog({
  myGrouplessMachines,
  onCreated,
  trigger,
}: {
  myGrouplessMachines: Provider[];
  onCreated: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("OPEN");
  const [founderProviderId, setFounderProviderId] = useState(myGrouplessMachines[0]?.id ?? "");
  const [minReliability, setMinReliability] = useState("");
  const [minCpuCores, setMinCpuCores] = useState("");
  const [minRamGb, setMinRamGb] = useState("");
  const [minUptimePct, setMinUptimePct] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name || !founderProviderId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createGroup({
        name,
        visibility,
        founderProviderId,
        rules: {
          minReliability: minReliability ? Number(minReliability) / 100 : null,
          minCpuCores: minCpuCores ? Number(minCpuCores) : null,
          minRamGb: minRamGb ? Number(minRamGb) : null,
          minUptimePct: minUptimePct ? Number(minUptimePct) : null,
        },
      });
      setOpen(false);
      setName("");
      onCreated();
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
          <DialogTitle>Create a co-op group</DialogTitle>
          <DialogDescription>
            Your group pools machines together for redundant verification. You'll be the admin.
          </DialogDescription>
        </DialogHeader>

        {myGrouplessMachines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You need at least one registered machine that isn't already in a group to found one.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="groupName">Group name</Label>
              <Input id="groupName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hostel Wing-C Co-op" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Founding machine</Label>
              <Select value={founderProviderId} onValueChange={setFounderProviderId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a machine" />
                </SelectTrigger>
                <SelectContent>
                  {myGrouplessMachines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as GroupVisibility)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open — anyone meeting the rules can join</SelectItem>
                  <SelectItem value="INVITE_ONLY">Invite-only — admin/mods invite by machine ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs font-medium text-muted-foreground">Join rules (optional, edit later in group settings)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minReliability">Min reliability %</Label>
                <Input id="minReliability" type="number" min={0} max={100} value={minReliability} onChange={(e) => setMinReliability(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minUptimePct">Min uptime %</Label>
                <Input id="minUptimePct" type="number" min={0} max={100} value={minUptimePct} onChange={(e) => setMinUptimePct(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minCpuCores">Min CPU cores</Label>
                <Input id="minCpuCores" type="number" min={0} value={minCpuCores} onChange={(e) => setMinCpuCores(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minRamGb">Min RAM (GB)</Label>
                <Input id="minRamGb" type="number" min={0} value={minRamGb} onChange={(e) => setMinRamGb(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || !name || !founderProviderId}>
            {submitting ? "Creating…" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

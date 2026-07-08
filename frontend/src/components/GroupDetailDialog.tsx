import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import type { Provider } from "@/lib/types";

export function GroupDetailDialog({
  groupId,
  open,
  onOpenChange,
  myMachines,
  onChanged,
}: {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myMachines: Provider[];
  onChanged: () => void;
}) {
  const detail = usePolling(useCallback(() => (groupId ? api.getGroup(groupId) : Promise.resolve(null)), [groupId]), 2000);
  const [machineCode, setMachineCode] = useState("");
  const [joinMachineId, setJoinMachineId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<{ minReliability: string; minCpuCores: string; minRamGb: string; minUptimePct: string }>({
    minReliability: "",
    minCpuCores: "",
    minRamGb: "",
    minUptimePct: "",
  });

  const group = detail.data;

  useEffect(() => {
    if (!group?.rule) return;
    setRules({
      minReliability: group.rule.minReliability != null ? String(Math.round(group.rule.minReliability * 100)) : "",
      minCpuCores: group.rule.minCpuCores != null ? String(group.rule.minCpuCores) : "",
      minRamGb: group.rule.minRamGb != null ? String(group.rule.minRamGb) : "",
      minUptimePct: group.rule.minUptimePct != null ? String(group.rule.minUptimePct) : "",
    });
  }, [group?.rule]);

  if (!group) return null;

  const myMemberIds = new Set(myMachines.map((m) => m.id));
  const myMembership = group.members.find((m) => myMemberIds.has(m.id));
  const isAdmin = myMembership?.role === "ADMIN";
  const isAdminOrMod = myMembership?.role === "ADMIN" || myMembership?.role === "MODERATOR";
  const myGrouplessMachines = myMachines.filter((m) => !m.groupId);

  async function handleInvite() {
    if (!machineCode || !groupId) return;
    setError(null);
    try {
      await api.inviteToGroup(groupId, machineCode.toUpperCase());
      setMachineCode("");
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleJoin() {
    if (!joinMachineId || !groupId) return;
    setError(null);
    try {
      await api.joinGroup(groupId, joinMachineId);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSaveRules() {
    if (!groupId) return;
    setError(null);
    try {
      await api.updateGroupRules(groupId, {
        minReliability: rules.minReliability ? Number(rules.minReliability) / 100 : null,
        minCpuCores: rules.minCpuCores ? Number(rules.minCpuCores) : null,
        minRamGb: rules.minRamGb ? Number(rules.minRamGb) : null,
        minUptimePct: rules.minUptimePct ? Number(rules.minUptimePct) : null,
      });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRemove(providerId: string) {
    if (!groupId) return;
    if (!confirm("Remove this machine from the group?")) return;
    await api.removeMember(groupId, providerId);
    onChanged();
  }

  async function handleRoleChange(providerId: string, role: "MODERATOR" | "MEMBER") {
    if (!groupId) return;
    await api.setMemberRole(groupId, providerId, role);
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{group.name}</DialogTitle>
            <Badge variant="outline">{group.visibility === "OPEN" ? "Open" : "Invite-only"}</Badge>
          </div>
          <DialogDescription>Group ID: <span className="font-mono">{group.id}</span></DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div>
          <h3 className="mb-2 text-sm font-medium">Members</h3>
          <div className="flex flex-col gap-1.5">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{m.name}</span>
                  <Badge variant="outline">{m.role}</Badge>
                  {m.strikeCount > 0 && <span className="text-red-500">{m.strikeCount}/5 strikes</span>}
                </span>
                {isAdmin && m.role !== "ADMIN" && (
                  <span className="flex items-center gap-1">
                    {m.role === "MEMBER" ? (
                      <Button size="sm" variant="outline" onClick={() => handleRoleChange(m.id, "MODERATOR")}>
                        Make moderator
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleRoleChange(m.id, "MEMBER")}>
                        Demote
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleRemove(m.id)}>
                      Remove
                    </Button>
                  </span>
                )}
                {isAdminOrMod && !isAdmin && m.role === "MEMBER" && (
                  <Button size="sm" variant="outline" onClick={() => handleRemove(m.id)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Join rules</h3>
          {isAdmin ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Min reliability %</Label>
                  <Input type="number" value={rules.minReliability} onChange={(e) => setRules({ ...rules, minReliability: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Min uptime %</Label>
                  <Input type="number" value={rules.minUptimePct} onChange={(e) => setRules({ ...rules, minUptimePct: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Min CPU cores</Label>
                  <Input type="number" value={rules.minCpuCores} onChange={(e) => setRules({ ...rules, minCpuCores: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Min RAM (GB)</Label>
                  <Input type="number" value={rules.minRamGb} onChange={(e) => setRules({ ...rules, minRamGb: e.target.value })} />
                </div>
              </div>
              <Button size="sm" onClick={handleSaveRules} className="self-start">
                Save rules
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 text-xs">
              {group.rule?.minReliability != null && <Badge variant="outline">reliability ≥ {(group.rule.minReliability * 100).toFixed(0)}%</Badge>}
              {group.rule?.minUptimePct != null && <Badge variant="outline">uptime ≥ {group.rule.minUptimePct}%</Badge>}
              {group.rule?.minCpuCores != null && <Badge variant="outline">{group.rule.minCpuCores}+ cores</Badge>}
              {group.rule?.minRamGb != null && <Badge variant="outline">{group.rule.minRamGb}+ GB RAM</Badge>}
              {!group.rule?.minReliability && !group.rule?.minUptimePct && !group.rule?.minCpuCores && !group.rule?.minRamGb && (
                <span className="text-muted-foreground">No join rules set.</span>
              )}
            </div>
          )}
        </div>

        {isAdminOrMod && (
          <>
            <Separator />
            <div>
              <h3 className="mb-2 text-sm font-medium">Invite a machine by ID</h3>
              <div className="flex gap-2">
                <Input
                  value={machineCode}
                  onChange={(e) => setMachineCode(e.target.value)}
                  placeholder="e.g. K3F9QZ2"
                  className="font-mono uppercase"
                />
                <Button onClick={handleInvite} disabled={!machineCode}>
                  Invite
                </Button>
              </div>
              {group.pendingInvites.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  {group.pendingInvites.map((inv) => (
                    <p key={inv.id}>
                      Pending: {inv.provider?.name} ({inv.provider?.machineCode})
                    </p>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!myMembership && group.visibility === "OPEN" && myGrouplessMachines.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="mb-2 text-sm font-medium">Join this group</h3>
              <div className="flex gap-2">
                <Select value={joinMachineId} onValueChange={setJoinMachineId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose one of your machines" />
                  </SelectTrigger>
                  <SelectContent>
                    {myGrouplessMachines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleJoin} disabled={!joinMachineId}>
                  Join
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { GroupDetailDialog } from "@/components/GroupDetailDialog";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Plus, Users } from "lucide-react";

export function GroupsTab() {
  const { user } = useAuth();
  const groups = usePolling(useCallback(() => api.listGroups(), []), 3000);
  const mine = usePolling(useCallback(() => (user ? api.listMyProviders() : Promise.resolve([])), [user]), 3000);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const groupList = groups.data ?? [];
  const myMachines = mine.data ?? [];
  const myGrouplessMachines = myMachines.filter((m) => !m.groupId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Co-op groups pool machines together for redundant job verification and split earnings.
        </p>
        {user && (
          <CreateGroupDialog
            myGrouplessMachines={myGrouplessMachines}
            onCreated={() => {}}
            trigger={
              <Button size="sm">
                <Plus /> Create group
              </Button>
            }
          />
        )}
      </div>

      {groupList.length === 0 && <p className="text-sm text-muted-foreground">No co-op groups yet.</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groupList.map((g) => (
          <Card key={g.id} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setSelectedGroupId(g.id)}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{g.name}</CardTitle>
                <Badge variant="outline">{g.visibility === "OPEN" ? "Open" : "Invite-only"}</Badge>
              </div>
              <CardDescription className="flex items-center gap-1">
                <Users className="size-3.5" /> {g.memberCount} machine{g.memberCount === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs">
              <p className="font-medium">
                ~{g.avgWeeklyEarningsPerMachine.toFixed(2)} credits/machine per week
              </p>
              <div className="flex flex-wrap gap-2 text-muted-foreground">
                {g.rule?.minReliability != null && <Badge variant="outline">reliability ≥ {(g.rule.minReliability * 100).toFixed(0)}%</Badge>}
                {g.rule?.minUptimePct != null && <Badge variant="outline">uptime ≥ {g.rule.minUptimePct}%</Badge>}
                {g.rule?.minCpuCores != null && <Badge variant="outline">{g.rule.minCpuCores}+ cores</Badge>}
                {g.rule?.minRamGb != null && <Badge variant="outline">{g.rule.minRamGb}+ GB RAM</Badge>}
                {!g.rule && <span>No join rules</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <GroupDetailDialog
        groupId={selectedGroupId}
        open={selectedGroupId !== null}
        onOpenChange={(open) => !open && setSelectedGroupId(null)}
        myMachines={myMachines}
        onChanged={() => {}}
      />
    </div>
  );
}

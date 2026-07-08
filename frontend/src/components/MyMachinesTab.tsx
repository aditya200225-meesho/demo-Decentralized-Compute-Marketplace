import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/ProviderCard";
import { RegisterProviderDialog } from "@/components/RegisterProviderDialog";
import { MyMachineDetailDialog } from "@/components/MyMachineDetailDialog";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { Cpu } from "lucide-react";

export function MyMachinesTab() {
  const mine = usePolling(useCallback(() => api.listMyProviders(), []), 2000);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const machines = mine.data ?? [];
  const selected = machines.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Machines you've registered. They don't show up in the public rental list — you can't rent your own hardware.
        </p>
        <RegisterProviderDialog
          onRegistered={() => {}}
          trigger={
            <Button size="sm">
              <Cpu /> Register a machine
            </Button>
          }
        />
      </div>

      {machines.length === 0 && (
        <p className="text-sm text-muted-foreground">You haven't registered any machines yet.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {machines.map((m) => (
          <ProviderCard key={m.id} provider={m} onClick={() => setSelectedId(m.id)} />
        ))}
      </div>

      <MyMachineDetailDialog
        provider={selected}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onChanged={() => {}}
      />
    </div>
  );
}

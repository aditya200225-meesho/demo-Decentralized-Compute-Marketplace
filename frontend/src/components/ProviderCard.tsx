import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProviderStatusBadge } from "@/components/StatusBadge";
import { Cpu, MemoryStick, Zap, Wifi, WifiOff, BatteryCharging, Battery, Thermometer, Users } from "lucide-react";
import type { Provider } from "@/lib/types";

export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{provider.name}</CardTitle>
          <ProviderStatusBadge status={provider.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Cpu className="size-3.5" /> {provider.cpuCores} cores
          </span>
          <span className="flex items-center gap-1">
            <MemoryStick className="size-3.5" /> {provider.ramGb} GB
          </span>
          {provider.hasGpu && (
            <span className="flex items-center gap-1">
              <Zap className="size-3.5" /> {provider.gpuModel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-muted-foreground">
          <span className="flex items-center gap-1" title="Idle-aware scheduling guardrails">
            {provider.isCharging ? <BatteryCharging className="size-3.5" /> : <Battery className="size-3.5" />}
            {provider.batteryPct}%
          </span>
          <span className="flex items-center gap-1">
            {provider.isOnWifi ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          </span>
          <span className="flex items-center gap-1">
            <Thermometer className="size-3.5" /> {provider.cpuTempC}°C
          </span>
          {provider.team && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {provider.team.name}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">reliability {(provider.reliabilityScore * 100).toFixed(0)}%</Badge>
            <span className="text-xs text-muted-foreground">
              {provider.jobsCompleted} done / {provider.jobsFailed} failed
            </span>
          </div>
          <span className="font-medium">{provider.creditBalance.toFixed(2)} cr</span>
        </div>
      </CardContent>
    </Card>
  );
}

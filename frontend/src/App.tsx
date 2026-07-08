import { useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProviderCard } from "@/components/ProviderCard";
import { JobCard } from "@/components/JobCard";
import { StatTile } from "@/components/StatTile";
import { SubmitJobDialog } from "@/components/SubmitJobDialog";
import { RegisterProviderDialog } from "@/components/RegisterProviderDialog";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { Cpu, Plus, Leaf } from "lucide-react";

function App() {
  const providers = usePolling(useCallback(() => api.listProviders(), []), 2000);
  const jobs = usePolling(useCallback(() => api.listJobs(), []), 1500);
  const templates = usePolling(useCallback(() => api.listTemplates(), []), 10000);

  const providerList = providers.data ?? [];
  const jobList = jobs.data ?? [];
  const templateList = templates.data ?? [];

  const onlineCount = providerList.filter((p) => p.status === "ONLINE" || p.status === "IDLE").length;
  const busyCount = providerList.filter((p) => p.status === "BUSY").length;
  const totalCredits = providerList.reduce((sum, p) => sum + p.creditBalance, 0);
  const totalCarbon = jobList.reduce((sum, j) => sum + (j.template?.estCarbonG ?? 0) * j.chunkCount, 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Idle Compute Co-op</h1>
        <p className="text-sm text-muted-foreground">
          Rent out idle laptops and desktops for small AI jobs, priced fairly by verified reliability.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Providers online" value={String(onlineCount)} hint={`${busyCount} currently working`} />
        <StatTile label="Jobs in flight" value={String(jobList.filter((j) => j.status === "RUNNING").length)} />
        <StatTile label="Credits earned (all providers)" value={totalCredits.toFixed(2)} />
        <StatTile label="Est. carbon so far" value={`${totalCarbon.toFixed(0)} g`} hint="CO2e, estimated" />
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Virtual providers simulate idle laptops/desktops in a college hostel co-op.
            </p>
            <RegisterProviderDialog
              onRegistered={() => {}}
              trigger={
                <Button size="sm">
                  <Cpu /> Register this machine
                </Button>
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providerList.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Jobs are matched, run, and redundantly verified across providers automatically.
            </p>
            <SubmitJobDialog
              templates={templateList}
              onSubmitted={() => {}}
              trigger={
                <Button size="sm">
                  <Plus /> Submit job
                </Button>
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {jobList.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
            {jobList.length === 0 && (
              <p className="text-sm text-muted-foreground">No jobs yet — submit one to see the marketplace work.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {templateList.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <Badge variant="outline">{t.basePrice.toFixed(2)} cr/chunk</Badge>
                  </div>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{t.minCpuCores}+ cores</span>
                  <span>{t.minRamGb}+ GB RAM</span>
                  {t.requiresGpu && <span>GPU required</span>}
                  <span className="flex items-center gap-1">
                    <Leaf className="size-3.5" /> ~{t.estCarbonG}g CO2e
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;

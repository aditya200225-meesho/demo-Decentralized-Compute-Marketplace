import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProviderCard } from "@/components/ProviderCard";
import { JobCard } from "@/components/JobCard";
import { StatTile } from "@/components/StatTile";
import { SubmitJobDialog } from "@/components/SubmitJobDialog";
import { AuthDialog } from "@/components/AuthDialog";
import { ProviderDetailDialog } from "@/components/ProviderDetailDialog";
import { JobDetailDialog } from "@/components/JobDetailDialog";
import { AssignmentsDashboard } from "@/components/AssignmentsDashboard";
import { MyMachinesTab } from "@/components/MyMachinesTab";
import { GroupsTab } from "@/components/GroupsTab";
import { NotificationsTab } from "@/components/NotificationsTab";
import { StorageTab } from "@/components/StorageTab";
import { LandingPage } from "@/components/LandingPage";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Plus, Leaf } from "lucide-react";

function App() {
  const { user, logout } = useAuth();
  const [entered, setEntered] = useState(false);
  const providers = usePolling(useCallback(() => api.listProviders(), []), 2000);
  const jobs = usePolling(useCallback(() => api.listJobs(), []), 1500);
  const templates = usePolling(useCallback(() => api.listTemplates(), []), 10000);

  const [activeTab, setActiveTab] = useState("providers");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const providerList = providers.data ?? [];
  const jobList = jobs.data ?? [];
  const templateList = templates.data ?? [];

  function openProvider(id: string) {
    setSelectedProviderId(id);
  }
  function openJob(id: string) {
    setSelectedJobId(id);
  }

  const onlineCount = providerList.filter((p) => p.status === "ONLINE" || p.status === "IDLE").length;
  const busyCount = providerList.filter((p) => p.status === "BUSY").length;
  const totalCredits = providerList.reduce((sum, p) => sum + p.creditBalance, 0);
  const totalCarbon = jobList.reduce((sum, j) => sum + (j.template?.estCarbonG ?? 0) * j.chunkCount, 0);

  if (!user && !entered) {
    return <LandingPage onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1
            className={!user ? "cursor-pointer text-2xl font-semibold" : "text-2xl font-semibold"}
            onClick={() => !user && setEntered(false)}
          >
            Idle Compute Co-op
          </h1>
          <p className="text-sm text-muted-foreground">
            Rent out idle laptops and desktops for small AI jobs, priced fairly by verified reliability.
          </p>
        </div>
        {user ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              signed in as <span className="font-medium text-foreground">{user.username}</span>
            </span>
            <Button size="sm" variant="outline" onClick={logout}>
              Log out
            </Button>
          </div>
        ) : (
          <AuthDialog trigger={<Button size="sm">Log in</Button>} />
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Providers online" value={String(onlineCount)} hint={`${busyCount} currently working`} />
        <StatTile label="Jobs in flight" value={String(jobList.filter((j) => j.status === "RUNNING").length)} />
        <StatTile label="Credits earned (all providers)" value={totalCredits.toFixed(2)} />
        <StatTile label="Est. carbon so far" value={`${totalCarbon.toFixed(0)} g`} hint="CO2e, estimated" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="mine">My Machines</TabsTrigger>
          <TabsTrigger value="groups">Co-op Groups</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Machines available to rent. Your own machines are hidden here — see "My Machines" instead.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providerList.map((p) => (
              <ProviderCard key={p.id} provider={p} onClick={() => openProvider(p.id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mine" className="flex flex-col gap-4">
          {user ? (
            <MyMachinesTab />
          ) : (
            <p className="text-sm text-muted-foreground">
              Log in to register a machine and see its jobs, uptime, and earnings.
            </p>
          )}
        </TabsContent>

        <TabsContent value="groups" className="flex flex-col gap-4">
          <GroupsTab />
        </TabsContent>

        <TabsContent value="jobs" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Jobs are matched and run automatically — solo on ungrouped machines, redundantly verified within co-op groups.
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
              <JobCard key={j.id} job={j} onClick={() => openJob(j.id)} />
            ))}
            {jobList.length === 0 && (
              <p className="text-sm text-muted-foreground">No jobs yet — submit one to see the marketplace work.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="flex flex-col gap-4">
          <AssignmentsDashboard onOpenJob={openJob} onOpenProvider={openProvider} />
        </TabsContent>

        <TabsContent value="storage" className="flex flex-col gap-4">
          <StorageTab onOpenJob={openJob} />
        </TabsContent>

        <TabsContent value="notifications" className="flex flex-col gap-4">
          {user ? (
            <NotificationsTab />
          ) : (
            <p className="text-sm text-muted-foreground">Log in to see co-op group invites and alerts.</p>
          )}
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

      <ProviderDetailDialog
        providerId={selectedProviderId}
        open={selectedProviderId !== null}
        onOpenChange={(open) => !open && setSelectedProviderId(null)}
      />
      <JobDetailDialog
        jobId={selectedJobId}
        open={selectedJobId !== null}
        onOpenChange={(open) => !open && setSelectedJobId(null)}
      />
    </div>
  );
}

export default App;

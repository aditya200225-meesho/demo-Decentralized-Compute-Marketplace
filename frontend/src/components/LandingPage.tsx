import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthDialog } from "@/components/AuthDialog";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import {
  Cpu,
  ShieldCheck,
  Users,
  Leaf,
  Lock,
  Wallet,
  BatteryCharging,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Redundant verification",
    description:
      "Co-op machines independently re-run each other's chunks and compare output hashes — a mismatch disputes the job and refunds escrow. No blind trust in a stranger's laptop.",
  },
  {
    icon: Users,
    title: "Co-op groups",
    description:
      "Pool your machine with others under admin/moderator roles and rule-gated membership (reliability, uptime, hardware). Open or invite-only, with a public directory showing expected weekly earnings.",
  },
  {
    icon: Wallet,
    title: "Reliability-based fair pay",
    description:
      "Not a pure auction — payout share scales with your machine's verified reliability score, so consistently honest machines earn more per job.",
  },
  {
    icon: BatteryCharging,
    title: "Idle-aware scheduling",
    description:
      "Machines only pick up work when genuinely idle — plugged in, on wifi, not overheating — so it never slows down what you're actually doing or drains your battery.",
  },
  {
    icon: Lock,
    title: "Privacy-preserving jobs",
    description:
      "Only outputs leave your machine, never raw data — jobs are designed so your hardware never has to expose what it processed.",
  },
  {
    icon: Leaf,
    title: "Carbon transparency",
    description:
      "Every job template shows its estimated carbon footprint up front, so requesters can see the real-world cost of the compute they're using.",
  },
];

const STEPS = [
  {
    title: "Register your machine",
    description: "Auto-detects your CPU/RAM and gives you a unique machine ID you can share for co-op invites.",
  },
  {
    title: "Run solo, or join a co-op",
    description: "Stay independent and run jobs on trust, or join a group for pooled, redundantly-verified work and shared earnings.",
  },
  {
    title: "Get matched, verified, and paid",
    description: "The scheduler matches idle machines to pending jobs automatically, verifies the result, and releases escrow straight to your credit balance.",
  },
];

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const providers = usePolling(useCallback(() => api.listProviders(), []), 3000);
  const stats = usePolling(useCallback(() => api.getDashboardStats(), []), 3000);

  const providerList = providers.data ?? [];
  const onlineCount = providerList.filter((p) => p.status === "ONLINE" || p.status === "IDLE").length;
  const s = stats.data;

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/60 to-background px-6 py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <Badge variant="outline" className="flex items-center gap-1.5">
            <Cpu className="size-3.5" /> everyday hardware, not GPU rigs
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Idle Compute Co-op</h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            Rent out idle laptops and desktops for small AI jobs — embeddings, inference, preprocessing, tiny
            fine-tunes — matched by hardware spec, priced fairly by a verified reliability score, and secured by
            redundant, co-op-based verification instead of blind trust.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <AuthDialog trigger={<Button size="lg">Get started</Button>} />
            <Button size="lg" variant="outline" onClick={onEnter}>
              Browse without an account <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{onlineCount}</span> machines online now
            </span>
            <span>
              <span className="font-semibold text-foreground">{s?.totalJobs ?? 0}</span> jobs run
            </span>
            <span>
              <span className="font-semibold text-foreground">{(s?.totalPaidOut ?? 0).toFixed(2)}</span> credits paid to providers
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">What makes this different</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vast.ai and Akash chase serious GPU rigs. This targets the laptop already sitting idle next to you.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="size-5 text-primary" />
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <h2 className="text-center text-2xl font-semibold">How it works</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center gap-2 text-center">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">Put your idle machine to work</h2>
          <p className="text-sm text-muted-foreground">
            Sign up, register a machine, and see it get matched to a job in seconds — or just browse the
            marketplace first.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <AuthDialog trigger={<Button size="lg">Create an account</Button>} />
            <Button size="lg" variant="outline" onClick={onEnter}>
              Explore the marketplace
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

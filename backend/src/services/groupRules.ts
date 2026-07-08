import type { GroupRule, Provider } from "../generated/prisma/client.ts";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export function computeUptimePct(provider: Pick<Provider, "onlineTicks" | "totalTicks">) {
  if (provider.totalTicks === 0) return 100;
  return (provider.onlineTicks / provider.totalTicks) * 100;
}

export function computeAvgJobsPerWeek(provider: Pick<Provider, "jobsCompleted" | "createdAt">) {
  const ageWeeks = Math.max((Date.now() - provider.createdAt.getTime()) / MS_PER_WEEK, 1 / 7);
  return provider.jobsCompleted / ageWeeks;
}

export function computeAccountAgeDays(provider: Pick<Provider, "createdAt">) {
  return (Date.now() - provider.createdAt.getTime()) / MS_PER_DAY;
}

/** Checks a machine against a co-op group's join rules. Every configured threshold must pass. */
export function evaluateGroupRules(
  provider: Pick<Provider, "reliabilityScore" | "jobsCompleted" | "cpuCores" | "ramGb" | "hasGpu" | "createdAt" | "onlineTicks" | "totalTicks">,
  rule: GroupRule | null
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!rule) return { passed: true, failures };

  if (rule.minReliability != null && provider.reliabilityScore < rule.minReliability) {
    failures.push(`reliability ${(provider.reliabilityScore * 100).toFixed(0)}% < required ${(rule.minReliability * 100).toFixed(0)}%`);
  }
  if (rule.minJobsCompleted != null && provider.jobsCompleted < rule.minJobsCompleted) {
    failures.push(`jobs completed ${provider.jobsCompleted} < required ${rule.minJobsCompleted}`);
  }
  if (rule.minCpuCores != null && provider.cpuCores < rule.minCpuCores) {
    failures.push(`CPU cores ${provider.cpuCores} < required ${rule.minCpuCores}`);
  }
  if (rule.minRamGb != null && provider.ramGb < rule.minRamGb) {
    failures.push(`RAM ${provider.ramGb}GB < required ${rule.minRamGb}GB`);
  }
  if (rule.requiresGpu && !provider.hasGpu) {
    failures.push("GPU required");
  }
  if (rule.minAccountAgeDays != null && computeAccountAgeDays(provider) < rule.minAccountAgeDays) {
    failures.push(`account age ${computeAccountAgeDays(provider).toFixed(1)}d < required ${rule.minAccountAgeDays}d`);
  }
  if (rule.minAvgJobsPerWeek != null && computeAvgJobsPerWeek(provider) < rule.minAvgJobsPerWeek) {
    failures.push(`avg jobs/week ${computeAvgJobsPerWeek(provider).toFixed(2)} < required ${rule.minAvgJobsPerWeek}`);
  }
  if (rule.minUptimePct != null && computeUptimePct(provider) < rule.minUptimePct) {
    failures.push(`uptime ${computeUptimePct(provider).toFixed(1)}% < required ${rule.minUptimePct}%`);
  }

  return { passed: failures.length === 0, failures };
}

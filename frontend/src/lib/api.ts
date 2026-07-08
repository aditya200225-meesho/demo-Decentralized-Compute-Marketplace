import type { Job, JobTemplate, Provider, Team } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  listProviders: () => request<Provider[]>("/providers"),
  getProvider: (id: string) => request<Provider>(`/providers/${id}`),
  registerProvider: (name: string, teamId?: string) =>
    request<Provider>("/providers/register", { method: "POST", body: JSON.stringify({ name, teamId }) }),
  listTemplates: () => request<JobTemplate[]>("/templates"),
  listJobs: () => request<Job[]>("/jobs"),
  getJob: (id: string) => request<Job>(`/jobs/${id}`),
  submitJob: (input: { requesterName: string; templateId: string; chunkCount: number; reliabilityMin?: number }) =>
    request<Job>("/jobs", { method: "POST", body: JSON.stringify(input) }),
  listTeams: () => request<Team[]>("/teams"),
  createTeam: (name: string) => request<Team>("/teams", { method: "POST", body: JSON.stringify({ name }) }),
};

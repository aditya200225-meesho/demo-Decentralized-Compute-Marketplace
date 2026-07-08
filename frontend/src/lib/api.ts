import type {
  AppNotification,
  CoopGroupDetail,
  CoopGroupSummary,
  DashboardStats,
  GroupInvite,
  GroupRuleInput,
  Job,
  JobChunk,
  JobTemplate,
  Provider,
  StorageObject,
  User,
} from "./types";
import { getToken } from "./authToken";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  register: (username: string, password: string) =>
    request<{ token: string; user: User }>("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),

  listProviders: () => request<Provider[]>("/providers"),
  getProvider: (id: string) => request<Provider>(`/providers/${id}`),
  listMyProviders: () => request<Provider[]>("/providers/mine"),
  registerProvider: (name: string) => request<Provider>("/providers/register", { method: "POST", body: JSON.stringify({ name }) }),
  setProviderStatus: (id: string, status: "ONLINE" | "IDLE" | "BUSY" | "OFFLINE") =>
    request<Provider>(`/providers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  listTemplates: () => request<JobTemplate[]>("/templates"),
  listJobs: () => request<Job[]>("/jobs"),
  getJob: (id: string) => request<Job>(`/jobs/${id}`),
  submitJob: (input: { requesterName: string; templateId: string; chunkCount: number; reliabilityMin?: number }) =>
    request<Job>("/jobs", { method: "POST", body: JSON.stringify(input) }),

  listAssignments: () => request<JobChunk[]>("/dashboard/assignments"),
  getDashboardStats: () => request<DashboardStats>("/dashboard/stats"),

  listGroups: () => request<CoopGroupSummary[]>("/groups"),
  getGroup: (id: string) => request<CoopGroupDetail>(`/groups/${id}`),
  createGroup: (input: { name: string; visibility: "OPEN" | "INVITE_ONLY"; founderProviderId: string; rules?: GroupRuleInput }) =>
    request<CoopGroupSummary>("/groups", { method: "POST", body: JSON.stringify(input) }),
  updateGroupRules: (groupId: string, rules: GroupRuleInput) =>
    request(`/groups/${groupId}/rules`, { method: "PATCH", body: JSON.stringify(rules) }),
  joinGroup: (groupId: string, providerId: string) =>
    request<{ joined: boolean }>(`/groups/${groupId}/join`, { method: "POST", body: JSON.stringify({ providerId }) }),
  leaveGroup: (groupId: string, providerId: string) =>
    request<void>(`/groups/${groupId}/leave`, { method: "POST", body: JSON.stringify({ providerId }) }),
  inviteToGroup: (groupId: string, machineCode: string) =>
    request<GroupInvite>(`/groups/${groupId}/invite`, { method: "POST", body: JSON.stringify({ machineCode }) }),
  setMemberRole: (groupId: string, providerId: string, role: "MODERATOR" | "MEMBER") =>
    request(`/groups/${groupId}/members/${providerId}/role`, { method: "POST", body: JSON.stringify({ role }) }),
  removeMember: (groupId: string, providerId: string) =>
    request<void>(`/groups/${groupId}/members/${providerId}/remove`, { method: "POST" }),
  respondToInvite: (inviteId: string, accept: boolean) =>
    request<{ accepted: boolean }>(`/invites/${inviteId}/respond`, { method: "POST", body: JSON.stringify({ accept }) }),

  listNotifications: () => request<AppNotification[]>("/notifications"),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: "POST" }),

  listStorage: () => request<StorageObject[]>("/storage"),
  storageDownloadUrl: (id: string) => `/api/storage/${id}/download`,
};

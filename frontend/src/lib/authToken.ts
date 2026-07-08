const STORAGE_KEY = "idle-compute-coop:token";

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(STORAGE_KEY, token);
  else localStorage.removeItem(STORAGE_KEY);
}

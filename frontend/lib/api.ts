/**
 * API client for the Django backend.
 *
 * Auth model: JWT (access + refresh). Tokens live in localStorage.
 * Trade-off: localStorage is XSS-readable. For a take-home demo this is the
 * pragmatic choice; for prod we'd use httpOnly cookies set by a Next.js
 * route handler that proxies token endpoints. Called out in README.
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const ACCESS_KEY = "screeniq.access";
const REFRESH_KEY = "screeniq.refresh";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string, refresh: string) {
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function refreshToken(): Promise<string | null> {
  const refresh = window.localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  const res = await fetch(`${BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = await res.json();
  window.localStorage.setItem(ACCESS_KEY, data.access);
  return data.access;
}

/** Fetch wrapper that injects auth and transparently retries once on 401. */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status !== 401) return res;

  const newToken = await refreshToken();
  if (!newToken) return res;
  headers.set("Authorization", `Bearer ${newToken}`);
  res = await fetch(`${BASE}${path}`, { ...init, headers });
  return res;
}

export async function login(
  username: string,
  password: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  setTokens(data.access, data.refresh);
}

export interface ApplicationListRow {
  id: number;
  candidate_name: string;
  ai_score: string | null; // DRF DecimalField → string
  created_at: string;
}

export interface ApplicationDetail extends ApplicationListRow {
  job_description: string;
  resume: string;
  ai_reasons: string[];
  ai_provider: string;
  ai_model: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function listApplications(
  page: number,
  pageSize = 25,
): Promise<PaginatedResponse<ApplicationListRow>> {
  const res = await apiFetch(
    `/api/applications/?page=${page}&page_size=${pageSize}`,
  );
  if (!res.ok) throw new Error(`Failed to load applications: ${res.status}`);
  return res.json();
}

export async function getApplication(
  id: number,
): Promise<ApplicationDetail> {
  const res = await apiFetch(`/api/applications/${id}/`);
  if (!res.ok) throw new Error(`Failed to load application: ${res.status}`);
  return res.json();
}

export const API_BASE = BASE;

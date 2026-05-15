import type { Scan, ScanOptions, HealthReport, ReportFormats, User } from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `API ${res.status}`;
    try {
      const parsed = JSON.parse(body);
      msg = parsed.message || parsed.error || body || msg;
    } catch {
      if (body) msg = body;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ── auth ──────────────────────────────────────────────────── */

export async function getMe(): Promise<User | null> {
  try {
    const data = await request<{ user: User }>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: User; token: string }> {
  return request<{ user: User; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  name: string,
  password: string,
): Promise<{ user: User; token: string }> {
  return request<{ user: User; token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, name, password }),
  });
}

export async function logout(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST" });
}

export interface TestAuthResult {
  success: boolean;
  cookies?: number;
  cookieHeader?: string;
  createdAt?: string;
  message: string;
  error?: string;
}

export async function testAuth(
  loginUrl: string,
  username: string,
  password: string,
  extra?: {
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
    postLoginWaitMs?: number;
    successUrlContains?: string;
  },
): Promise<TestAuthResult> {
  return request<TestAuthResult>("/auth/test-login", {
    method: "POST",
    body: JSON.stringify({ loginUrl, username, password, ...extra }),
  });
}

/* ── scans ──────────────────────────────────────────────────── */

export async function createScan(
  url: string,
  options?: Partial<ScanOptions>,
): Promise<Scan> {
  return request<Scan>("/scan", {
    method: "POST",
    body: JSON.stringify({ url, options }),
  });
}

export async function getScan(id: string): Promise<Scan> {
  return request<Scan>(`/scan/${id}`);
}

export async function listScans(page = 1, limit = 20): Promise<Scan[]> {
  return request<Scan[]>(`/scans?page=${page}&limit=${limit}`);
}

export async function cancelScan(id: string): Promise<void> {
  await request<void>(`/scan/${id}`, { method: "DELETE" });
}

export async function deleteScan(id: string): Promise<void> {
  await request<void>(`/scans/${id}`, { method: "DELETE" });
}

export async function deleteAllScans(): Promise<{ deleted: number }> {
  return request<{ deleted: number }>("/scans", { method: "DELETE" });
}

/* ── health ─────────────────────────────────────────────────── */

export async function getHealth(): Promise<HealthReport> {
  return request<HealthReport>("/health");
}

/* ── audit logs ────────────────────────────────────────────── */

export interface AuditLogEntry {
  id: string;
  scanId: string;
  phase: string;
  step: number;
  message: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  createdAt: string;
}

export async function getAuditLogs(
  scanId: string,
): Promise<{ scanId: string; logs: AuditLogEntry[] }> {
  return request<{ scanId: string; logs: AuditLogEntry[] }>(`/scan/${scanId}/audit`);
}

/* ── reports ────────────────────────────────────────────────── */

export async function getReportFormats(scanId: string): Promise<ReportFormats> {
  return request<ReportFormats>(`/reports/${scanId}`);
}

export function getReportDownloadUrl(scanId: string, format: string): string {
  return `${BASE}/reports/${scanId}/download?format=${format}`;
}

/* ── scanner logs ──────────────────────────────────────────── */

export interface ScannerLogEntry {
  timestamp: string;
  phase: string;
  message: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  details?: Record<string, any>;
  durationMs?: number;
}

export interface ScannerLog {
  scanId: string;
  targetUrl: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  entries: ScannerLogEntry[];
}

export async function getScannerLog(
  scanId: string,
): Promise<ScannerLog> {
  return request<ScannerLog>(`/scanner-logs/${scanId}`);
}

export async function regenerateReport(
  scanId: string,
  formats: string[] = ["html", "json", "pdf"],
): Promise<ReportFormats> {
  const fmtParam = formats.join(",");
  await request<unknown>(`/reports/${scanId}/regenerate?formats=${fmtParam}`);
  return request<ReportFormats>(`/reports/${scanId}`);
}


/* ── api keys ─────────────────────────────────────────────── */

export interface ApiKeyEntry {
  id: string;
  name: string;
  key?: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

export async function listApiKeys(): Promise<ApiKeyEntry[]> {
  return request<ApiKeyEntry[]>("/api-keys");
}

export async function createApiKey(
  name: string,
): Promise<ApiKeyEntry> {
  return request<ApiKeyEntry>("/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(
  id: string,
): Promise<void> {
  await request<void>(`/api-keys/${id}`, {
    method: "DELETE",
  });
}
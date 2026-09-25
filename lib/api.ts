export type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: { message: string }[];
};

const TOKEN_KEY = 'pm-admin-token';
const REFRESH_KEY = 'pm-admin-refresh';
const ACTIVITY_KEY = 'pm-admin-activity';

/** Sign out only after the portal has had no use for this long. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_WRITE_MS = 15_000;
const ACCESS_REFRESH_SKEW_MS = 60_000;

export class SessionExpiredError extends Error {
  constructor() {
    super('Signed out after 30 minutes of inactivity.');
    this.name = 'SessionExpiredError';
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

function getRefresh() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

function setRefresh(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(REFRESH_KEY, token);
  else window.localStorage.removeItem(REFRESH_KEY);
}

export function hasSession() {
  return Boolean(getToken() || getRefresh());
}

export function clearSession() {
  setToken(null);
  setRefresh(null);
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVITY_KEY);
}

export function saveSession(tokens: { access: string; refresh?: string }) {
  setToken(tokens.access);
  if (tokens.refresh) setRefresh(tokens.refresh);
  touchActivity();
}

let lastActivityWrite = 0;

export function touchActivity() {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastActivityWrite < ACTIVITY_WRITE_MS) return;
  lastActivityWrite = now;
  window.localStorage.setItem(ACTIVITY_KEY, String(now));
}

export function isSessionIdle() {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(ACTIVITY_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at >= IDLE_TIMEOUT_MS;
}

function jwtExpMs(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function accessIsFresh(token: string) {
  const exp = jwtExpMs(token);
  if (exp == null) return true;
  return exp - Date.now() > ACCESS_REFRESH_SKEW_MS;
}

let refreshInflight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    const refresh = getRefresh();
    if (!refresh) return null;
    const res = await fetch(apiUrl('/api/v1/auth/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
      cache: 'no-store',
    });
    const text = await res.text();
    let body: Envelope<AuthPayload> | null = null;
    try {
      body = JSON.parse(text) as Envelope<AuthPayload>;
    } catch {
      body = null;
    }
    if (!res.ok || !body?.success || !body.data?.tokens?.access) {
      if (res.status === 401 || res.status === 403) clearSession();
      return null;
    }
    setToken(body.data.tokens.access);
    if (body.data.tokens.refresh) setRefresh(body.data.tokens.refresh);
    return body.data.tokens.access;
  })().finally(() => {
    refreshInflight = null;
  });
  return refreshInflight;
}

async function ensureAccessToken(): Promise<string | null> {
  if (isSessionIdle()) {
    clearSession();
    throw new SessionExpiredError();
  }
  const current = getToken();
  if (current && accessIsFresh(current)) return current;
  if (!getRefresh()) return current;
  return (await refreshAccessToken()) ?? getToken();
}

export async function logoutSession() {
  const refresh = getRefresh();
  clearSession();
  if (!refresh || typeof window === 'undefined') return;
  try {
    await fetch(apiUrl('/api/v1/auth/logout/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
      cache: 'no-store',
    });
  } catch {
    // Local session is already cleared.
  }
}

function backendOrigin(): string {
  return (process.env.BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
}

export function frontendOrigin(): string {
  return (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function mediaSrc(path: string) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/media/')) return path;
  return `${frontendOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

function withTrailingSlash(url: string): string {
  const [pathname, query] = url.split('?');
  if (!pathname || pathname.endsWith('/')) return url;
  return query ? `${pathname}/?${query}` : `${pathname}/`;
}

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return withTrailingSlash(path);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  // Same-origin Next proxy in the browser — avoids CORS to Django.
  if (typeof window !== 'undefined') {
    return withTrailingSlash(suffix);
  }
  return withTrailingSlash(`${backendOrigin()}${suffix}`);
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: Envelope<T>;
  try {
    body = JSON.parse(text) as Envelope<T>;
  } catch {
    throw new Error(`Could not reach the backend at ${backendOrigin()}. Check BACKEND_URL in admin/.env.`);
  }
  if (!res.ok || !body.success) {
    throw new Error(body.message || body.errors?.[0]?.message || 'Request failed');
  }
  return body.data;
}

async function authorizedFetch(path: string, init?: RequestInit, allowRefresh = true): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const skipAuth = headers.get('Authorization') === '';
  if (skipAuth) headers.delete('Authorization');
  else if (!headers.has('Authorization')) {
    const token = allowRefresh ? await ensureAccessToken() : getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(apiUrl(path), { ...init, headers, cache: 'no-store' });
  if (res.status !== 401 || skipAuth) return res;
  if (!allowRefresh || isSessionIdle() || !getRefresh()) {
    clearSession();
    return res;
  }
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    clearSession();
    return res;
  }
  headers.set('Authorization', `Bearer ${refreshed}`);
  return fetch(apiUrl(path), { ...init, headers, cache: 'no-store' });
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authorizedFetch(path, init);
  return parseEnvelope<T>(res);
}

export type AdminUser = { email: string; is_leads_admin?: boolean };
export type AuthPayload = { user: AdminUser; tokens: { access: string; refresh?: string } };

export function login(email: string, password: string) {
  return api<AuthPayload>('/api/v1/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { Authorization: '' },
  });
}

export type EarlyAccess = {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  platforms: string[];
  created_at: string;
};
export type Contact = {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  message: string;
  created_at: string;
};
export type Newsletter = {
  id: string;
  name: string;
  email: string;
  status: string;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
};

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string; id: string }
  | { type: 'h3'; text: string; id: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export type AdminBlog = {
  id: string;
  number: number;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  image: string;
  publishedAt: string;
  blocks: BlogBlock[];
  wordCount: number;
  readMinutes: number;
  author: string;
  isPublished: boolean;
};

export type BlogPayload = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  image: string;
  publishedAt: string;
  author: string;
  blocks: BlogBlock[];
  isPublished: boolean;
  number?: number;
};

export function listEarlyAccess() {
  return api<EarlyAccess[]>(`/api/v1/admin-portal/early-access/?t=${Date.now()}`);
}
export function listContact() {
  return api<Contact[]>(`/api/v1/admin-portal/contact/?t=${Date.now()}`);
}
export function listNewsletters(status: 'subscribed' | 'unsubscribed') {
  return api<Newsletter[]>(`/api/v1/admin-portal/newsletters/?status=${status}&t=${Date.now()}`);
}

export function deleteEarlyAccess(id: string) {
  return api<null>(`/api/v1/admin-portal/early-access/${id}/`, { method: 'DELETE' });
}

export function deleteContact(id: string) {
  return api<null>(`/api/v1/admin-portal/contact/${id}/`, { method: 'DELETE' });
}

export function deleteNewsletter(id: string) {
  return api<null>(`/api/v1/admin-portal/newsletters/${id}/`, { method: 'DELETE' });
}

export function listBlogs() {
  return api<AdminBlog[]>(`/api/v1/admin-portal/blogs/?t=${Date.now()}`);
}

export function getBlog(id: string) {
  return api<AdminBlog>(`/api/v1/admin-portal/blogs/${id}/?t=${Date.now()}`);
}

export function createBlog(payload: BlogPayload) {
  return api<AdminBlog>('/api/v1/admin-portal/blogs/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBlog(id: string, payload: BlogPayload) {
  return api<AdminBlog>(`/api/v1/admin-portal/blogs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteBlog(id: string) {
  return api<null>(`/api/v1/admin-portal/blogs/${id}/`, { method: 'DELETE' });
}

export async function uploadBlogImage(file: File) {
  const body = new FormData();
  body.append('image', file);
  const res = await authorizedFetch('/api/v1/admin-portal/blogs/upload/', {
    method: 'POST',
    body,
  });
  return parseEnvelope<{ url: string }>(res);
}

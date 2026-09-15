export type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: { message: string }[];
};

const TOKEN_KEY = 'pm-admin-token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

function backendOrigin(): string {
  return (process.env.BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
}

function withTrailingSlash(url: string): string {
  const [pathname, query] = url.split('?');
  if (!pathname || pathname.endsWith('/')) return url;
  return query ? `${pathname}/?${query}` : `${pathname}/`;
}

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return withTrailingSlash(path);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return withTrailingSlash(`${backendOrigin()}${suffix}`);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (headers.get('Authorization') === '') {
    headers.delete('Authorization');
  }
  const res = await fetch(apiUrl(path), { ...init, headers, cache: 'no-store' });
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

export type AdminUser = { email: string; is_leads_admin?: boolean };
export type AuthPayload = { user: AdminUser; tokens: { access: string } };

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

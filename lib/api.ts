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

function withTrailingSlash(url: string): string {
  const [pathname, query] = url.split('?');
  if (!pathname || pathname.endsWith('/')) return url;
  return query ? `${pathname}/?${query}` : `${pathname}/`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(withTrailingSlash(path), { ...init, headers, cache: 'no-store' });
  const text = await res.text();
  let body: Envelope<T>;
  try {
    body = JSON.parse(text) as Envelope<T>;
  } catch {
    throw new Error('Could not reach the admin API. Is Django running on port 8000?');
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

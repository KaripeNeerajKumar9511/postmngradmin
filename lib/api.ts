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
  return parseEnvelope<T>(res);
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
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const body = new FormData();
  body.append('image', file);
  const res = await fetch(apiUrl('/api/v1/admin-portal/blogs/upload/'), {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });
  return parseEnvelope<{ url: string }>(res);
}

import { api } from './api';

export type SiteLink = { label: string; href: string; platform?: string };

export type SiteSettings = {
  paymentsEnabled: boolean;
  trialDays: number;
  copyright: string;
  loginLabel: string;
  ctaLabel: string;
  ctaHref: string;
  nav: SiteLink[];
  platforms: SiteLink[];
  footer: SiteLink[];
  newsletter: {
    kicker?: string;
    title?: string;
    subtitle?: string;
    button?: string;
    fine?: string;
    popupTitle?: string;
    items?: string[];
  };
  stripeConfigured?: boolean;
};

export type SitePlan = {
  id: string;
  key: string;
  name: string;
  tag: string;
  subtitle: string;
  monthlyCents: number;
  annualCents: number;
  monthlyLabel: string;
  annualLabel: string;
  features: string[];
  highlighted: boolean;
  stripeReady: boolean;
};

export type SitePageSummary = {
  id: string;
  path: string;
  name: string;
  template: string;
  metaTitle: string;
  isPublished: boolean;
  isSystem: boolean;
  group?: string;
};

export type SitePage = SitePageSummary & {
  metaDescription: string;
  robots: string;
  content: Record<string, unknown>;
};

export function getSiteSettings() {
  return api<SiteSettings>('/api/v1/admin-portal/site/settings/');
}
export function saveSiteSettings(body: SiteSettings) {
  return api<SiteSettings>('/api/v1/admin-portal/site/settings/', { method: 'PATCH', body: JSON.stringify(body) });
}
export function listSitePages() {
  return api<SitePageSummary[]>('/api/v1/admin-portal/site/pages/');
}
export function getSitePage(id: string) {
  return api<SitePage>(`/api/v1/admin-portal/site/pages/${id}/`);
}
export function createSitePage(body: {
  name: string;
  path: string;
  group: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
}) {
  return api<SitePage>('/api/v1/admin-portal/site/pages/', { method: 'POST', body: JSON.stringify(body) });
}
export function saveSitePage(id: string, body: Partial<SitePage>) {
  return api<SitePage>(`/api/v1/admin-portal/site/pages/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
}
export function deleteSitePage(id: string) {
  return api<null>(`/api/v1/admin-portal/site/pages/${id}/`, { method: 'DELETE' });
}
export function listPlans() {
  return api<{ paymentsEnabled: boolean; trialDays: number; stripeConfigured: boolean; plans: SitePlan[] }>(
    '/api/v1/admin-portal/site/plans/',
  );
}
export function savePlan(id: string, body: Partial<SitePlan>) {
  return api<SitePlan>(`/api/v1/admin-portal/site/plans/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
}

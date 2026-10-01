export type PageGroupId = 'home' | 'product' | 'platform' | 'for' | 'compare' | 'other';

export const PAGE_GROUPS: {
  id: Exclude<PageGroupId, 'other'>;
  title: string;
  hint: string;
  canAdd: boolean;
  prefix: string;
  placeholder: string;
}[] = [
  {
    id: 'home',
    title: 'Home',
    hint: 'These pages are part of the site. Edit the words. You cannot add another page here.',
    canAdd: false,
    prefix: '',
    placeholder: '',
  },
  {
    id: 'product',
    title: 'Product',
    hint: 'The main product page, plus extra pages at /product/…',
    canAdd: true,
    prefix: '/product/',
    placeholder: 'agencies',
  },
  {
    id: 'platform',
    title: 'Platforms',
    hint: 'One page per network. The address is a single name, like /tiktok.',
    canAdd: true,
    prefix: '/',
    placeholder: 'tiktok',
  },
  {
    id: 'for',
    title: 'For',
    hint: 'Audience pages. The address always starts with /for/.',
    canAdd: true,
    prefix: '/for/',
    placeholder: 'agencies',
  },
  {
    id: 'compare',
    title: 'Comparisons',
    hint: 'Comparison pages. The address always starts with /vs/.',
    canAdd: true,
    prefix: '/vs/',
    placeholder: 'sprout-social',
  },
];

const HOME_PATHS = new Set([
  '/',
  '/how-it-works',
  '/pricing',
  '/contact',
  '/privacy',
  '/terms',
  '/early-access',
  '/login',
  '/signup',
  '/coupon',
]);

export function pageGroup(path: string): PageGroupId {
  const value = path.startsWith('/') ? path : `/${path}`;
  if (HOME_PATHS.has(value)) return 'home';
  if (value === '/product' || value.startsWith('/product/')) return 'product';
  if (value.startsWith('/for/')) return 'for';
  if (value.startsWith('/vs/')) return 'compare';
  if (value.split('/').length === 2 && value !== '/for' && value !== '/vs') return 'platform';
  return 'other';
}

export function groupOf(page: { group?: string; path: string }): PageGroupId {
  const known: PageGroupId[] = ['home', 'product', 'platform', 'for', 'compare', 'other'];
  if (page.group && known.includes(page.group as PageGroupId)) return page.group as PageGroupId;
  return pageGroup(page.path);
}

export function findGroup(id: string) {
  return PAGE_GROUPS.find((group) => group.id === id);
}

export function cleanSlug(raw: string, trimEnd = false): string {
  let slug = raw.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-/, '');
  if (trimEnd) slug = slug.replace(/-+$/, '');
  return slug;
}

export function pathFromSlug(group: string, slug: string): string {
  const clean = cleanSlug(slug);
  if (group === 'product') return `/product/${clean}`;
  if (group === 'for') return `/for/${clean}`;
  if (group === 'compare') return `/vs/${clean}`;
  if (group === 'platform') return `/${clean}`;
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function slugFromPath(group: string, path: string): string {
  if (group === 'product' && path.startsWith('/product/')) return path.slice('/product/'.length);
  if (group === 'for' && path.startsWith('/for/')) return path.slice('/for/'.length);
  if (group === 'compare' && path.startsWith('/vs/')) return path.slice('/vs/'.length);
  if (group === 'platform' && path.startsWith('/')) return path.slice(1);
  return path.replace(/^\//, '');
}

export type PageLink = { label: string; href: string; group: 'Platform' | 'Site' };

export const PAGE_LINKS: PageLink[] = [
  { group: 'Platform', label: 'LinkedIn', href: '/linkedin' },
  { group: 'Platform', label: 'X', href: '/x' },
  { group: 'Platform', label: 'Instagram', href: '/instagram' },
  { group: 'Platform', label: 'Facebook', href: '/facebook' },
  { group: 'Platform', label: 'Reddit', href: '/reddit' },
  { group: 'Site', label: 'Product', href: '/product' },
  { group: 'Site', label: 'How it works', href: '/how-it-works' },
  { group: 'Site', label: 'Pricing', href: '/pricing' },
  { group: 'Site', label: 'Blogs', href: '/blogs' },
  { group: 'Site', label: 'For founders', href: '/for/founders' },
  { group: 'Site', label: 'LinkedIn lead generation', href: '/for/linkedin-lead-generation' },
  { group: 'Site', label: 'Personal branding', href: '/for/personal-branding' },
];

export const PAGE_BY_HREF = Object.fromEntries(PAGE_LINKS.map((item) => [item.href, item]));

const LINK_RE = /\[([^\]]+)\]\((\/[^\s)]+)\)/g;

export type TextLink = { label: string; href: string; start: number; end: number };

export function listTextLinks(text: string): TextLink[] {
  const links: TextLink[] = [];
  const pattern = new RegExp(LINK_RE.source, 'g');
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    links.push({
      label: match[1],
      href: match[2],
      start,
      end: start + match[0].length,
    });
  }
  return links;
}

export function wrapSelection(text: string, start: number, end: number, href: string): string | null {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  if (from === to) return null;
  const selected = text.slice(from, to);
  if (!selected.trim()) return null;
  const inner = selected.replace(/^\[/, '').replace(/\]\([^)]*\)$/, '');
  return `${text.slice(0, from)}[${inner}](${href})${text.slice(to)}`;
}

export function wrapBold(text: string, start: number, end: number): string | null {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  if (from === to) return null;
  const selected = text.slice(from, to);
  if (!selected.trim()) return null;
  if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
    return `${text.slice(0, from)}${selected.slice(2, -2)}${text.slice(to)}`;
  }
  if (from >= 2 && text.slice(from - 2, from) === '**' && text.slice(to, to + 2) === '**') {
    return `${text.slice(0, from - 2)}${selected}${text.slice(to + 2)}`;
  }
  const inner = selected.replace(/^\*\*/, '').replace(/\*\*$/, '');
  return `${text.slice(0, from)}**${inner}**${text.slice(to)}`;
}

export function removeTextLink(text: string, target: TextLink): string {
  return `${text.slice(0, target.start)}${target.label}${text.slice(target.end)}`;
}

export function pageLabel(href: string): string {
  return PAGE_BY_HREF[href]?.label ?? href;
}

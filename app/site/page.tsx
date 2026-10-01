'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { hasSession, isSessionIdle, SessionExpiredError } from '@/lib/api';
import { PAGE_GROUPS, groupOf, type PageGroupId } from '@/lib/pageGroups';
import { listSitePages, type SitePageSummary } from '@/lib/site';

export default function SitePages() {
  const router = useRouter();
  const [pages, setPages] = useState<SitePageSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSession() || isSessionIdle()) {
      router.replace('/login');
      return;
    }
    void listSitePages()
      .then(setPages)
      .catch((err: unknown) => {
        if (err instanceof SessionExpiredError) router.replace('/login');
        else setError(err instanceof Error ? err.message : 'Could not load pages.');
      })
      .finally(() => setLoaded(true));
  }, [router]);

  const grouped = new Map<PageGroupId, SitePageSummary[]>();
  for (const page of pages) {
    const id = groupOf(page);
    grouped.set(id, [...(grouped.get(id) || []), page]);
  }
  const other = grouped.get('other') || [];

  return (
    <AdminShell>
      <div className="top">
        <div>
          <h1>Site pages</h1>
          <p className="muted">Edit the public site before someone logs in. The layout stays the same. You change the words.</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <nav className="seg" aria-label="Page groups">
        {PAGE_GROUPS.map((group) => (
          <a key={group.id} href={`#${group.id}`}>
            {group.title}
          </a>
        ))}
      </nav>
      {!loaded ? <p className="muted">Loading pages…</p> : null}
      {loaded && pages.length === 0 ? <p className="muted">No pages yet. Run the site seed, then refresh.</p> : null}
      {PAGE_GROUPS.map((group) => {
        const rows = grouped.get(group.id) || [];
        return (
          <section className="page-group" id={group.id} key={group.id}>
            <div className="top">
              <div>
                <h2>{group.title}</h2>
                <p className="muted">{group.hint}</p>
              </div>
              {group.canAdd ? (
                <Link className="btn btn-inline" href={`/site/pages/new/${group.id}`}>
                  New page
                </Link>
              ) : null}
            </div>
            <PageTable pages={rows} empty={loaded ? (group.canAdd ? 'No extra pages yet.' : 'No pages in this group.') : ''} />
          </section>
        );
      })}
      {other.length > 0 ? (
        <section className="page-group" id="other">
          <h2>Other</h2>
          <p className="muted">These addresses do not belong to a group. Edit them here.</p>
          <PageTable pages={other} empty="" />
        </section>
      ) : null}
    </AdminShell>
  );
}

function PageTable({ pages, empty }: { pages: SitePageSummary[]; empty: string }) {
  if (pages.length === 0) {
    return empty ? <p className="muted">{empty}</p> : null;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th>Address</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id}>
              <td>{page.name}</td>
              <td>{page.path}</td>
              <td>{page.isPublished ? 'Visible' : 'Hidden'}</td>
              <td>
                <Link href={`/site/pages/${page.id}`}>Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

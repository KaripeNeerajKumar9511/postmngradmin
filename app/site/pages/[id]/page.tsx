'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { ContentFields } from '@/components/ContentFields';
import { hasSession, isSessionIdle } from '@/lib/api';
import { cleanSlug, findGroup, groupOf, pathFromSlug, slugFromPath } from '@/lib/pageGroups';
import { deleteSitePage, getSitePage, saveSitePage, type SitePage } from '@/lib/site';

export default function EditSitePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<SitePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasSession() || isSessionIdle()) {
      router.replace('/login');
      return;
    }
    void getSitePage(params.id)
      .then(setPage)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not open that page.'));
  }, [params.id, router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!page) return;
    const group = findGroup(groupOf(page));
    const next = { ...page };
    if (!page.isSystem && group?.canAdd) {
      next.path = pathFromSlug(group.id, cleanSlug(slugFromPath(group.id, page.path), true));
    }
    setSaving(true);
    setError(null);
    setNote(null);
    try {
      const saved = await saveSitePage(page.id, next);
      setPage(saved);
      setNote('Saved. The public site updates within a few seconds.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!page || page.isSystem) return;
    if (!window.confirm(`Delete ${page.name}?`)) return;
    await deleteSitePage(page.id);
    router.push('/site');
  };

  return (
    <AdminShell>
      <div className="top">
        <div>
          <h1>{page?.name || 'Page'}</h1>
          <p className="muted">
            <Link href="/site">All pages</Link>
            {page ? ` · ${page.path}` : ''}
          </p>
        </div>
        {page && !page.isSystem ? (
          <button className="danger" type="button" onClick={() => void remove()}>
            Delete page
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {note ? <p className="ok">{note}</p> : null}
      {!page ? <p className="muted">Loading…</p> : null}
      {page ? (
        <form onSubmit={(event) => void onSubmit(event)}>
          <div className="editor-card">
            <h2>Page details</h2>
            <div className="grid-2">
              <div className="field">
                <label>Name in admin</label>
                <input value={page.name} onChange={(event) => setPage({ ...page, name: event.target.value })} />
              </div>
              <AddressField page={page} onChange={(path) => setPage({ ...page, path })} />
            </div>
            <div className="field">
              <label>Search title</label>
              <input value={page.metaTitle} onChange={(event) => setPage({ ...page, metaTitle: event.target.value })} />
            </div>
            <div className="field">
              <label>Search description</label>
              <textarea rows={3} value={page.metaDescription} onChange={(event) => setPage({ ...page, metaDescription: event.target.value })} />
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={page.isPublished}
                onChange={(event) => setPage({ ...page, isPublished: event.target.checked })}
              />
              Visible on the site
            </label>
          </div>
          <div className="editor-card">
            <h2>Page content</h2>
            <ContentFields value={page.content} onChange={(content) => setPage({ ...page, content: content as SitePage['content'] })} />
          </div>
          <button className="btn btn-inline" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save page'}
          </button>
        </form>
      ) : null}
    </AdminShell>
  );
}

function AddressField({ page, onChange }: { page: SitePage; onChange: (path: string) => void }) {
  const group = findGroup(groupOf(page));
  if (page.isSystem || !group?.canAdd) {
    return (
      <div className="field">
        <label>Address</label>
        <input value={page.path} disabled />
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor="page-address">Address</label>
      <div className="address-row">
        <span className="address-prefix">{group.prefix}</span>
        <input
          id="page-address"
          value={slugFromPath(group.id, page.path)}
          onChange={(event) => onChange(pathFromSlug(group.id, cleanSlug(event.target.value)))}
        />
      </div>
    </div>
  );
}

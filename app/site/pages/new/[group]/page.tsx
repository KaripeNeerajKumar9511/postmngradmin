'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { cleanSlug, findGroup, pathFromSlug } from '@/lib/pageGroups';
import { createSitePage } from '@/lib/site';

export default function NewSitePage() {
  const params = useParams<{ group: string }>();
  const group = findGroup(params.group);
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!group) return;
    const path = pathFromSlug(group.id, cleanSlug(slug, true));
    if (path.endsWith('/') || path === '/') {
      setError('Add the last part of the address.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const page = await createSitePage({
        name,
        path,
        group: group.id,
        metaTitle: name,
        metaDescription: description,
        isPublished: false,
      });
      router.push(`/site/pages/${page.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the page.');
      setSaving(false);
    }
  };

  if (!group || !group.canAdd) {
    return (
      <AdminShell>
        <h1>New page</h1>
        <p className="muted">
          New pages can be added in Product, Platforms, For, and Comparisons. <Link href="/site">Back to site pages</Link>
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1>New {group.title.toLowerCase()} page</h1>
      <p className="muted">
        <Link href={`/site#${group.id}`}>{group.title}</Link>
        {' · '}
        {group.hint} The page starts hidden. Publish it when it looks right.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <form onSubmit={(event) => void onSubmit(event)} style={{ maxWidth: 560 }}>
        <div className="field">
          <label htmlFor="name">Page name</label>
          <input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="slug">Address</label>
          <div className="address-row">
            <span className="address-prefix">{group.prefix}</span>
            <input
              id="slug"
              value={slug}
              onChange={(event) => setSlug(cleanSlug(event.target.value))}
              placeholder={group.placeholder}
              required
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="description">Search description</label>
          <textarea id="description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} required />
        </div>
        <button className="btn btn-inline" type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create page'}
        </button>
      </form>
    </AdminShell>
  );
}

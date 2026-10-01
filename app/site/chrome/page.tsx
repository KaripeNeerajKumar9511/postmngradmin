'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { hasSession, isSessionIdle } from '@/lib/api';
import { getSiteSettings, saveSiteSettings, type SiteLink, type SiteSettings } from '@/lib/site';

function LinkEditor({
  title,
  hint,
  links,
  withPlatform,
  onChange,
}: {
  title: string;
  hint: string;
  links: SiteLink[];
  withPlatform?: boolean;
  onChange: (links: SiteLink[]) => void;
}) {
  const update = (index: number, patch: Partial<SiteLink>) => {
    onChange(links.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };
  return (
    <div className="editor-card">
      <h2>{title}</h2>
      <p className="muted">{hint}</p>
      {links.map((link, index) => (
        <div className="grid-2" key={`${link.href}-${index}`}>
          <div className="field">
            <label>Label</label>
            <input value={link.label} onChange={(event) => update(index, { label: event.target.value })} />
          </div>
          <div className="field">
            <label>Link</label>
            <input value={link.href} onChange={(event) => update(index, { href: event.target.value })} />
          </div>
          {withPlatform ? (
            <div className="field">
              <label>Icon</label>
              <input value={link.platform || ''} onChange={(event) => update(index, { platform: event.target.value })} placeholder="linkedin" />
            </div>
          ) : null}
          <div className="field">
            <button className="danger" type="button" onClick={() => onChange(links.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button className="btn btn-inline" type="button" onClick={() => onChange([...links, { label: '', href: '/' }])}>
        Add link
      </button>
    </div>
  );
}

export default function ChromePage() {
  const router = useRouter();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasSession() || isSessionIdle()) {
      router.replace('/login');
      return;
    }
    void getSiteSettings()
      .then(setSite)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the header.'));
  }, [router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!site) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSiteSettings(site);
      setSite(saved);
      setNote('Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const news = site?.newsletter ?? {};

  return (
    <AdminShell>
      <h1>Header, footer, and newsletter</h1>
      <p className="muted">These show on every public page. Change a label here and it updates across the site.</p>
      {error ? <p className="error">{error}</p> : null}
      {note ? <p className="ok">{note}</p> : null}
      {!site ? <p className="muted">Loading…</p> : null}
      {site ? (
        <form onSubmit={(event) => void onSubmit(event)}>
          <div className="editor-card">
            <h2>Buttons</h2>
            <div className="grid-2">
              <div className="field">
                <label>Log in label</label>
                <input value={site.loginLabel} onChange={(event) => setSite({ ...site, loginLabel: event.target.value })} />
              </div>
              <div className="field">
                <label>Main button label</label>
                <input value={site.ctaLabel} onChange={(event) => setSite({ ...site, ctaLabel: event.target.value })} />
              </div>
              <div className="field">
                <label>Main button link</label>
                <input value={site.ctaHref} onChange={(event) => setSite({ ...site, ctaHref: event.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Copyright line</label>
              <textarea rows={2} value={site.copyright} onChange={(event) => setSite({ ...site, copyright: event.target.value })} />
            </div>
          </div>
          <LinkEditor title="Header links" hint="Shown beside the logo. Platform links stay in their own menu." links={site.nav} onChange={(nav) => setSite({ ...site, nav })} />
          <LinkEditor
            title="Platform menu"
            hint="Use linkedin, x, instagram, facebook, or reddit for the icon."
            links={site.platforms}
            withPlatform
            onChange={(platforms) => setSite({ ...site, platforms })}
          />
          <LinkEditor title="Footer links" hint="Shown at the bottom of every page." links={site.footer} onChange={(footer) => setSite({ ...site, footer })} />
          <div className="editor-card">
            <h2>Newsletter bar</h2>
            <div className="field">
              <label>Small label</label>
              <input value={news.kicker || ''} onChange={(event) => setSite({ ...site, newsletter: { ...news, kicker: event.target.value } })} />
            </div>
            <div className="field">
              <label>Headline</label>
              <input value={news.title || ''} onChange={(event) => setSite({ ...site, newsletter: { ...news, title: event.target.value } })} />
            </div>
            <div className="field">
              <label>Supporting line</label>
              <textarea rows={2} value={news.subtitle || ''} onChange={(event) => setSite({ ...site, newsletter: { ...news, subtitle: event.target.value } })} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Button</label>
                <input value={news.button || ''} onChange={(event) => setSite({ ...site, newsletter: { ...news, button: event.target.value } })} />
              </div>
              <div className="field">
                <label>Fine print</label>
                <input value={news.fine || ''} onChange={(event) => setSite({ ...site, newsletter: { ...news, fine: event.target.value } })} />
              </div>
            </div>
            <div className="field">
              <label>Popup title</label>
              <input value={news.popupTitle || ''} onChange={(event) => setSite({ ...site, newsletter: { ...news, popupTitle: event.target.value } })} />
            </div>
            <div className="field">
              <label>Popup items, one per line</label>
              <textarea
                rows={5}
                value={(news.items || []).join('\n')}
                onChange={(event) => setSite({ ...site, newsletter: { ...news, items: event.target.value.split('\n') } })}
              />
            </div>
          </div>
          <button className="btn btn-inline" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      ) : null}
    </AdminShell>
  );
}

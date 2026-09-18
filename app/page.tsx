'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import {
  deleteContact,
  deleteEarlyAccess,
  deleteNewsletter,
  getToken,
  listContact,
  listEarlyAccess,
  listNewsletters,
  setToken,
  type Contact,
  type EarlyAccess,
  type Newsletter,
} from '@/lib/api';

const PLATFORMS: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  reddit: 'Reddit',
};

type Tab = 'early-access' | 'contact' | 'newsletter';

function when(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdminHome() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('early-access');
  const [news, setNews] = useState<'subscribed' | 'unsubscribed'>('subscribed');
  const [early, setEarly] = useState<EarlyAccess[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [subscribed, setSubscribed] = useState<Newsletter[]>([]);
  const [unsubscribed, setUnsubscribed] = useState<Newsletter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [waitlist, messages, on, off] = await Promise.all([
          listEarlyAccess(),
          listContact(),
          listNewsletters('subscribed'),
          listNewsletters('unsubscribed'),
        ]);
        if (cancelled) return;
        setEarly(waitlist);
        setContacts(messages);
        setSubscribed(on);
        setUnsubscribed(off);
      } catch (err) {
        if (!cancelled) {
          setToken(null);
          setError(err instanceof Error ? err.message : 'Could not load admin data.');
          router.replace('/login');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const rows = news === 'subscribed' ? subscribed : unsubscribed;

  const remove = async (kind: Tab, id: string, label: string) => {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setError(null);
    setDeleting(id);
    try {
      if (kind === 'early-access') {
        await deleteEarlyAccess(id);
        setEarly((items) => items.filter((item) => item.id !== id));
      } else if (kind === 'contact') {
        await deleteContact(id);
        setContacts((items) => items.filter((item) => item.id !== id));
      } else {
        await deleteNewsletter(id);
        setSubscribed((items) => items.filter((item) => item.id !== id));
        setUnsubscribed((items) => items.filter((item) => item.id !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that record.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminShell>
      <div className="top">
        <div>
          <h1>Requests</h1>
          <p className="muted">Early access, contact, and newsletter lists.</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="seg">
        <button type="button" className={tab === 'early-access' ? 'is-on' : undefined} onClick={() => setTab('early-access')}>
          Early access ({early.length})
        </button>
        <button type="button" className={tab === 'contact' ? 'is-on' : undefined} onClick={() => setTab('contact')}>
          Contact ({contacts.length})
        </button>
        <button type="button" className={tab === 'newsletter' ? 'is-on' : undefined} onClick={() => setTab('newsletter')}>
          Newsletter ({subscribed.length})
        </button>
      </div>
      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && tab === 'early-access' ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Platforms</th>
                <th>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {early.length === 0 ? (
                <tr>
                  <td colSpan={6}>No early access requests yet.</td>
                </tr>
              ) : (
                early.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.phone_number}</td>
                    <td>{row.platforms.map((id) => PLATFORMS[id] ?? id).join(', ')}</td>
                    <td>{when(row.created_at)}</td>
                    <td>
                      <button
                        className="danger"
                        type="button"
                        disabled={deleting === row.id}
                        onClick={() => void remove('early-access', row.id, row.email)}
                      >
                        {deleting === row.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading && tab === 'contact' ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Message</th>
                <th>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6}>No contact messages yet.</td>
                </tr>
              ) : (
                contacts.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.phone_number}</td>
                    <td>{row.message}</td>
                    <td>{when(row.created_at)}</td>
                    <td>
                      <button
                        className="danger"
                        type="button"
                        disabled={deleting === row.id}
                        onClick={() => void remove('contact', row.id, row.email)}
                      >
                        {deleting === row.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading && tab === 'newsletter' ? (
        <>
          <div className="seg">
            <button type="button" className={news === 'subscribed' ? 'is-on' : undefined} onClick={() => setNews('subscribed')}>
              Subscribed ({subscribed.length})
            </button>
            <button type="button" className={news === 'unsubscribed' ? 'is-on' : undefined} onClick={() => setNews('unsubscribed')}>
              Unsubscribed ({unsubscribed.length})
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No people in this list yet.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>{row.status}</td>
                      <td>
                        {when(
                          news === 'subscribed'
                            ? row.subscribed_at || row.created_at
                            : row.unsubscribed_at || row.created_at,
                        )}
                      </td>
                      <td>
                        <button
                          className="danger"
                          type="button"
                          disabled={deleting === row.id}
                          onClick={() => void remove('newsletter', row.id, row.email)}
                        >
                          {deleting === row.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}

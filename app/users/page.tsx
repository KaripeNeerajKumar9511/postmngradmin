'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import {
  deleteUser,
  hasSession,
  isSessionIdle,
  listUsers,
  SessionExpiredError,
  type PortalUser,
} from '@/lib/api';

function when(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function fullName(user: PortalUser) {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || '—';
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSession() || isSessionIdle()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await listUsers();
        if (!cancelled) setUsers(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof SessionExpiredError || !hasSession()) {
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load users.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const remove = async (user: PortalUser) => {
    if (!window.confirm(`Delete ${user.email}? They will no longer be able to sign in.`)) return;
    setError(null);
    setDeleting(user.id);
    try {
      await deleteUser(user.id);
      setUsers((items) => items.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that user.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminShell>
      <div className="top">
        <div>
          <h1>Users</h1>
          <p className="muted">Accounts that can sign in to PostMngr.</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      {!loading ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Organization</th>
                <th>Timezone</th>
                <th>Verified</th>
                <th>Active</th>
                <th>Onboarding</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={10}>No users yet.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{fullName(user)}</td>
                    <td>{user.email}</td>
                    <td>{user.phone_number || '—'}</td>
                    <td>{user.organization || '—'}</td>
                    <td>{user.default_timezone || '—'}</td>
                    <td>{user.is_email_verified ? 'Yes' : 'No'}</td>
                    <td>{user.is_active ? 'Yes' : 'No'}</td>
                    <td>{user.onboarding_complete ? 'Complete' : 'In progress'}</td>
                    <td>{when(user.date_joined)}</td>
                    <td>
                      {user.is_leads_admin ? (
                        <span className="muted">Admin</span>
                      ) : (
                        <button
                          className="danger"
                          type="button"
                          disabled={deleting === user.id}
                          onClick={() => void remove(user)}
                        >
                          {deleting === user.id ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminShell>
  );
}

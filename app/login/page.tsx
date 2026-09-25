'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, login, saveSession } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.user.is_leads_admin) {
        clearSession();
        setError('This account is not in ADMIN_EMAILS.');
        return;
      }
      saveSession(result.tokens);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="brand" style={{ marginBottom: '1rem' }}>
        postmngr admin
      </div>
      <h1>Log in</h1>
      <p className="muted">Use an email listed in ADMIN_EMAILS (and its password from .env).</p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

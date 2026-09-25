'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, hasSession, isSessionIdle, logoutSession, touchActivity } from '@/lib/api';

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasSession() || isSessionIdle()) {
      clearSession();
      router.replace('/login');
      return;
    }
    touchActivity();
    const mark = () => touchActivity();
    const events = ['pointerdown', 'keydown', 'scroll', 'mousemove'] as const;
    events.forEach((name) => window.addEventListener(name, mark, { passive: true }));
    const timer = window.setInterval(() => {
      if (!isSessionIdle()) return;
      clearSession();
      router.replace('/login');
    }, 15_000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, mark));
      window.clearInterval(timer);
    };
  }, [router]);

  const blogsOn = pathname.startsWith('/blogs');

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          postmngr admin
        </Link>
        <nav>
          <Link href="/" className={!blogsOn ? 'is-on' : undefined}>
            Requests
          </Link>
          <Link href="/blogs" className={blogsOn ? 'is-on' : undefined}>
            Blogs
          </Link>
        </nav>
        <button
          className="link sidebar-out"
          type="button"
          onClick={() => {
            void logoutSession();
            router.replace('/login');
          }}
        >
          Log out
        </button>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}

'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, setToken } from '@/lib/api';

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
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
            setToken(null);
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

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { BlogEditor } from '@/components/BlogEditor';
import { getBlog, hasSession, isSessionIdle, SessionExpiredError, updateBlog, type AdminBlog } from '@/lib/api';

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<AdminBlog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hasSession() || isSessionIdle()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await getBlog(params.id);
        if (!cancelled) setPost(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof SessionExpiredError || !hasSession()) {
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load that blog.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  return (
    <AdminShell>
      <div className="top">
        <div>
          <h1>Edit blog</h1>
          <p className="muted">{post ? `/blogs/${post.slug}` : 'Loading the post…'}</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {saved ? <p className="ok">Saved. The public blog page uses this content, SEO, and image.</p> : null}
      {post ? (
        <BlogEditor
          key={post.id}
          submitLabel="Save changes"
          initial={post}
          onSubmit={async (payload) => {
            setSaved(false);
            const next = await updateBlog(post.id, payload);
            setPost(next);
            setSaved(true);
          }}
        />
      ) : (
        <p className="muted">Loading…</p>
      )}
    </AdminShell>
  );
}

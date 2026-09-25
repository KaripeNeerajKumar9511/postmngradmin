'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { deleteBlog, hasSession, isSessionIdle, listBlogs, mediaSrc, SessionExpiredError, type AdminBlog } from '@/lib/api';

export default function BlogsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<AdminBlog[]>([]);
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
        const data = await listBlogs();
        if (!cancelled) setPosts(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof SessionExpiredError || !hasSession()) {
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load blogs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const remove = async (post: AdminBlog) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setDeleting(post.id);
    setError(null);
    try {
      await deleteBlog(post.id);
      setPosts((items) => items.filter((item) => item.id !== post.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that blog.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminShell>
      <div className="top">
        <div>
          <h1>Blogs</h1>
          <p className="muted">All marketing posts. Edit any existing article or add one in the same structure.</p>
        </div>
        <Link className="btn btn-inline" href="/blogs/new">
          Add a blog
        </Link>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      {!loading ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Post</th>
                <th>SEO</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={5}>No blogs yet. Add the first one.</td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.number}</td>
                    <td>
                      <div className="blog-row">
                        {post.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaSrc(post.image)} alt="" />
                        ) : null}
                        <div>
                          <strong>{post.title}</strong>
                          <div className="muted" style={{ margin: '0.2rem 0 0' }}>
                            /blogs/{post.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{post.metaTitle}</div>
                      <div className="muted" style={{ margin: '0.2rem 0 0' }}>
                        {post.readMinutes} min · {post.wordCount} words
                      </div>
                    </td>
                    <td>{post.isPublished ? 'Published' : 'Draft'}</td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/blogs/${post.id}`}>Edit</Link>
                        <button
                          className="danger"
                          type="button"
                          disabled={deleting === post.id}
                          onClick={() => void remove(post)}
                        >
                          {deleting === post.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
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

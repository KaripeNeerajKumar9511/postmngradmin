'use client';

import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { BlogEditor } from '@/components/BlogEditor';
import { createBlog } from '@/lib/api';

export default function NewBlogPage() {
  const router = useRouter();
  return (
    <AdminShell>
      <div className="top">
        <div>
          <h1>Add a blog</h1>
          <p className="muted">Same fields as live posts: title, slug, meta/SEO, image, tables, lists, and FAQ blocks.</p>
        </div>
      </div>
      <BlogEditor
        submitLabel="Publish blog"
        onSubmit={async (payload) => {
          const created = await createBlog(payload);
          router.replace(`/blogs/${created.id}`);
        }}
      />
    </AdminShell>
  );
}

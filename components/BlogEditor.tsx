'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ContentFormatBar, ContentLinkChips, ContentLinkScope, LinkableField } from '@/components/LinkedTextField';
import {
  mediaSrc,
  uploadBlogImage,
  type BlogBlock,
  type BlogPayload,
} from '@/lib/api';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function headingId(text: string) {
  return slugify(text) || 'section';
}

function emptyParagraph(): BlogBlock {
  return { type: 'p', text: '' };
}

type Props = {
  initial?: Partial<BlogPayload> & { number?: number };
  submitLabel: string;
  onSubmit: (payload: BlogPayload) => Promise<void>;
};

export function BlogEditor({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugLocked, setSlugLocked] = useState(Boolean(initial?.slug));
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? '');
  const [keywords, setKeywords] = useState(initial?.keywords ?? '');
  const [image, setImage] = useState(initial?.image ?? '');
  const [publishedAt, setPublishedAt] = useState(initial?.publishedAt ?? new Date().toISOString().slice(0, 10));
  const [author, setAuthor] = useState(initial?.author ?? 'PostMngr Team');
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [number, setNumber] = useState(initial?.number ? String(initial.number) : '');
  const [blocks, setBlocks] = useState<BlogBlock[]>(
    initial?.blocks?.length ? initial.blocks : [emptyParagraph()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const preview = useMemo(() => mediaSrc(image), [image]);

  const setBlock = (index: number, next: BlogBlock) => {
    setBlocks((items) => items.map((item, i) => (i === index ? next : item)));
  };

  const move = (index: number, dir: -1 | 1) => {
    setBlocks((items) => {
      const next = [...items];
      const target = index + dir;
      if (target < 0 || target >= next.length) return items;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const remove = (index: number) => {
    setBlocks((items) => (items.length === 1 ? items : items.filter((_, i) => i !== index)));
  };

  const add = (block: BlogBlock, after?: number) => {
    setBlocks((items) => {
      const copy = [...items];
      const at = after == null ? copy.length : after + 1;
      copy.splice(at, 0, block);
      return copy;
    });
  };

  const onTitle = (value: string) => {
    setTitle(value);
    if (!slugLocked) setSlug(slugify(value));
    if (!metaTitle || metaTitle === title) setMetaTitle(value);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const result = await uploadBlogImage(file);
      setImage(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that image.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: BlogPayload = {
        title: title.trim(),
        slug: slugify(slug) || slugify(title),
        metaTitle: metaTitle.trim() || title.trim(),
        metaDescription: metaDescription.trim(),
        keywords: keywords.trim(),
        image: image.trim(),
        publishedAt,
        author: author.trim() || 'PostMngr Team',
        isPublished,
        blocks: blocks.map((block) => {
          if (block.type === 'h2' || block.type === 'h3') {
            return { ...block, id: block.id || headingId(block.text) };
          }
          return block;
        }),
      };
      if (number.trim()) payload.number = Number(number);
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this blog.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="blog-form" onSubmit={submit}>
      {error ? <p className="error">{error}</p> : null}
      <section className="editor-card">
        <h2>Post</h2>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" required minLength={4} value={title} onChange={(e) => onTitle(e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="slug">Slug (URL)</label>
            <input
              id="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugLocked(true);
                setSlug(e.target.value);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="number">Order number</label>
            <input id="number" type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Auto" />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="publishedAt">Published date</label>
            <input id="publishedAt" type="date" required value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="author">Author</label>
            <input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published on the site
        </label>
      </section>

      <section className="editor-card">
        <h2>SEO / meta</h2>
        <div className="field">
          <label htmlFor="metaTitle">Meta title</label>
          <input id="metaTitle" required minLength={4} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="metaDescription">Meta description</label>
          <textarea
            id="metaDescription"
            required
            minLength={20}
            rows={3}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="keywords">Keywords</label>
          <input
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Comma-separated, same as other blogs"
          />
        </div>
      </section>

      <section className="editor-card">
        <h2>Feature image</h2>
        <div className="field">
          <label htmlFor="image">Image path or upload</label>
          <input id="image" required value={image} onChange={(e) => setImage(e.target.value)} placeholder="/Blog_imgs/Blog1.png" />
        </div>
        <div className="field">
          <label htmlFor="file">Upload image</label>
          <input
            id="file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {uploading ? <p className="muted">Uploading…</p> : null}
        </div>
        {preview ? (
          <div className="img-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" />
          </div>
        ) : null}
      </section>

      <section className="editor-card editor-blocks">
        <div className="block-add-bar">
          <div className="card-head">
            <h2>Content blocks</h2>
            <p className="muted" style={{ margin: 0 }}>
              Same structure as live blogs: lead paragraph, H2/H3, lists, tables, and FAQ as H2 + H3 + paragraph.
            </p>
          </div>
          <div className="block-add">
            <button type="button" onClick={() => add({ type: 'p', text: '' })}>
              + Paragraph
            </button>
            <button type="button" onClick={() => add({ type: 'h2', text: '', id: '' })}>
              + H2
            </button>
            <button type="button" onClick={() => add({ type: 'h3', text: '', id: '' })}>
              + H3
            </button>
            <button type="button" onClick={() => add({ type: 'ul', items: [''] })}>
              + List
            </button>
            <button
              type="button"
              onClick={() => add({ type: 'table', headers: ['Column 1', 'Column 2'], rows: [['', '']] })}
            >
              + Table
            </button>
            <button
              type="button"
              onClick={() => {
                add({ type: 'h2', text: 'Frequently Asked Questions', id: 'frequently-asked-questions' });
                add({ type: 'h3', text: '', id: '' });
                add({ type: 'p', text: '' });
              }}
            >
              + FAQ section
            </button>
          </div>
        </div>
        {blocks.map((block, index) => {
          const isList = block.type === 'ul' || block.type === 'ol';
          const sources =
            block.type === 'p' || block.type === 'h2' || block.type === 'h3'
              ? [{ text: block.text, onChange: (text: string) => setBlock(index, { ...block, text, ...(block.type === 'p' ? {} : { id: headingId(text) }) }) }]
              : isList
                ? block.items.map((item, itemIndex) => ({
                    text: item,
                    onChange: (text: string) => {
                      const items = [...block.items];
                      items[itemIndex] = text;
                      setBlock(index, { ...block, items });
                    },
                  }))
                : [
                    ...block.headers.map((header, headerIndex) => ({
                      text: header,
                      onChange: (text: string) => {
                        const headers = [...block.headers];
                        headers[headerIndex] = text;
                        setBlock(index, { ...block, headers });
                      },
                    })),
                    ...block.rows.flatMap((row, rowIndex) =>
                      row.map((cell, colIndex) => ({
                        text: cell,
                        onChange: (text: string) => {
                          const rows = block.rows.map((item) => [...item]);
                          rows[rowIndex][colIndex] = text;
                          setBlock(index, { ...block, rows });
                        },
                      })),
                    ),
                  ];
          return (
          <ContentLinkScope key={`${block.type}-${index}`}>
          <div className="block">
            <div className="block-bar">
              <strong>
                {block.type === 'p'
                  ? 'Paragraph'
                  : block.type === 'h2'
                    ? 'Heading 2'
                    : block.type === 'h3'
                      ? 'Heading 3'
                      : isList
                        ? 'List'
                        : 'Table'}
              </strong>
              <span className="block-bar-actions">
                {(block.type === 'p' || isList || block.type === 'table') ? <ContentFormatBar /> : null}
                <button type="button" onClick={() => move(index, -1)}>
                  Up
                </button>
                <button type="button" onClick={() => move(index, 1)}>
                  Down
                </button>
                <button type="button" className="danger" onClick={() => remove(index)}>
                  Remove
                </button>
              </span>
            </div>
            {isList ? (
              <div className="list-style" role="group" aria-label="List style">
                <button
                  type="button"
                  className={block.type === 'ul' ? 'is-on' : undefined}
                  onClick={() => setBlock(index, { type: 'ul', items: block.items })}
                >
                  Bullet list
                </button>
                <button
                  type="button"
                  className={block.type === 'ol' ? 'is-on' : undefined}
                  onClick={() => setBlock(index, { type: 'ol', items: block.items })}
                >
                  Numbered list
                </button>
              </div>
            ) : null}
            <ContentLinkChips sources={sources} />
            {block.type === 'p' ? (
              <LinkableField
                multiline
                rows={12}
                className="para-input"
                value={block.text}
                onChange={(text) => setBlock(index, { ...block, text })}
              />
            ) : null}
            {block.type === 'h2' || block.type === 'h3' ? (
              <div className="grid-2">
                <LinkableField
                  value={block.text}
                  placeholder="Heading text"
                  onChange={(text) => setBlock(index, { ...block, text, id: headingId(text) })}
                />
                <input
                  value={block.id}
                  placeholder="Anchor id"
                  onChange={(e) => setBlock(index, { ...block, id: slugify(e.target.value) })}
                />
              </div>
            ) : null}
            {isList ? (
              <div className="list-editor">
                {block.items.map((item, itemIndex) => (
                  <div className="list-row" key={itemIndex}>
                    <span className="list-index" aria-hidden="true">
                      {block.type === 'ol' ? `${itemIndex + 1}.` : '•'}
                    </span>
                    <LinkableField
                      value={item}
                      onChange={(text) => {
                        const items = [...block.items];
                        items[itemIndex] = text;
                        setBlock(index, { ...block, items });
                      }}
                    />
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        setBlock(index, { ...block, items: block.items.filter((_, i) => i !== itemIndex) })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setBlock(index, { ...block, items: [...block.items, ''] })}>
                  Add list item
                </button>
              </div>
            ) : null}
            {block.type === 'table' ? (
              <TableEditor block={block} onChange={(next) => setBlock(index, next)} />
            ) : null}
          </div>
          </ContentLinkScope>
          );
        })}
      </section>

      <button className="btn btn-wide" type="submit" disabled={saving || uploading}>
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function TableEditor({
  block,
  onChange,
}: {
  block: Extract<BlogBlock, { type: 'table' }>;
  onChange: (block: Extract<BlogBlock, { type: 'table' }>) => void;
}) {
  const setHeader = (index: number, value: string) => {
    const headers = [...block.headers];
    headers[index] = value;
    onChange({ ...block, headers });
  };
  const setCell = (row: number, col: number, value: string) => {
    const rows = block.rows.map((item) => [...item]);
    rows[row][col] = value;
    onChange({ ...block, rows });
  };
  const addCol = () => {
    onChange({
      type: 'table',
      headers: [...block.headers, `Column ${block.headers.length + 1}`],
      rows: block.rows.map((row) => [...row, '']),
    });
  };
  const addRow = () => {
    onChange({ ...block, rows: [...block.rows, block.headers.map(() => '')] });
  };
  const removeCol = (index: number) => {
    if (block.headers.length <= 1) return;
    onChange({
      type: 'table',
      headers: block.headers.filter((_, i) => i !== index),
      rows: block.rows.map((row) => row.filter((_, i) => i !== index)),
    });
  };
  const removeRow = (index: number) => {
    if (block.rows.length <= 1) return;
    onChange({ ...block, rows: block.rows.filter((_, i) => i !== index) });
  };

  return (
    <div className="table-editor">
      <div className="table-actions">
        <button type="button" onClick={addCol}>
          Add column
        </button>
        <button type="button" onClick={addRow}>
          Add row
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {block.headers.map((header, i) => (
                <th key={i}>
                  <LinkableField value={header} onChange={(text) => setHeader(i, text)} />
                  <button type="button" className="danger" onClick={() => removeCol(i)}>
                    Remove column
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {block.headers.map((_, ci) => (
                  <td key={ci}>
                    <LinkableField value={row[ci] ?? ''} onChange={(text) => setCell(ri, ci, text)} />
                  </td>
                ))}
                <td>
                  <button type="button" className="danger" onClick={() => removeRow(ri)}>
                    Remove row
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

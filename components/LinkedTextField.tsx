'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  listTextLinks,
  PAGE_LINKS,
  pageLabel,
  removeTextLink,
  wrapBold,
  wrapSelection,
} from '@/lib/pageLinks';

type FocusedField = {
  value: string;
  onChange: (value: string) => void;
  start: number;
  end: number;
};

type LinkSource = {
  text: string;
  onChange: (value: string) => void;
};

const LinkScopeContext = createContext<{
  capture: (field: FocusedField) => void;
  focused: () => FocusedField | null;
} | null>(null);

export function ContentLinkScope({ children }: { children: ReactNode }) {
  const focused = useRef<FocusedField | null>(null);
  return (
    <LinkScopeContext.Provider
      value={{
        capture: (field) => {
          focused.current = field;
        },
        focused: () => focused.current,
      }}
    >
      {children}
    </LinkScopeContext.Provider>
  );
}

export function ContentFormatBar() {
  const scope = useContext(LinkScopeContext);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const applyMark = (kind: 'bold' | 'link', href?: string) => {
    const field = scope?.focused();
    if (!field) {
      setHint('Select text in this box first.');
      return;
    }
    const next =
      kind === 'bold'
        ? wrapBold(field.value, field.start, field.end)
        : wrapSelection(field.value, field.start, field.end, href || '');
    if (!next) {
      setHint('Select text in this box first.');
      return;
    }
    field.onChange(next);
    setHint(null);
    setOpen(false);
  };

  return (
    <div className="block-link">
      <button
        className="btn-format"
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setHint(null);
          applyMark('bold');
        }}
      >
        Bold
      </button>
      <div className="link-menu" ref={menuRef}>
        <button
          className="btn-link"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setHint(null);
            setOpen((current) => !current);
          }}
        >
          Link
        </button>
        {open ? (
          <div className="link-dropdown" role="menu">
            <p className="link-group">Platform pages</p>
            {PAGE_LINKS.filter((item) => item.group === 'Platform').map((item) => (
              <button
                key={item.href}
                type="button"
                role="menuitem"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyMark('link', item.href)}
              >
                {item.label}
              </button>
            ))}
            <p className="link-group">Other pages</p>
            {PAGE_LINKS.filter((item) => item.group === 'Site').map((item) => (
              <button
                key={item.href}
                type="button"
                role="menuitem"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyMark('link', item.href)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {hint ? <span className="error" style={{ margin: 0 }}>{hint}</span> : null}
    </div>
  );
}

export function ContentLinkChips({ sources }: { sources: LinkSource[] }) {
  const chips = sources.flatMap((source, sourceIndex) =>
    listTextLinks(source.text).map((link) => ({ source, sourceIndex, link })),
  );
  if (!chips.length) return null;
  return (
    <ul className="link-chips">
      {chips.map((item) => (
        <li key={`${item.sourceIndex}-${item.link.start}-${item.link.href}`}>
          <strong>{item.link.label}</strong>
          <span>→ {pageLabel(item.link.href)}</span>
          <button type="button" className="danger" onClick={() => item.source.onChange(removeTextLink(item.source.text, item.link))}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LinkableField({
  value,
  onChange,
  multiline = false,
  rows = 4,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const scope = useContext(LinkScopeContext);
  const fieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const capture = () => {
    const el = fieldRef.current;
    if (!el || !scope) return;
    scope.capture({
      value,
      onChange,
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    });
  };

  const shared = {
    value,
    placeholder,
    onChange: (event: { target: { value: string } }) => {
      onChange(event.target.value);
      const el = fieldRef.current;
      scope?.capture({
        value: event.target.value,
        onChange,
        start: el?.selectionStart ?? event.target.value.length,
        end: el?.selectionEnd ?? event.target.value.length,
      });
    },
    onSelect: capture,
    onKeyUp: capture,
    onClick: capture,
    onFocus: capture,
  };

  if (multiline) {
    return (
      <textarea
        className={['link-input', className].filter(Boolean).join(' ')}
        {...shared}
        rows={rows}
        ref={(node) => {
          fieldRef.current = node;
        }}
      />
    );
  }
  return (
    <input
      className="link-input"
      {...shared}
      ref={(node) => {
        fieldRef.current = node;
      }}
    />
  );
}

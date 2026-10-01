'use client';

const LABELS: Record<string, string> = {
  h1: 'Headline',
  lead: 'Intro',
  title: 'Title',
  body: 'Text',
  hint: 'Supporting text',
  note: 'Small note',
  label: 'Small label',
  q: 'Question',
  a: 'Answer',
  name: 'Name',
  text: 'Text',
  href: 'Link',
  email: 'Email',
  items: 'Items',
  faqs: 'Questions',
  steps: 'Steps',
  goals: 'Goals',
  benefits: 'Benefits',
  features: 'Features',
  sections: 'Sections',
  blocks: 'Sections',
  primaryLabel: 'Button label',
  primaryHref: 'Button link',
  secondaryLabel: 'Second button label',
  secondaryHref: 'Second button link',
  cta: 'Closing section',
  hero: 'Top of the page',
  week: 'Week example',
  learn: 'Learning example',
  review: 'Review example',
  aside: 'Note under the section',
  subtitle: 'Short description',
  panelLabel: 'Panel title',
  panelNote: 'Panel note',
  copyright: 'Copyright line',
};

function labelFor(key: string) {
  if (LABELS[key]) return LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function isLong(value: string) {
  return value.length > 80 || value.includes('\n');
}

export function ContentFields({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  return <Node value={value} onChange={onChange} />;
}

function Node({ value, onChange, name }: { value: unknown; onChange: (next: unknown) => void; name?: string }) {
  if (typeof value === 'string') {
    const long = isLong(value) || name === 'lead' || name === 'a' || name === 'body' || name === 'hint' || name === 'text';
    return long ? (
      <textarea rows={name === 'a' || name === 'lead' ? 4 : 2} value={value} onChange={(event) => onChange(event.target.value)} />
    ) : (
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    );
  }
  if (typeof value === 'number') {
    return <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />;
  }
  if (typeof value === 'boolean') {
    return (
      <label className="check">
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
        {value ? 'Yes' : 'No'}
      </label>
    );
  }
  if (Array.isArray(value)) {
    const strings = value.every((item) => typeof item === 'string');
    return (
      <div>
        {value.map((item, index) => (
          <div className="block" key={index}>
            <div className="block-bar">
              <strong>{strings ? `Item ${index + 1}` : labelFor(String((item as { kind?: string; title?: string }).kind || (item as { title?: string }).title || index + 1))}</strong>
              <span>
                <button type="button" onClick={() => move(value, index, -1, onChange)} disabled={index === 0}>
                  Up
                </button>
                <button type="button" onClick={() => move(value, index, 1, onChange)} disabled={index === value.length - 1}>
                  Down
                </button>
                <button className="danger" type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}>
                  Remove
                </button>
              </span>
            </div>
            <Node
              name={name}
              value={item}
              onChange={(next) => onChange(value.map((current, itemIndex) => (itemIndex === index ? next : current)))}
            />
          </div>
        ))}
        <button className="btn btn-inline" type="button" onClick={() => onChange([...value, blankLike(value)])}>
          Add
        </button>
      </div>
    );
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key]) => key !== 'breadcrumbs' && key !== 'path');
    return (
      <div>
        {entries.map(([key, item]) => (
          <div className="field" key={key}>
            <label>{labelFor(key)}</label>
            {key === 'kind' && typeof item === 'string' ? (
              <select value={item} onChange={(event) => onChange({ ...(value as object), kind: event.target.value })}>
                {['copy', 'cards', 'table', 'rows', 'choose', 'faq', 'cta'].map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            ) : (
              <Node
                name={key}
                value={item}
                onChange={(next) => onChange({ ...(value as Record<string, unknown>), [key]: next })}
              />
            )}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function move(list: unknown[], index: number, direction: number, onChange: (next: unknown) => void) {
  const next = list.slice();
  const target = index + direction;
  if (target < 0 || target >= next.length) return;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  onChange(next);
}

function blankLike(list: unknown[]): unknown {
  const sample = list[0];
  if (typeof sample === 'string') return '';
  if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
    const blank: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sample as Record<string, unknown>)) {
      if (typeof value === 'string') blank[key] = '';
      else if (typeof value === 'number') blank[key] = 0;
      else if (typeof value === 'boolean') blank[key] = false;
      else if (Array.isArray(value)) blank[key] = [];
      else if (value && typeof value === 'object') blank[key] = {};
      else blank[key] = '';
    }
    return blank;
  }
  return '';
}

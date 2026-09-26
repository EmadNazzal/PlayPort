import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { inputClass } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { slugify, titleCase } from '@/lib/format';

type Props = { label: string; value: string[]; onChange: (v: string[]) => void; suggestions: string[]; max?: number; error?: string };

/** Genre tags: type + Enter/comma, or pick a suggestion. Stored as lowercase slugs. */
export const TagInput = ({ label, value, onChange, suggestions, max = 10, error }: Props) => {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const tag = slugify(raw).slice(0, 30);
    if (tag && !value.includes(tag) && value.length < max) onChange([...value, tag]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 12);

  return (
    <div>
      <span className="mb-1.5 block text-[13px] text-muted">{label}</span>
      <div className={cn(inputClass, 'flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5', error ? 'border-danger/60' : 'border-line-strong')}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-veil/[0.07] py-1 pr-1 pl-2 text-[13px]">
            {titleCase(t)}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded p-0.5 text-muted hover:text-text">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? '' : 'e.g. roguelike, co-op'}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-faint"
        />
      </div>
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
      {unused.length > 0 && value.length < max && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="pressable rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:border-line-strong hover:text-text">
              + {titleCase(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

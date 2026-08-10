import { useState } from 'react';
import { Brain, Plus, Trash2, Pencil, Loader2, X } from 'lucide-react';
import { MEMORY_CATEGORIES } from '@/lib/mission/catalog';

export default function MemoryVault({ memories = [], loading, saving, onSave, onDelete }) {
  const [draft, setDraft] = useState(null);

  const start = (category, existing) => setDraft({
    id: existing?.id ?? undefined,
    category: existing?.category ?? category,
    key: existing?.key ?? '',
    value: existing?.value ?? '',
  });

  const submit = (e) => {
    e.preventDefault();
    if (!draft?.key?.trim()) return;
    onSave?.(draft);
    setDraft(null);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Personal memory</h2>
        <p className="text-[11px] text-zinc-500">what your agents remember about you</p>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{memories.length} saved</span>
      </div>

      {draft && (
        <form onSubmit={submit} className="mb-4 rounded-xl border border-violet-400/25 bg-violet-500/[.05] p-3">
          <div className="grid gap-2 sm:grid-cols-[140px_1fr_1fr_auto]">
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white focus:outline-none">
              {MEMORY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder="Label (e.g. Preferred retailer)" required
              className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
            <input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="Value (e.g. John Lewis)"
              className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
            <div className="flex gap-1.5">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save
              </button>
              <button type="button" onClick={() => setDraft(null)} aria-label="Cancel" className="rounded-lg border border-white/10 p-2 text-zinc-400"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-zinc-500">
            Suggested: {(MEMORY_CATEGORIES.find((c) => c.id === draft.category)?.hints ?? []).join(' · ')}
          </p>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MEMORY_CATEGORIES.map((cat) => {
          const items = memories.filter((m) => m.category === cat.id);
          return (
            <div key={cat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-white">{cat.label}</p>
                <button onClick={() => start(cat.id)} aria-label={`Add ${cat.label} preference`} className="ml-auto rounded-md border border-white/10 p-1 text-zinc-400 transition hover:text-white"><Plus className="h-3 w-3" /></button>
              </div>
              {loading ? (
                <div className="mt-2 h-12 animate-pulse rounded-lg bg-white/5" />
              ) : items.length === 0 ? (
                <p className="mt-2 text-[10px] text-zinc-600">Nothing saved. Agents will ask before assuming.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {items.map((m) => (
                    <li key={m.id} className="group flex items-start gap-1.5 rounded-lg bg-white/[.03] px-2 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-zinc-300">{m.key}</p>
                        <p className="truncate text-[10px] text-zinc-500">{m.value || '—'}</p>
                      </div>
                      <button onClick={() => start(m.category, m)} aria-label={`Edit ${m.key}`} className="opacity-0 transition group-hover:opacity-100"><Pencil className="h-3 w-3 text-zinc-400" /></button>
                      <button onClick={() => onDelete?.(m)} aria-label={`Delete ${m.key}`} className="opacity-0 transition group-hover:opacity-100"><Trash2 className="h-3 w-3 text-zinc-500 hover:text-rose-300" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-zinc-600">You can view, edit and delete everything stored here at any time. Nothing is shared with other users or organisations.</p>
    </div>
  );
}

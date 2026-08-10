import { Tag, Plus } from 'lucide-react';
import { TAGS } from './gitData';

export default function TagsPanel({ onToast }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Tag className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Tags</h2>
        <button onClick={() => onToast?.('Create tag form opened')} className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Create tag</button>
      </div>
      <div className="space-y-2">
        {TAGS.map((t) => (
          <div key={t.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3">
            <Tag className="h-4 w-4 text-violet-400" />
            <span className="rounded-lg bg-violet-500/15 px-2 py-1 font-mono text-[11px] font-medium text-violet-200">{t.name}</span>
            <div className="min-w-0">
              <p className="truncate text-[12px] text-zinc-300">{t.message}</p>
              <p className="text-[10px] text-zinc-500">{t.author} · {t.date} · {t.sha}</p>
            </div>
            <button onClick={() => onToast?.(`Release notes for ${t.name}`)} className="ml-auto rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5">Release notes</button>
          </div>
        ))}
      </div>
    </div>
  );
}
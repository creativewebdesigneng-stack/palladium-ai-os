import { useState } from 'react';
import { Replace, Check } from 'lucide-react';

export default function FindReplace({ code, onReplace }) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const count = find ? (code.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length : 0;
  const apply = () => { if (find) onReplace(code.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replace)); };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
      <div className="mb-2 flex items-center gap-2"><Replace className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">Find &amp; Replace</h3></div>
      <div className="space-y-2">
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find…" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] text-zinc-200 outline-none" />
        <input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replace with…" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] text-zinc-200 outline-none" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">{count} match{count === 1 ? '' : 'es'}</span>
          <button onClick={apply} disabled={!find} className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Replace all</button>
        </div>
      </div>
    </div>
  );
}
import { History, RotateCcw, Save } from 'lucide-react';
import { VERSIONS } from './aiBuilderData';

export default function VersionHistory({ onRollback }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Version history</h3>
        <button className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/10"><Save className="h-3.5 w-3.5" />Save version</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {VERSIONS.map((v) => (
          <div key={v.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${v.current ? 'border-violet-400/30 bg-violet-500/10' : 'border-white/10 bg-black/20'}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-white">{v.label}</span>
                {v.current && <span className="rounded bg-violet-500/20 px-1.5 py-px text-[9px] text-violet-300">current</span>}
              </div>
              <p className="truncate text-[10px] text-zinc-500">{v.note} · {v.time}</p>
            </div>
            {!v.current && (
              <button onClick={() => onRollback(v)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/10"><RotateCcw className="h-3 w-3" />Rollback</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
import { X, Check } from 'lucide-react';
import { SOURCE_TYPES } from './knowledgeData';

export default function AddSourceModal({ kb, onClose, onAdd }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0d13] p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Add source · {kb?.name}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-[11px] text-zinc-500">Pick a source type. You can add multiple.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SOURCE_TYPES.map((s) => { const I = s.icon; return (
            <button key={s.id} onClick={() => onAdd(s.id)} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 p-3 text-center transition hover:bg-white/5">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${s.grad} text-white`}><I className="h-4 w-4" /></span>
              <span className="text-[11px] font-medium text-white">{s.label}</span>
              <span className="text-[9px] text-zinc-500">{s.hint}</span>
            </button>
          ); })}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"><Check className="h-3.5 w-3.5" />Done</button>
        </div>
      </div>
    </div>
  );
}
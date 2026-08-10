import { X } from 'lucide-react';
import { TOOLS } from './chatData';

export default function AITools({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-medium text-white">AI Tools</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
          {TOOLS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.name} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.02] p-3 text-left hover:bg-white/5">
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${t.on ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-zinc-500'}`}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-200">{t.name}</p>
                  <p className={`text-[10px] ${t.on ? 'text-emerald-400' : 'text-zinc-600'}`}>{t.on ? 'Enabled' : 'Off'}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="border-t border-white/10 px-5 py-3 text-[11px] text-zinc-500">Toggle tools to control what your agents can do in this conversation.</p>
      </div>
    </div>
  );
}
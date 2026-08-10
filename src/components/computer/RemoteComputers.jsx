import { Monitor } from 'lucide-react';
import { REMOTE_STATUS_STYLE } from './computerData';

export default function RemoteComputers({ list }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Monitor className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Remote computers</h3>
      </div>
      <div className="space-y-2">
        {list.map((c) => { const st = REMOTE_STATUS_STYLE[c.status] || REMOTE_STATUS_STYLE.Offline; return (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Monitor className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{c.name}</p>
              <p className="text-[10px] text-zinc-500">{c.os} · agent {c.agent} · {c.session}</p>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${st}`}>{c.status}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}
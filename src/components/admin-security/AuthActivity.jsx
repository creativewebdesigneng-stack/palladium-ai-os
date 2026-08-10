import { KeyRound } from 'lucide-react';

const STATUS = { ok: 'text-emerald-300 bg-emerald-500/15', fail: 'text-rose-300 bg-rose-500/15', warn: 'text-amber-300 bg-amber-500/15' };

export default function AuthActivity({ rows }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-violet-300" /><p className="text-sm font-semibold text-white">Authentication Activity</p></div>
      <div className="mt-3 space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] text-zinc-200">{r.event}</p>
              <p className="text-[10px] text-zinc-500">{r.user} · {r.method} · {r.ip}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">{r.time}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS[r.status]}`}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
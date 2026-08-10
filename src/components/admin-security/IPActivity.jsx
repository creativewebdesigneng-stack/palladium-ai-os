import { Globe, Ban } from 'lucide-react';

const RISK = { high: 'text-rose-300 bg-rose-500/15', medium: 'text-amber-300 bg-amber-500/15', low: 'text-emerald-300 bg-emerald-500/15' };

export default function IPActivity({ rows }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-cyan-300" /><p className="text-sm font-semibold text-white">IP Activity</p></div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead><tr className="text-[10px] uppercase text-zinc-500"><th className="pb-2 font-medium">IP Address</th><th className="pb-2 font-medium">Region</th><th className="pb-2 font-medium">Requests</th><th className="pb-2 font-medium">Risk</th><th className="pb-2 font-medium">Last seen</th><th className="pb-2 text-right font-medium">Action</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.ip} className="border-t border-white/5">
                <td className="py-2 font-mono text-zinc-300">{r.ip}</td>
                <td className="py-2 text-zinc-400">{r.region}</td>
                <td className="py-2 text-zinc-300">{r.requests.toLocaleString()}</td>
                <td className="py-2"><span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${RISK[r.risk]}`}>{r.risk}</span></td>
                <td className="py-2 text-zinc-500">{r.lastSeen}</td>
                <td className="py-2 text-right">
                  {r.blocked
                    ? <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300">Blocked</span>
                    : <button className="flex items-center gap-1 rounded-md border border-rose-400/20 px-1.5 py-1 text-[10px] text-rose-300 hover:bg-rose-500/10"><Ban className="h-3 w-3" />Block</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
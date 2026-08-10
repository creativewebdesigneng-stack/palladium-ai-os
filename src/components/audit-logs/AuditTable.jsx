import { CheckCircle2, XCircle } from 'lucide-react';

const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function AuditTable({ rows, onSelect, selectedId }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03]">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="text-[10px] uppercase text-zinc-500">
            <th className="px-3 py-2 font-medium">Timestamp</th>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Organisation</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Resource</th>
            <th className="px-3 py-2 font-medium">IP</th>
            <th className="px-3 py-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(e => (
            <tr key={e.id} onClick={() => onSelect(e)} className={`cursor-pointer border-t border-white/5 hover:bg-white/[.03] ${selectedId === e.id ? 'bg-violet-500/[.08]' : ''}`}>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-zinc-400">{fmtTime(e.timestamp)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-zinc-200">{e.user}</td>
              <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{e.org}</td>
              <td className="whitespace-nowrap px-3 py-2"><code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-violet-200">{e.action}</code></td>
              <td className="max-w-[200px] truncate px-3 py-2 text-zinc-300" title={e.resource}>{e.resource}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-zinc-400">{e.ip}</td>
              <td className="px-3 py-2">
                {e.result === 'success'
                  ? <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />success</span>
                  : <span className="flex items-center gap-1 text-rose-300"><XCircle className="h-3.5 w-3.5" />failure</span>}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-[12px] text-zinc-600">No audit events match your filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
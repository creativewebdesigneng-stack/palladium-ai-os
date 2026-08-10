import { Power, PowerOff, Settings2, DownloadCloud } from 'lucide-react';
import { CATEGORY_META, STATUS_META } from './adminIntegrationsData';

const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 1000000 ? 1 : 0) + (n >= 1000000 ? 'M' : 'k') : String(n);

export default function IntegrationsTable({ rows, onAction }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03]">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="text-[10px] uppercase text-zinc-500">
            <th className="px-3 py-2 font-medium">Integration</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Users</th>
            <th className="px-3 py-2 text-right font-medium">Requests</th>
            <th className="px-3 py-2 text-right font-medium">Errors</th>
            <th className="px-3 py-2 font-medium">Version</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(it => {
            const cat = CATEGORY_META[it.category] || '';
            const st = STATUS_META[it.status] || '';
            const enabled = it.status === 'Enabled';
            const canUpdate = it.status === 'Update available' || it.status === 'Beta';
            return (
              <tr key={it.id} className="border-t border-white/5 hover:bg-white/[.03]">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-base">{it.logo}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white">{it.name}</p>
                      <p className="max-w-[220px] truncate text-[11px] text-zinc-500" title={it.desc}>{it.desc}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5"><span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${cat.tone}`}>{it.category}</span></td>
                <td className="px-3 py-2.5"><span className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${st.tone}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{it.status}</span></td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] text-zinc-300">{fmt(it.users)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] text-zinc-300">{fmt(it.requests)}</td>
                <td className={`px-3 py-2.5 text-right font-mono text-[12px] ${it.errors > 10 ? 'text-rose-300' : 'text-zinc-400'}`}>{it.errors}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-400">{it.version}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {enabled
                      ? <button onClick={() => onAction(it, 'disable')} title="Disable" className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-rose-300 hover:bg-rose-500/15"><PowerOff className="h-3.5 w-3.5" /></button>
                      : <button onClick={() => onAction(it, 'enable')} title="Enable" className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-emerald-300 hover:bg-emerald-500/15"><Power className="h-3.5 w-3.5" /></button>}
                    <button onClick={() => onAction(it, 'configure')} title="Configure" className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5"><Settings2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onAction(it, 'update')} title="Update" disabled={!canUpdate} className={`grid h-7 w-7 place-items-center rounded-lg border border-white/10 ${canUpdate ? 'text-amber-300 hover:bg-amber-500/15' : 'text-zinc-700 opacity-40'}`}><DownloadCloud className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-[12px] text-zinc-600">No integrations match your filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
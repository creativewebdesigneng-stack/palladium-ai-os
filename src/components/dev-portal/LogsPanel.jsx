import { useEffect, useState } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import { getApiUsage } from './api';
import { METHOD_STYLE, LOG_STATUS_STYLE } from './devPortalData';
import TableSurface, { TableEmptyRow } from '@/components/palladium/TableSurface';

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try { const data = await getApiUsage(); setLogs(data.recent || []); } catch { setLogs([]); }
    finally { setLoading(false); }
  })(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">API Request Logs</h2></div>
      <TableSurface label="API request logs" minWidth={900} maxHeight={560} className="bg-black/60">
          <table className="text-[11px]">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="px-4 py-2 font-medium">TIME</th>
                <th className="px-4 py-2 font-medium">METHOD</th>
                <th className="px-4 py-2 font-medium">PATH</th>
                <th className="px-4 py-2 font-medium">STATUS</th>
                <th className="px-4 py-2 font-medium">LATENCY</th>
                <th className="px-4 py-2 font-medium">KEY</th>
                <th className="px-4 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
              ) : logs.length === 0 ? (
                <TableEmptyRow colSpan={7} title="No API requests logged yet" description="Live API request logs will appear here after traffic is recorded." />
              ) : logs.map((l, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2 font-mono text-zinc-400">{l.t}</td>
                  <td className="px-4 py-2"><span className={`rounded border px-1.5 py-px font-mono text-[9px] font-bold ${METHOD_STYLE[l.method]}`}>{l.method}</span></td>
                  <td className="px-4 py-2 font-mono text-zinc-300">{l.path}</td>
                  <td className={`px-4 py-2 font-mono font-medium ${LOG_STATUS_STYLE[l.status] || 'text-zinc-400'}`}>{l.status}</td>
                  <td className="px-4 py-2 font-mono text-zinc-400">{l.ms}ms</td>
                  <td className="px-4 py-2 font-mono text-zinc-400">{l.key || '—'}</td>
                  <td className="px-4 py-2 font-mono text-zinc-400">{l.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </TableSurface>
    </div>
  );
}
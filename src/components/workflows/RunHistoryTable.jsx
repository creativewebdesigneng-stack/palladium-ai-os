import { STATUS_STYLE } from './workflowsData';

export default function RunHistoryTable({ runs }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03]">
      <table className="w-full min-w-[820px] text-left text-xs">
        <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-3 py-3 font-medium">Run ID</th>
            <th className="px-3 py-3 font-medium">Started</th>
            <th className="px-3 py-3 font-medium">Completed</th>
            <th className="px-3 py-3 font-medium">Duration</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Agent</th>
            <th className="px-3 py-3 font-medium">Errors</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const st = STATUS_STYLE[r.status] || STATUS_STYLE.Draft;
            return (
              <tr key={r.runId} className="border-b border-white/5 hover:bg-white/[.04]">
                <td className="px-3 py-3 font-mono text-zinc-300">{r.runId}</td>
                <td className="px-3 py-3 text-zinc-400">{r.started}</td>
                <td className="px-3 py-3 text-zinc-400">{r.completed}</td>
                <td className="px-3 py-3 text-zinc-300">{r.duration}</td>
                <td className="px-3 py-3"><span className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{r.status}</span></td>
                <td className="px-3 py-3 text-zinc-300">{r.agent}</td>
                <td className="px-3 py-3 text-rose-400/80">{r.errors || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
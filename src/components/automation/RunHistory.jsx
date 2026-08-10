import { motion } from 'framer-motion';
import { History, Play, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { RUN_HISTORY, STATUS_STYLE } from './automationData';

const STATUS_ICON = { success: CheckCircle2, failed: AlertCircle, warning: Clock };

export default function RunHistory() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <History className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Run History</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{RUN_HISTORY.length} runs</span>
      </div>
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-600">
              <th className="pb-2 pr-3 font-medium">Run</th>
              <th className="pb-2 pr-3 font-medium">Workflow</th>
              <th className="pb-2 pr-3 font-medium">Started</th>
              <th className="pb-2 pr-3 font-medium">Finished</th>
              <th className="pb-2 pr-3 font-medium">Duration</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">Errors</th>
              <th className="pb-2 pr-3 font-medium">Outputs</th>
              <th className="pb-2 font-medium">Logs</th>
            </tr>
          </thead>
          <tbody>
            {RUN_HISTORY.map((r, i) => {
              const st = STATUS_STYLE[r.status];
              const SIcon = STATUS_ICON[r.status];
              return (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="border-b border-white/5 text-xs hover:bg-white/5"
                >
                  <td className="py-2.5 pr-3 font-mono text-zinc-400">{r.id}</td>
                  <td className="py-2.5 pr-3 text-zinc-200">{r.workflow}</td>
                  <td className="py-2.5 pr-3 text-zinc-500">{r.started}</td>
                  <td className="py-2.5 pr-3 text-zinc-500">{r.finished}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-zinc-400">{r.duration}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${st.badge}`}>
                      <SIcon className="h-3 w-3" />{st.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-zinc-400">{r.errors}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-zinc-400">{r.outputs}</td>
                  <td className="py-2.5">
                    <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5">
                      <FileText className="h-3 w-3" />View
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
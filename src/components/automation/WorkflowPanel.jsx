import { motion } from 'framer-motion';
import { Play, Pause, Pencil, Copy, Trash2, Workflow } from 'lucide-react';

const WORKFLOW = {
  name: 'Lead Enrichment Pipeline',
  description: 'Captures leads from webhook, enriches with AI agents, saves to CRM, and notifies the sales team.',
  creator: 'Maya Chen',
  version: '2.4.1',
  status: 'running',
  lastRun: '2 min ago',
  avgRuntime: '2.4s',
  executions: 1240,
  successRate: 94.2,
};

export default function WorkflowPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <Workflow className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Workflow Details</h2>
      </div>

      <div className="flex items-start gap-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg"
        >
          <Workflow className="h-7 w-7 text-white" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">{WORKFLOW.name}</h3>
            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400">● Running</span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{WORKFLOW.description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { label: 'Creator', value: WORKFLOW.creator },
          { label: 'Version', value: `v${WORKFLOW.version}` },
          { label: 'Last Run', value: WORKFLOW.lastRun },
          { label: 'Avg Runtime', value: WORKFLOW.avgRuntime },
          { label: 'Executions', value: WORKFLOW.executions.toLocaleString() },
          { label: 'Success Rate', value: `${WORKFLOW.successRate}%` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">{s.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-medium text-white hover:opacity-90">
          <Play className="h-3.5 w-3.5" />Run
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5"><Pause className="h-4 w-4" /></button>
        <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5"><Pencil className="h-4 w-4" /></button>
        <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5"><Copy className="h-4 w-4" /></button>
        <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
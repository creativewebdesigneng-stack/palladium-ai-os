import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { WORKFLOWS } from './tasksData';

export default function WorkflowCards() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Workflows</h3>
        <span className="text-[11px] text-zinc-500">{WORKFLOWS.length} active</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WORKFLOWS.map((w, i) => (
          <motion.div
            key={w.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-4 hover:border-violet-400/30"
          >
            <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${w.grad} opacity-20 blur-2xl`} />
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${w.grad} shadow-lg`}>
                <w.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{w.name}</p>
                <p className="text-[11px] text-zinc-500">{w.team} · {w.tasks} tasks</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Progress</span>
                <span className="text-white">{w.progress}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-gradient-to-r ${w.grad}`} style={{ width: `${w.progress}%` }} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Due {w.due}</span>
              <button className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300">Open <ArrowRight className="h-3 w-3" /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
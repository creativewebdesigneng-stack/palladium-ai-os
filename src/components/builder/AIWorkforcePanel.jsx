import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { AI_WORKFORCE, WORKFORCE_STATUS } from './builderData';

export default function AIWorkforcePanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">AI Workforce</h2>
        <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-300">{AI_WORKFORCE.filter(a => a.status === 'Working').length} working</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {AI_WORKFORCE.map((a, i) => (
          <motion.div key={a.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2.5">
              <span className={`relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${a.grad} text-white`}>
                <a.icon className="h-4 w-4" />
                {a.status === 'Working' && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#0c0d13] bg-emerald-400" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{a.name}</p>
                <p className="truncate text-[10px] text-zinc-500">{a.role}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${WORKFORCE_STATUS[a.status]}`}>{a.status}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="truncate text-zinc-400">{a.task}</span>
              <span className="shrink-0 text-zinc-600">{a.eta}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${a.progress}%` }} transition={{ delay: i * 0.05, duration: 0.8 }} className={`h-full rounded-full ${a.status === 'Done' ? 'bg-emerald-400' : a.status === 'Working' ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : 'bg-zinc-600'}`} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
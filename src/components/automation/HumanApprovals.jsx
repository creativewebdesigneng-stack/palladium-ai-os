import { motion } from 'framer-motion';
import { UserCheck, Clock } from 'lucide-react';
import { HUMAN_APPROVALS, STATUS_STYLE } from './automationData';

export default function HumanApprovals() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <UserCheck className="h-4 w-4 text-rose-400" />
        <h2 className="text-sm font-semibold text-white">Human Approvals</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{HUMAN_APPROVALS.length} nodes</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {HUMAN_APPROVALS.map((h, i) => {
          const st = STATUS_STYLE[h.status];
          return (
            <motion.div
              key={h.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.25) }}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-white/10 bg-black/20 p-3.5 hover:border-rose-400/30"
            >
              <div className="flex items-start justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${h.grad} text-white shadow`}>
                  <h.icon className="h-5 w-5" />
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${st.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}
                </span>
              </div>
              <p className="mt-2.5 text-xs font-semibold text-white">{h.name}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{h.desc}</p>
              <div className="mt-2.5 flex items-center gap-2 border-t border-white/5 pt-2 text-[10px]">
                <Clock className="h-3 w-3 text-zinc-600" />
                <span className="text-zinc-500">Deadline: 24h</span>
                <span className="ml-auto text-zinc-400">👤 {h.reviewer}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
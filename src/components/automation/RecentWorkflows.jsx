import { motion } from 'framer-motion';
import { Clock, Play, Copy, Trash2 } from 'lucide-react';
import { RECENT_WORKFLOWS, STATUS_STYLE } from './automationData';

export default function RecentWorkflows() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Recent Workflows</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{RECENT_WORKFLOWS.length}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RECENT_WORKFLOWS.map((w, i) => {
          const st = STATUS_STYLE[w.status];
          return (
            <motion.div
              key={w.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              whileHover={{ y: -3 }}
              className="group rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-violet-400/30"
            >
              {/* Thumbnail */}
              <div className="relative mb-3 h-20 overflow-hidden rounded-xl border border-white/5 bg-black/30">
                <div className={`absolute inset-0 bg-gradient-to-br ${w.grad} opacity-10`} />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 80">
                  <circle cx="30" cy="40" r="8" className="fill-violet-400/40" />
                  <rect x="80" y="28" width="40" height="24" rx="4" className="fill-sky-400/30" />
                  <rect x="140" y="28" width="40" height="24" rx="4" className="fill-emerald-400/30" />
                  <path d="M38 40 Q60 40 80 40" className="stroke-violet-400/40" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
                  <path d="M120 40 Q130 40 140 40" className="stroke-sky-400/40" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
                </svg>
                <span className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] ${st.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${w.grad} text-white`}>
                  <w.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-white">{w.name}</h3>
                  <p className="text-[10px] text-zinc-500">by {w.creator} · {w.edited}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-2.5">
                <span className="text-[10px] text-zinc-500">{w.runs.toLocaleString()} runs</span>
                <div className="ml-auto flex gap-1">
                  <button className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5" title="Open"><Play className="h-3.5 w-3.5" /></button>
                  <button className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                  <button className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-rose-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
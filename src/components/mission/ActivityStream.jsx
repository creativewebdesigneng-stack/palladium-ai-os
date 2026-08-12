import { motion } from 'framer-motion';
import {
  Radio, Search, PackageSearch, CheckCircle2, ShieldAlert, ThumbsUp, ThumbsDown, XCircle, Bot,
  Cog, Wrench, ArrowLeftRight, Play,
} from 'lucide-react';

const KIND = {
  task_started: { icon: Play, cls: 'text-violet-300', ring: 'ring-violet-400/25' },
  run_started: { icon: Play, cls: 'text-violet-300', ring: 'ring-violet-400/25' },
  working: { icon: Cog, cls: 'text-violet-300', ring: 'ring-violet-400/25' },
  searching: { icon: Search, cls: 'text-cyan-300', ring: 'ring-cyan-400/25' },
  results_found: { icon: PackageSearch, cls: 'text-sky-300', ring: 'ring-sky-400/25' },
  preparing_action: { icon: Wrench, cls: 'text-amber-300', ring: 'ring-amber-400/25' },
  tool_call: { icon: Wrench, cls: 'text-cyan-300', ring: 'ring-cyan-400/25' },
  handoff: { icon: ArrowLeftRight, cls: 'text-indigo-300', ring: 'ring-indigo-400/25' },
  completed: { icon: CheckCircle2, cls: 'text-emerald-300', ring: 'ring-emerald-400/25' },
  run_completed: { icon: CheckCircle2, cls: 'text-emerald-300', ring: 'ring-emerald-400/25' },
  awaiting_approval: { icon: ShieldAlert, cls: 'text-amber-300', ring: 'ring-amber-400/25' },
  approval_required: { icon: ShieldAlert, cls: 'text-amber-300', ring: 'ring-amber-400/25' },
  approved: { icon: ThumbsUp, cls: 'text-emerald-300', ring: 'ring-emerald-400/25' },
  rejected: { icon: ThumbsDown, cls: 'text-rose-300', ring: 'ring-rose-400/25' },
  action_completed: { icon: CheckCircle2, cls: 'text-emerald-300', ring: 'ring-emerald-400/25' },
  failed: { icon: XCircle, cls: 'text-rose-300', ring: 'ring-rose-400/25' },
  run_failed: { icon: XCircle, cls: 'text-rose-300', ring: 'ring-rose-400/25' },
  cancelled: { icon: XCircle, cls: 'text-zinc-400', ring: 'ring-white/10' },
  agent_created: { icon: Bot, cls: 'text-violet-300', ring: 'ring-violet-400/25' },
  info: { icon: Radio, cls: 'text-zinc-400', ring: 'ring-white/10' },
};


const time = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function ActivityStream({ activities = [], loading }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Radio className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Activity stream</h2>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}</div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-zinc-600">No agent activity yet. Dispatch a request to see data move through the system.</p>
      ) : (
        <ul className="relative max-h-[420px] space-y-3 overflow-y-auto pr-1">
          <span aria-hidden className="absolute left-[13px] top-1 h-full w-px bg-gradient-to-b from-violet-500/40 via-white/10 to-transparent" />
          {activities.map((a, i) => {
            const meta = KIND[a.kind] ?? KIND.info;
            const Icon = meta.icon;
            return (
              <motion.li
                key={a.id ?? i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className="relative flex gap-3 pl-0"
              >
                <span className={`z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0b0c13] ring-1 ${meta.ring}`}>
                  <Icon className={`h-3.5 w-3.5 ${meta.cls}`} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-zinc-200">{a.message}</p>
                  <p className="text-[10px] text-zinc-600">{time(a.created_at)}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { motion } from 'framer-motion';
import {
  Bot, Activity, CalendarClock, ShieldAlert, CheckCircle2, User, Briefcase, AlertTriangle,
} from 'lucide-react';

const CARDS = [
  { key: 'activeAgents', label: 'Active agents', icon: Bot, grad: 'from-violet-500 to-indigo-600' },
  { key: 'runningTasks', label: 'Running tasks', icon: Activity, grad: 'from-cyan-500 to-blue-600' },
  { key: 'upcomingTasks', label: 'Upcoming tasks', icon: CalendarClock, grad: 'from-sky-500 to-cyan-600' },
  { key: 'awaitingApproval', label: 'Awaiting approval', icon: ShieldAlert, grad: 'from-amber-500 to-orange-600' },
  { key: 'completedTasks', label: 'Completed', icon: CheckCircle2, grad: 'from-emerald-500 to-teal-600' },
  { key: 'personalTasks', label: 'Personal AI', icon: User, grad: 'from-fuchsia-500 to-rose-500' },
  { key: 'professionalTasks', label: 'Professional AI', icon: Briefcase, grad: 'from-indigo-500 to-violet-600' },
  { key: 'failedTasks', label: 'Failed', icon: AlertTriangle, grad: 'from-rose-500 to-red-600' },
];

export default function MissionMetrics({ metrics = {}, loading }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-2xl border border-white/10 bg-white/[.03] p-4 transition hover:border-violet-400/25"
        >
          <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${c.grad} shadow-lg shadow-black/40`}>
            <c.icon className="h-4 w-4 text-white" />
          </span>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{loading ? '—' : (metrics[c.key] ?? 0)}</p>
          <p className="text-xs text-zinc-400">{c.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

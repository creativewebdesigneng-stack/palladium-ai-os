import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Activity, CalendarClock, ShieldAlert, CheckCircle2, User, Briefcase, AlertTriangle,
  Bell, Users, ArrowUpRight,
} from 'lucide-react';

const CARDS = [
  { key: 'activeAgents', label: 'Active agents', icon: Bot, grad: 'from-violet-500 to-indigo-600', to: '/agents?view=active' },
  { key: 'runningTasks', label: 'Running tasks', icon: Activity, grad: 'from-cyan-500 to-blue-600' },
  { key: 'upcomingTasks', label: 'Upcoming tasks', icon: CalendarClock, grad: 'from-sky-500 to-cyan-600' },
  { key: 'awaitingApproval', label: 'Awaiting approval', icon: ShieldAlert, grad: 'from-amber-500 to-orange-600' },
  { key: 'completedTasks', label: 'Completed tasks', icon: CheckCircle2, grad: 'from-emerald-500 to-teal-600' },
  { key: 'failedTasks', label: 'Failed tasks', icon: AlertTriangle, grad: 'from-rose-500 to-red-600' },
  { key: 'personalTasks', label: 'Personal tasks', icon: User, grad: 'from-fuchsia-500 to-rose-500' },
  { key: 'professionalTasks', label: 'Professional tasks', icon: Briefcase, grad: 'from-indigo-500 to-violet-600' },
  { key: 'activeWorkforces', label: 'Active workforces', icon: Users, grad: 'from-violet-500 to-fuchsia-600' },
  { key: 'runningWorkforceRuns', label: 'Workforce runs', icon: Activity, grad: 'from-cyan-500 to-violet-600' },
  { key: 'unreadNotifications', label: 'Unread notifications', icon: Bell, grad: 'from-amber-500 to-yellow-600' },
];

export default function MissionMetrics({ metrics = {}, loading }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map((c, i) => (
        <motion.button
          key={c.key}
          type="button"
          disabled={!c.to}
          onClick={() => c.to && navigate(c.to)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className={`relative rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition ${c.to ? 'cursor-pointer hover:-translate-y-0.5 hover:border-violet-400/45 hover:bg-violet-500/[.06] focus:outline-none focus:ring-2 focus:ring-violet-400/35' : 'cursor-default hover:border-violet-400/25'}`}
        >
          <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${c.grad} shadow-lg shadow-black/40`}>
            <c.icon className="h-4 w-4 text-white" />
          </span>
          {c.to && <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-violet-300/70" />}
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{loading ? '—' : (metrics[c.key] ?? 0)}</p>
          <p className="text-xs text-zinc-400">{c.label}</p>
          {c.to && <p className="mt-1 text-[10px] text-violet-300/70">Open live operations</p>}
        </motion.button>
      ))}
    </div>
  );
}

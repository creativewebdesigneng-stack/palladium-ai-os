import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Activity, CalendarClock, ShieldAlert, CheckCircle2, User, Briefcase, AlertTriangle,
  Bell, Users, ArrowUpRight,
} from 'lucide-react';

const CARDS = [
  { key: 'activeAgents', label: 'Active intelligence', detail: 'agent nodes online', icon: Bot, tone: 'violet', to: '/agents?view=active' },
  { key: 'runningTasks', label: 'Live executions', detail: 'operations in flight', icon: Activity, tone: 'emerald' },
  { key: 'upcomingTasks', label: 'Queued operations', detail: 'scheduled next', icon: CalendarClock, tone: 'neutral' },
  { key: 'awaitingApproval', label: 'Approval gate', detail: 'human decisions needed', icon: ShieldAlert, tone: 'amber' },
  { key: 'completedTasks', label: 'Verified complete', detail: 'finished operations', icon: CheckCircle2, tone: 'emerald' },
  { key: 'failedTasks', label: 'Exceptions', detail: 'execution failures', icon: AlertTriangle, tone: 'rose' },
  { key: 'personalTasks', label: 'Personal missions', detail: 'private operations', icon: User, tone: 'neutral' },
  { key: 'professionalTasks', label: 'Business missions', detail: 'professional operations', icon: Briefcase, tone: 'violet' },
  { key: 'activeWorkforces', label: 'Active networks', detail: 'coordinated workforces', icon: Users, tone: 'violet' },
  { key: 'runningWorkforceRuns', label: 'Network runs', detail: 'multi-agent execution', icon: Activity, tone: 'emerald' },
  { key: 'unreadNotifications', label: 'Intelligence signals', detail: 'unread notifications', icon: Bell, tone: 'amber' },
];

const TONES = {
  violet: 'border-violet-300/15 bg-violet-300/[.045] text-violet-200',
  emerald: 'border-emerald-300/15 bg-emerald-300/[.04] text-emerald-200',
  amber: 'border-amber-300/15 bg-amber-300/[.04] text-amber-200',
  rose: 'border-rose-300/15 bg-rose-300/[.04] text-rose-200',
  neutral: 'border-white/8 bg-white/[.025] text-white/75',
};

export default function MissionMetrics({ metrics = {}, loading }) {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/35 p-4 shadow-[0_28px_80px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.10),transparent_34%)]" />
      <div className="relative mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/65">Live Intelligence Fabric</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-white">Mission telemetry</h2>
        </div>
        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/25 sm:block">Real-time operational state</span>
      </div>
      <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {CARDS.map((c, i) => (
          <motion.button
            key={c.key}
            type="button"
            disabled={!c.to}
            onClick={() => c.to && navigate(c.to)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025 }}
            className={`group relative min-h-[128px] rounded-2xl border p-3.5 text-left transition ${TONES[c.tone]} ${c.to ? 'cursor-pointer hover:-translate-y-0.5 hover:border-violet-300/30 hover:bg-violet-300/[.07] focus:outline-none focus:ring-2 focus:ring-violet-400/25' : 'cursor-default'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/8 bg-black/25">
                <c.icon className="h-3.5 w-3.5" />
              </span>
              {c.to && <ArrowUpRight className="h-3.5 w-3.5 text-white/28 transition group-hover:text-violet-200" />}
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{loading ? '—' : (metrics[c.key] ?? 0)}</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/70">{c.label}</p>
            <p className="mt-0.5 text-[10px] text-white/32">{c.detail}</p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

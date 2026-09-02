import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bot, Activity, CalendarClock, ShieldAlert, CheckCircle2, User, Briefcase, AlertTriangle, Bell, Users, ArrowUpRight } from 'lucide-react';

const CARDS = [
  { key: 'activeAgents', label: 'Agent mesh', detail: 'nodes online', icon: Bot, tone: 'violet', to: '/agents?view=active' },
  { key: 'runningTasks', label: 'Executions', detail: 'operations in flight', icon: Activity, tone: 'emerald' },
  { key: 'upcomingTasks', label: 'Queue', detail: 'scheduled next', icon: CalendarClock, tone: 'neutral' },
  { key: 'awaitingApproval', label: 'Gates', detail: 'human decisions', icon: ShieldAlert, tone: 'amber' },
  { key: 'completedTasks', label: 'Verified', detail: 'completed missions', icon: CheckCircle2, tone: 'emerald' },
  { key: 'failedTasks', label: 'Exceptions', detail: 'execution failures', icon: AlertTriangle, tone: 'rose' },
  { key: 'activeWorkforces', label: 'Networks', detail: 'active workforces', icon: Users, tone: 'violet' },
  { key: 'runningWorkforceRuns', label: 'Network runs', detail: 'multi-agent live', icon: Activity, tone: 'emerald' },
  { key: 'unreadNotifications', label: 'Signals', detail: 'unread intelligence', icon: Bell, tone: 'amber' },
  { key: 'personalTasks', label: 'Personal', detail: 'private missions', icon: User, tone: 'neutral' },
  { key: 'professionalTasks', label: 'Business', detail: 'professional missions', icon: Briefcase, tone: 'violet' },
];
const TONES = { violet: 'text-violet-200 bg-violet-300/70', emerald: 'text-emerald-200 bg-emerald-300/70', amber: 'text-amber-200 bg-amber-300/70', rose: 'text-rose-200 bg-rose-300/70', neutral: 'text-zinc-300 bg-zinc-400/60' };

export default function MissionMetrics({ metrics = {}, loading }) {
  const navigate = useNavigate(); const reduced = useReducedMotion();
  return <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.28em] text-violet-300/55">Telemetry array</p><h2 className="mt-1 text-sm font-semibold text-white">Mission instruments</h2></div><span className="hidden items-center gap-1.5 text-[8px] uppercase tracking-[.18em] text-zinc-600 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> realtime values</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{CARDS.map((c, i) => { const Icon = c.icon; const tone = TONES[c.tone]; const value = metrics[c.key] ?? 0; const active = Number(value) > 0; return <motion.button key={c.key} type="button" disabled={!c.to} onClick={() => c.to && navigate(c.to)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .02 }} className={`group relative min-h-[100px] overflow-hidden rounded-xl border border-white/8 bg-white/[.018] p-3 text-left ${c.to ? 'hover:border-violet-300/20' : 'cursor-default'}`}><motion.span className={`absolute inset-x-0 top-0 h-px ${tone.split(' ')[1]}`} animate={!reduced && active ? { opacity: [.25, 1, .25] } : undefined} transition={{ duration: 2.2, repeat: Infinity }} /><div className="flex items-center justify-between"><Icon className={`h-3.5 w-3.5 ${tone.split(' ')[0]}`} />{c.to ? <ArrowUpRight className="h-3 w-3 text-zinc-700 group-hover:text-violet-300" /> : <span className={`h-1.5 w-1.5 rounded-full ${active ? tone.split(' ')[1] : 'bg-zinc-700'}`} />}</div><p className="mt-2.5 font-mono text-xl font-semibold tracking-[-.04em] text-white">{loading ? '—' : value}</p><p className="mt-0.5 text-[10px] font-medium text-zinc-300">{c.label}</p><p className="text-[8px] uppercase tracking-[.1em] text-zinc-650">{c.detail}</p>{active && !reduced && <motion.span className={`absolute bottom-0 h-px w-1/3 ${tone.split(' ')[1]}`} animate={{ x: ['-120%', '420%'] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'linear', delay: i * .1 }} />}</motion.button>; })}</div></section>;
}

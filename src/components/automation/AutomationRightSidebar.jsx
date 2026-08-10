import {
  Bell, Sparkles, ListOrdered, CalendarClock, Activity, HeartPulse,
  CheckCircle2, AlertCircle, Info, ArrowRight,
} from 'lucide-react';
import { SIDEBAR, STATUS_STYLE } from './automationData';

const NOTIF_STYLE = {
  success: { dot: 'bg-emerald-400', icon: CheckCircle2, text: 'text-emerald-400' },
  error: { dot: 'bg-rose-400', icon: AlertCircle, text: 'text-rose-400' },
  info: { dot: 'bg-sky-400', icon: Info, text: 'text-sky-400' },
  update: { dot: 'bg-violet-400', icon: Sparkles, text: 'text-violet-400' },
};

const HEALTH_STYLE = {
  healthy: 'bg-emerald-400',
  warning: 'bg-amber-400',
  critical: 'bg-rose-400',
};

function Panel({ icon: Icon, title, children, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${accent || 'text-violet-400'}`} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function AutomationRightSidebar() {
  return (
    <aside className="flex flex-col gap-4">
      <Panel icon={Bell} title="Notifications">
        <div className="space-y-2">
          {SIDEBAR.notifications.map((n, i) => {
            const st = NOTIF_STYLE[n.kind];
            return (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-2.5 text-[11px]">
                <st.icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${st.text}`} />
                <span className="flex-1 text-zinc-300">{n.text}</span>
                <span className="shrink-0 text-zinc-600">{n.time}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel icon={Sparkles} title="AI Recommendations" accent="text-amber-400">
        <div className="space-y-1.5">
          {SIDEBAR.recommendations.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/5">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${r.grad} text-white`}>
                <r.icon className="h-3 w-3" />
              </span>
              {r.text}
              <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-zinc-600" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={ListOrdered} title="Execution Queue" accent="text-cyan-400">
        <div className="space-y-2">
          {SIDEBAR.executionQueue.map((q, i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="truncate text-zinc-300">{q.name}</span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] ${STATUS_STYLE[q.status].badge}`}>{q.status}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className={`h-full rounded-full ${q.status === 'running' ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : 'bg-white/10'}`} style={{ width: `${q.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={CalendarClock} title="Upcoming Schedules" accent="text-purple-400">
        <div className="space-y-1.5">
          {SIDEBAR.upcomingSchedules.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${s.grad} text-white`}>
                <s.icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-zinc-300">{s.name}</p>
                <p className="text-[10px] text-zinc-600">{s.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={Activity} title="Recent Activity" accent="text-sky-400">
        <div className="space-y-2">
          {SIDEBAR.recentActivity.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <div>
                <p className="text-zinc-300">{a.text}</p>
                <p className="text-zinc-600">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={HeartPulse} title="Workflow Health" accent="text-rose-400">
        <div className="space-y-2">
          {SIDEBAR.workflowHealth.map((w, i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-2.5">
              <div className="flex items-center justify-between">
                <span className="truncate text-[11px] text-zinc-300">{w.name}</span>
                <span className={`shrink-0 text-xs font-semibold ${w.status === 'healthy' ? 'text-emerald-400' : w.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>{w.score}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className={`h-full rounded-full ${HEALTH_STYLE[w.status]}`} style={{ width: `${w.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}
import { motion } from 'framer-motion';
import { Bell, Activity, BarChart3, Sparkles, Zap } from 'lucide-react';
import { RIGHT_ACTIVITY, RIGHT_NOTIFICATIONS, QUICK_ACTIONS, RECOMMENDATIONS } from './modelsData';

const USAGE = [40, 65, 50, 80, 60, 90, 75, 95, 70, 85];

export default function ModelsRightPanel({ onAction }) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4">
      {/* Quick actions */}
      <Panel icon={Zap} title="Quick Actions">
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map(a => (
            <button key={a.label} onClick={() => onAction && onAction(a.label)} className="flex flex-col items-start gap-1.5 rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:bg-white/5">
              <a.icon className="h-4 w-4 text-violet-400" />
              <span className="text-[11px] font-medium text-white">{a.label}</span>
            </button>
          ))}
        </div>
      </Panel>

      {/* Usage stats */}
      <Panel icon={BarChart3} title="Usage Statistics">
        <div className="flex h-24 items-end gap-1">
          {USAGE.map((v, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${v}%` }} transition={{ delay: i * 0.04 }} className="flex-1 rounded-t bg-gradient-to-t from-violet-600 to-cyan-400" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[['1.2M', 'Requests'], ['412ms', 'Latency'], ['99.9%', 'Uptime']].map(([v, l]) => (
            <div key={l} className="rounded-lg border border-white/5 bg-black/20 py-2"><p className="text-sm font-semibold text-white">{v}</p><p className="text-[10px] text-zinc-500">{l}</p></div>
          ))}
        </div>
      </Panel>

      {/* Notifications */}
      <Panel icon={Bell} title="Notifications">
        <div className="space-y-2">
          {RIGHT_NOTIFICATIONS.map((n, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-2.5 text-[11px]">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.kind === 'warn' ? 'bg-amber-400' : 'bg-sky-400'}`} />
              <span className="text-zinc-300">{n.text}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Recent activity */}
      <Panel icon={Activity} title="Recent Activity">
        <div className="space-y-2.5">
          {RIGHT_ACTIVITY.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br ${a.grad}`} />
              <div className="min-w-0 flex-1"><p className="truncate text-[11px] text-zinc-300">{a.text}</p><p className="text-[10px] text-zinc-600">{a.time}</p></div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Mini recommendations */}
      <Panel icon={Sparkles} title="Recommended">
        <div className="space-y-1.5">
          {RECOMMENDATIONS.slice(0, 3).map(r => (
            <div key={r.title} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px] text-zinc-300">{r.title}</div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-violet-400" /><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h3></div>
      {children}
    </div>
  );
}
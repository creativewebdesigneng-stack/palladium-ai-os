import { motion } from 'framer-motion';
import { Bell, History, Shield, BarChart3, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { RIGHT_SIDEBAR } from './integrationsData';
import { Sparkline } from './shared';

function Panel({ icon: Icon, title, grad, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br ${grad}`}><Icon className="h-3 w-3 text-white" /></span>
        <h3 className="text-xs font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function IntegrationsRightSidebar() {
  const s = RIGHT_SIDEBAR;
  return (
    <div className="space-y-3">
      {/* Security Alerts */}
      <Panel icon={Shield} title="Security Alerts" grad="from-red-500 to-rose-500">
        <div className="space-y-1.5">
          {s.security.map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br ${a.grad}`}><a.icon className="h-3 w-3 text-white" /></span>
              <p className="text-[11px] leading-snug text-zinc-300">{a.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* API Usage */}
      <Panel icon={BarChart3} title="API Usage" grad="from-violet-500 to-indigo-500">
        <div className="mb-1 flex items-baseline justify-between"><span className="text-lg font-semibold text-white">{s.usage.total}</span><span className="text-[10px] text-emerald-400">{s.usage.delta}</span></div>
        <Sparkline data={s.usage.trend} grad="from-violet-500 to-indigo-500" className="h-10" />
        <p className="mt-1 text-[10px] text-zinc-600">requests today</p>
      </Panel>

      {/* Recent Activity */}
      <Panel icon={History} title="Recent Activity" grad="from-sky-500 to-blue-500">
        <div className="space-y-1.5">
          {s.recent.map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br ${a.grad}`}><a.icon className="h-3 w-3 text-white" /></span>
              <div className="min-w-0"><p className="truncate text-[11px] text-zinc-300"><span className="font-medium text-white">{a.who}</span> {a.target}</p><p className="text-[9px] text-zinc-600">{a.time} ago</p></div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Recommendations */}
      <Panel icon={Sparkles} title="AI Recommendations" grad="from-violet-500 to-fuchsia-500">
        <div className="space-y-1.5">
          {s.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br ${r.grad}`}><r.icon className="h-3 w-3 text-white" /></span>
              <p className="text-[11px] leading-snug text-zinc-300">{r.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        {s.quickActions.map(a => (
          <button key={a.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-2.5 text-left hover:bg-white/5">
            <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${a.grad}`}><a.icon className="h-3.5 w-3.5 text-white" /></span>
            <span className="text-[11px] font-medium text-white">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
import { motion } from 'framer-motion';
import { Bell, Sparkles, ListChecks, FileCode2, Rocket } from 'lucide-react';
import { RIGHT_NOTIFICATIONS, RIGHT_RECOMMENDATIONS, RIGHT_CURRENT_TASKS, RIGHT_RECENT_FILES, DEPLOYMENT_STAGES } from './builderData';

export default function BuilderRightSidebar() {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4">
      <Panel icon={Bell} title="Notifications">
        <div className="space-y-2">
          {RIGHT_NOTIFICATIONS.map((n, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-2.5 text-[11px]">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.kind === 'warn' ? 'bg-amber-400' : n.kind === 'success' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
              <span className="text-zinc-300">{n.text}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={ListChecks} title="Current AI Tasks">
        <div className="space-y-2.5">
          {RIGHT_CURRENT_TASKS.map((t, i) => (
            <div key={i}>
              <div className="flex justify-between text-[11px]"><span className="text-zinc-300">{t.text}</span><span className="text-zinc-600">{t.progress}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${t.progress}%` }} transition={{ delay: i * 0.08 }} className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div>
              <p className="mt-0.5 text-[10px] text-zinc-600">{t.agent} agent</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={Rocket} title="Deployment Status">
        <div className="space-y-2">
          {DEPLOYMENT_STAGES.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${s.status === 'done' ? 'bg-emerald-400/15 text-emerald-400' : s.status === 'active' ? 'bg-violet-400/15 text-violet-300' : 'bg-white/5 text-zinc-600'}`}>
                {s.status === 'done' ? '✓' : i + 1}
              </span>
              <span className={`text-xs ${s.status === 'pending' ? 'text-zinc-600' : 'text-zinc-300'}`}>{s.label}</span>
              {s.status === 'active' && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="ml-auto h-2 w-2 rounded-full bg-violet-400" />}
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={Sparkles} title="Recommendations">
        <div className="space-y-1.5">
          {RIGHT_RECOMMENDATIONS.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px] text-zinc-300">
              <r.icon className="h-3.5 w-3.5 text-violet-400" />{r.text}
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={FileCode2} title="Recent Files">
        <div className="space-y-1">
          {RIGHT_RECENT_FILES.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/5">
              <FileCode2 className="h-3 w-3 text-sky-400" />
              <span className="flex-1 truncate text-zinc-300">{f.name}</span>
              <span className="text-zinc-600">{f.time}</span>
            </div>
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
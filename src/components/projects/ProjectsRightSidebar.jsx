import { motion } from 'framer-motion';
import { Bell, Sparkles, Pin, Star, Files, Lightbulb } from 'lucide-react';
import { NOTIFICATIONS, RECOMMENDATIONS, PINNED_PROJECTS, FAV_TEMPLATES, RECENT_FILES, AI_SUGGESTIONS, STATUS_STYLE } from './projectsData';

function Panel({ icon: Icon, title, grad, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${grad}`}><Icon className="h-3.5 w-3.5 text-white" /></span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function ProjectsRightSidebar() {
  return (
    <div className="space-y-4">
      {/* Notifications */}
      <Panel icon={Bell} title="Notifications" grad="from-amber-500 to-orange-500">
        <div className="space-y-2">
          {NOTIFICATIONS.map((n, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <n.icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${n.color}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-200">{n.title}</p>
                <p className="truncate text-[11px] text-zinc-500">{n.detail}</p>
                <p className="text-[10px] text-zinc-600">{n.time} ago</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* AI Recommendations */}
      <Panel icon={Sparkles} title="AI Recommendations" grad="from-violet-500 to-indigo-500">
        <div className="space-y-2">
          {RECOMMENDATIONS.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2.5">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${r.grad}`}><r.icon className="h-3.5 w-3.5 text-white" /></span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-200">{r.title}</p>
                <p className="text-[11px] text-zinc-500">{r.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* Pinned */}
      <Panel icon={Pin} title="Pinned Projects" grad="from-rose-500 to-red-500">
        <div className="space-y-2">
          {PINNED_PROJECTS.map((p, i) => {
            const s = STATUS_STYLE[p.status];
            return (
              <div key={p.name} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                <span className="text-xs text-zinc-200">{p.name}</span>
                <span className="ml-auto text-[10px] text-zinc-500">{p.progress}%</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Favourite Templates */}
      <Panel icon={Star} title="Favourite Templates" grad="from-fuchsia-500 to-pink-500">
        <div className="space-y-2">
          {FAV_TEMPLATES.map(t => (
            <div key={t.name} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${t.grad}`}><Star className="h-3 w-3 fill-white text-white" /></span>
              <span className="text-xs text-zinc-200">{t.name}</span>
              <span className="ml-auto text-[10px] text-zinc-500">{t.uses}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Recent Files */}
      <Panel icon={Files} title="Recent Files" grad="from-cyan-500 to-sky-500">
        <div className="space-y-2">
          {RECENT_FILES.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <f.icon className="h-3.5 w-3.5 text-zinc-400" />
              <div className="min-w-0">
                <p className="truncate text-xs text-zinc-200">{f.name}</p>
                <p className="truncate text-[10px] text-zinc-600">{f.project} · {f.time} ago</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* AI Suggestions */}
      <Panel icon={Lightbulb} title="AI Suggestions" grad="from-emerald-500 to-teal-500">
        <div className="space-y-2">
          {AI_SUGGESTIONS.map((s, i) => (
            <motion.button key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="flex w-full items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2.5 text-left hover:bg-white/5">
              <s.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <p className="text-[11px] text-zinc-300">{s.text}</p>
            </motion.button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
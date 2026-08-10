import { motion } from 'framer-motion';
import { Bell, Upload, Search, Sparkles, HardDrive } from 'lucide-react';
import { RIGHT_SIDEBAR } from './filesData';
import { SectionHead, Progress } from './shared';

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

export default function FilesRightSidebar() {
  const s = RIGHT_SIDEBAR;
  const pct = Math.round((s.storage.used / s.storage.total) * 100);
  return (
    <div className="space-y-3">
      {/* Notifications */}
      <Panel icon={Bell} title="Notifications" grad="from-amber-500 to-orange-500">
        <div className="space-y-1.5">
          {s.notifications.map((n, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <n.icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${n.color}`} />
              <div className="min-w-0"><p className="text-xs font-medium text-zinc-200">{n.title}</p><p className="truncate text-[10px] text-zinc-500">{n.detail} · {n.time}m ago</p></div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* Recent Uploads */}
      <Panel icon={Upload} title="Recent Uploads" grad="from-violet-500 to-indigo-500">
        <div className="space-y-1.5">
          {s.recentUploads.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${f.grad}`}><f.icon className="h-3.5 w-3.5 text-white" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs text-zinc-200">{f.name}</p><p className="text-[10px] text-zinc-600">{f.time}</p></div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Recent Searches */}
      <Panel icon={Search} title="Recent Searches" grad="from-sky-500 to-blue-500">
        <div className="space-y-1.5">
          {s.recentSearches.map((q, i) => (
            <button key={i} className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2 text-left hover:bg-white/5">
              <Search className="h-3 w-3 text-zinc-500" />
              <span className="flex-1 truncate text-xs text-zinc-200">{q.query}</span>
              <span className="text-[10px] text-zinc-600">{q.results}</span>
            </button>
          ))}
        </div>
      </Panel>

      {/* AI Suggestions */}
      <Panel icon={Sparkles} title="AI Suggestions" grad="from-violet-500 to-purple-500">
        <div className="space-y-1.5">
          {s.aiSuggestions.map((s2, i) => (
            <motion.button key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="flex w-full items-start gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2 text-left hover:bg-white/5">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${s2.grad}`}><s2.icon className="h-3 w-3 text-white" /></span>
              <p className="text-[11px] text-zinc-300">{s2.text}</p>
            </motion.button>
          ))}
        </div>
      </Panel>

      {/* Storage */}
      <Panel icon={HardDrive} title="Storage Usage" grad="from-emerald-500 to-teal-500">
        <Progress value={pct} grad={s.storage.grad} />
        <p className="mt-2 text-[11px] text-zinc-400">{s.storage.used} GB of {s.storage.total} GB</p>
        <p className="text-[10px] text-zinc-600">{100 - pct}% free remaining</p>
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
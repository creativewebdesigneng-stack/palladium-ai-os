import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutGrid, GitBranch, Bot, CheckSquare, Files, BookOpen, Library, Cpu, Plug, Activity, MessageSquare, History } from 'lucide-react';
import { PROJECT_DETAIL, catIcon, catGrad, catLabel } from './projectsData';
import { StatusBadge, DeployBadge, Avatar, Progress } from './shared';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'timeline', label: 'Timeline', icon: GitBranch },
  { key: 'workforce', label: 'AI Workforce', icon: Bot },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'files', label: 'Files', icon: Files },
  { key: 'docs', label: 'Documentation', icon: BookOpen },
  { key: 'kb', label: 'Knowledge Base', icon: Library },
  { key: 'models', label: 'Models', icon: Cpu },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
  { key: 'versions', label: 'Version History', icon: History },
];

const TASK_STYLE = {
  done: 'bg-emerald-500/15 text-emerald-300',
  in_progress: 'bg-violet-500/15 text-violet-300',
  review: 'bg-sky-500/15 text-sky-300',
  todo: 'bg-zinc-500/15 text-zinc-400',
};

export default function ProjectDetailDrawer({ project, onClose }) {
  if (!project) return null;
  const d = PROJECT_DETAIL;
  const Icon = catIcon(project.category);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#0a0b10]"
        >
          {/* Header */}
          <div className={`relative overflow-hidden bg-gradient-to-br ${project.thumbnail} p-5`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,.2),transparent_60%)]" />
            <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg bg-black/30 text-white hover:bg-black/50"><X className="h-4 w-4" /></button>
            <div className="relative flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/30 backdrop-blur"><Icon className="h-6 w-6 text-white" /></span>
              <div>
                <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                <p className="text-sm text-white/70">{catLabel(project.category)} · {project.framework}</p>
              </div>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              <DeployBadge deploy={project.deploy} />
              <span className="rounded-md bg-black/30 px-2 py-0.5 text-[11px] text-white/80">{project.language}</span>
            </div>
          </div>

          {/* Dashboard mini-cards */}
          <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-4 sm:grid-cols-4">
            {[
              { label: 'Completion', value: `${d.completion}%`, grad: 'text-violet-300' },
              { label: 'AI Activity', value: d.aiActivity, grad: 'text-emerald-300' },
              { label: 'Running Tasks', value: d.runningTasks, grad: 'text-sky-300' },
              { label: 'Pending Tasks', value: d.pendingTasks, grad: 'text-amber-300' },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <p className={`text-lg font-semibold ${m.grad}`}>{m.value}</p>
                <p className="text-[11px] text-zinc-500">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-2">
            {TABS.map(t => (
              <button key={t.key} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200">
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm text-zinc-300">{project.description}</p>

            {/* Upcoming deadlines */}
            <h3 className="mb-2 mt-5 text-xs font-semibold text-zinc-400">Upcoming Deadlines</h3>
            <div className="space-y-2">
              {d.upcomingDeadlines.map(dl => (
                <div key={dl.title} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-2.5">
                  <dl.icon className="h-4 w-4 text-violet-400" />
                  <span className="text-xs text-zinc-300">{dl.title}</span>
                  <span className="ml-auto rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-amber-300">{dl.due}</span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <h3 className="mb-2 mt-5 text-xs font-semibold text-zinc-400">Project Timeline</h3>
            <div className="flex items-center justify-between">
              {d.timeline.map((t, i) => (
                <div key={t.phase} className="flex flex-1 flex-col items-center text-center">
                  <span className={`h-3 w-3 rounded-full ${t.done ? 'bg-emerald-400' : t.current ? 'bg-violet-400 ring-4 ring-violet-400/20' : 'bg-zinc-700'}`} />
                  <p className="mt-1.5 text-[10px] font-medium text-zinc-300">{t.phase}</p>
                  <p className="text-[9px] text-zinc-600">{t.date}</p>
                  {i < d.timeline.length - 1 && <span className={`absolute h-px w-[14%] ${t.done ? 'bg-emerald-400/40' : 'bg-white/10'}`} style={{ marginLeft: '7%' }} />}
                </div>
              ))}
            </div>

            {/* AI Workforce */}
            <h3 className="mb-2 mt-5 text-xs font-semibold text-zinc-400">AI Workforce</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {d.workforce.map(w => (
                <div key={w.name} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-3">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${w.grad}`}><w.icon className="h-4 w-4 text-white" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">{w.name}</p>
                    <p className="truncate text-[10px] text-zinc-500">{w.role}</p>
                  </div>
                  <span className={`ml-auto rounded-md px-2 py-0.5 text-[10px] ${w.status === 'running' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-400'}`}>{w.tasks} tasks</span>
                </div>
              ))}
            </div>

            {/* Tasks */}
            <h3 className="mb-2 mt-5 text-xs font-semibold text-zinc-400">Tasks</h3>
            <div className="space-y-2">
              {d.tasks.map(t => (
                <div key={t.title} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-2.5">
                  <span className={`h-2 w-2 rounded-full ${TASK_STYLE[t.status].split(' ')[0]}`} />
                  <span className="text-xs text-zinc-300">{t.title}</span>
                  <span className="ml-auto text-[10px] text-zinc-500">{t.assignee}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${TASK_STYLE[t.status]}`}>{t.status}</span>
                </div>
              ))}
            </div>

            {/* Models + Integrations */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 mt-5 text-xs font-semibold text-zinc-400">Models Used</h3>
                <div className="flex flex-wrap gap-1.5">
                  {d.models.map(m => <span key={m} className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-1 text-[11px] text-zinc-300">{m}</span>)}
                </div>
              </div>
              <div>
                <h3 className="mb-2 mt-5 text-xs font-semibold text-zinc-400">Integrations</h3>
                <div className="flex flex-wrap gap-1.5">
                  {d.integrations.map(m => <span key={m} className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-1 text-[11px] text-zinc-300">{m}</span>)}
                </div>
              </div>
            </div>

            {/* Recent changes */}
            <h3 className="mb-2 mt-5 text-xs font-semibold text-zinc-400">Recent Changes</h3>
            <div className="space-y-2">
              {d.recentChanges.map(c => (
                <div key={c.file} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-2.5">
                  <span className="text-xs text-zinc-300">{c.file}</span>
                  <span className="text-[10px] text-emerald-400">{c.change.split(' ')[0]}</span>
                  <span className="text-[10px] text-rose-400">{c.change.split(' ')[1]}</span>
                  <span className="ml-auto text-[10px] text-zinc-600">{c.who} · {c.time}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
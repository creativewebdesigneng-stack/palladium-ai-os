import { FolderKanban, Bot, ListChecks, FileText, BookOpen, Workflow, Plug, User, Users, BookText, Cpu, Store } from 'lucide-react';

const ICONS = { FolderKanban, Bot, ListChecks, FileText, BookOpen, Workflow, Plug, User, Users, BookText, Cpu, Store };

export function CategoryIcon({ icon, grad, size = 'h-4 w-4' }) {
  const Icon = ICONS[icon] || FileText;
  return <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${grad}`}><Icon className={`${size} text-white`} /></span>;
}

export function RelevanceBar({ score }) {
  const color = score >= 70 ? 'from-emerald-400 to-teal-400' : score >= 40 ? 'from-violet-400 to-indigo-400' : 'from-zinc-500 to-zinc-600';
  return (
    <div className="flex items-center gap-2" title={`${score}% relevance`}>
      <div className="h-1 w-12 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[9px] tabular-nums text-zinc-500">{score}%</span>
    </div>
  );
}

export function StatusBadge({ status }) {
  if (!status || status === '-') return null;
  const map = {
    running: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    active: 'bg-sky-500/15 text-sky-300 ring-sky-400/20',
    connected: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    succeeded: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    done: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    completed: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    idle: 'bg-zinc-500/15 text-zinc-400 ring-white/10',
    paused: 'bg-amber-500/15 text-amber-300 ring-amber-400/20',
    planning: 'bg-sky-500/15 text-sky-300 ring-sky-400/20',
    todo: 'bg-zinc-500/15 text-zinc-400 ring-white/10',
    in_progress: 'bg-violet-500/15 text-violet-300 ring-violet-400/20',
    available: 'bg-zinc-500/15 text-zinc-400 ring-white/10',
    failed: 'bg-red-500/15 text-red-300 ring-red-400/20',
    error: 'bg-red-500/15 text-red-300 ring-red-400/20',
  };
  return <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase ring-1 ${map[status] || map.idle}`}>{status.replace('_', ' ')}</span>;
}
import { ArrowRight, Copy, Pause, Play, X } from 'lucide-react';
import { PRIORITY_STYLE, STATUS_STYLE } from './tasksData';

function Avatar({ agent, grad = 'from-violet-500 to-indigo-500' }) {
  return (
    <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${grad} text-[10px] font-semibold text-white`}>
      {agent.split(' ').map(w => w[0]).slice(0, 2).join('')}
    </span>
  );
}

const AGENT_GRAD = {
  'Research Analyst': 'from-cyan-500 to-sky-500',
  'Marketing Agent': 'from-fuchsia-500 to-pink-500',
  'Finance Agent': 'from-emerald-500 to-teal-500',
  'Developer Agent': 'from-violet-500 to-indigo-500',
  'Support Agent': 'from-sky-500 to-blue-500',
  'Content Writer': 'from-rose-500 to-pink-500',
  'Data Scientist': 'from-amber-500 to-orange-500',
  'Lead Scout': 'from-teal-500 to-emerald-500',
};

export default function TaskTable({ tasks, onOpen, onAction }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0c0d13]/95 text-left text-[11px] uppercase tracking-wider text-zinc-500 backdrop-blur">
            <tr>
              {['Task', 'Priority', 'Agent', 'Team', 'Dept', 'Status', 'Progress', 'Due', 'Est. Done', '', ''].map(h => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => {
              const ps = PRIORITY_STYLE[t.priority];
              const ss = STATUS_STYLE[t.status];
              const StIcon = ss.icon;
              return (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[.03]">
                  <td className="px-4 py-3">
                    <button onClick={() => onOpen(t)} className="block max-w-[260px] text-left">
                      <p className="truncate font-medium text-white hover:text-violet-300">{t.name}</p>
                      <p className="truncate text-xs text-zinc-500">{t.category} · {t.project}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${ps.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${ps.dot}`} />{t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar agent={t.agent} grad={AGENT_GRAD[t.agent]} />
                      <span className="text-zinc-300">{t.agent}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{t.team}</td>
                  <td className="px-4 py-3 text-zinc-500">{t.department}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${ss.chip}`}>
                      <StIcon className="h-3 w-3" />{t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${t.progress}%` }} />
                      </div>
                      <span className="text-[11px] text-zinc-500">{t.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{t.dueDate}</td>
                  <td className="px-4 py-3 text-zinc-500">{t.estCompletion?.split(' ')[0] || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onOpen(t)} className="inline-flex text-violet-400 hover:text-violet-300"><ArrowRight className="h-4 w-4" /></button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      {t.status === 'Running' ? (
                        <button onClick={() => onAction(t, 'pause')} title="Pause" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><Pause className="h-3.5 w-3.5" /></button>
                      ) : (
                        <button onClick={() => onAction(t, 'resume')} title="Resume" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><Play className="h-3.5 w-3.5" /></button>
                      )}
                      <button onClick={() => onAction(t, 'duplicate')} title="Duplicate" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onAction(t, 'cancel')} title="Cancel" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Clock, GitBranch } from 'lucide-react';
import { TASKS, TASK_STATUS_STYLE, PRIORITY_STYLE } from './workforceData';

const TABS = ['Queued', 'Running', 'Waiting', 'Completed', 'Failed', 'Cancelled'];

export default function TaskQueue() {
  const [tab, setTab] = useState('Running');
  const list = TASKS.filter(t => t.status === tab);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="mb-4 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${tab === t ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>{t}</button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map(t => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${t.grad} text-xs font-semibold text-white`}>{t.agent[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-200">{t.title}</p>
              <p className="flex items-center gap-3 text-[10px] text-zinc-500">
                <span>{t.agent}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.eta}</span>
                {t.deps.length > 0 && <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{t.deps.join(', ')}</span>}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${TASK_STATUS_STYLE[t.status]}`}>{t.status}</span>
          </div>
        ))}
        {!list.length && <p className="py-8 text-center text-sm text-zinc-600">No {tab.toLowerCase()} tasks right now.</p>}
      </div>
    </div>
  );
}
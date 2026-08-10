import { STATUS_STYLE, PRIORITY_STYLE } from './jobsData';

export default function TaskKanbanView({ tasks, onOpen }) {
  const statuses = Object.keys(STATUS_STYLE);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {statuses.map((s) => {
        const col = tasks.filter((t) => t.status === s);
        const st = STATUS_STYLE[s];
        return (
          <div key={s} className="flex w-64 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[.02]">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className={`h-2 w-2 rounded-full ${st.dot}`} />
              <p className="text-xs font-semibold text-white">{s}</p>
              <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">{col.length}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 22rem)' }}>
              {col.map((t) => (
                <button key={t.id} onClick={() => onOpen(t)} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-violet-400/30 hover:bg-white/[.04]">
                  <p className="text-xs font-medium text-white">{t.title}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">{t.project}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                    <span className="text-[10px] text-zinc-500">{t.agent}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${t.progress}%` }} /></div>
                    <span className="text-[10px] text-zinc-500">{t.progress}%</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-zinc-600">Due {t.dueDate}</p>
                </button>
              ))}
              {col.length === 0 && <p className="py-6 text-center text-[10px] text-zinc-700">No tasks</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
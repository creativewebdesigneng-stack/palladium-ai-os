import { STATUS_STYLE, PRIORITY_STYLE } from './jobsData';

// Compact gantt: 14-day window from earliest created date.
export default function TaskTimelineView({ tasks, onOpen }) {
  const dates = [];
  const base = new Date('2026-08-01');
  for (let i = 0; i < 14; i++) { const d = new Date(base); d.setDate(base.getDate() + i); dates.push(d.toISOString().slice(0, 10)); }
  const min = dates[0], max = dates[dates.length - 1];
  const pos = (date) => {
    const d = new Date(date), m = new Date(min);
    return Math.max(0, Math.min(100, ((d - m) / (new Date(max) - m)) * 100));
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Timeline · Aug 1–14</h3>
        <span className="text-xs text-zinc-500">{tasks.length} tasks</span>
      </div>
      <div className="mb-2 grid" style={{ gridTemplateColumns: `200px 1fr` }}>
        <div />
        <div className="grid" style={{ gridTemplateColumns: `repeat(14, 1fr)` }}>
          {dates.map((d) => <div key={d} className="border-l border-white/5 px-1 text-center text-[9px] text-zinc-600">{d.slice(8)}</div>)}
        </div>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => {
          const st = STATUS_STYLE[t.status];
          const left = pos(t.created), right = pos(t.dueDate);
          const width = Math.max(4, right - left);
          return (
            <div key={t.id} className="grid items-center gap-3" style={{ gridTemplateColumns: `200px 1fr` }}>
              <button onClick={() => onOpen(t)} className="truncate rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/5">
                <span className="font-medium text-white">{t.title}</span>
                <span className="block text-[10px] text-zinc-600">{t.project} · {t.agent}</span>
              </button>
              <div className="relative h-7">
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(14, 1fr)` }}>
                  {dates.map((d) => <div key={d} className="border-l border-white/5" />)}
                </div>
                <button onClick={() => onOpen(t)} className="absolute top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] text-white shadow" style={{ left: `${left}%`, width: `${width}%`, background: `linear-gradient(90deg, hsl(263 70% 58%), hsl(243 70% 58%))` }}>
                  <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{t.progress}%</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
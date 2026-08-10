import { STATUS_STYLE, PRIORITY_STYLE } from './jobsData';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TaskCalendarView({ tasks, onOpen }) {
  // Build August 2026 (starts Saturday). Anchor to the first task month for simplicity.
  const year = 2026, month = 7; // August (0-indexed)
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7; // make Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const byDay = (d) => tasks.filter((t) => t.dueDate === `2026-08-${String(d).padStart(2, '0')}`);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">August 2026</h3>
        <span className="text-xs text-zinc-500">{tasks.length} tasks this month</span>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-wider text-zinc-600">
        {DOW.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => (
          <div key={i} className="min-h-[96px] rounded-xl border border-white/5 bg-black/20 p-1.5">
            {d && <span className="text-[10px] text-zinc-500">{d}</span>}
            {d && (
              <div className="mt-1 space-y-1">
                {byDay(d).slice(0, 3).map((t) => {
                  const st = STATUS_STYLE[t.status];
                  return (
                    <button key={t.id} onClick={() => onOpen(t)} className="block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] transition hover:opacity-80" style={undefined}>
                      <span className={`flex items-center gap-1 rounded px-1 py-0.5 ${st.bg} ${st.text}`}><span className={`h-1 w-1 rounded-full ${st.dot}`} /><span className="truncate">{t.title}</span></span>
                    </button>
                  );
                })}
                {byDay(d).length > 3 && <p className="px-1 text-[9px] text-zinc-600">+{byDay(d).length - 3} more</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
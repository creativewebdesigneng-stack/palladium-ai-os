import { PRIORITY_STYLE, STATUS_STYLE } from './tasksData';

// Map each task to a horizontal bar across a 14-day window starting 2026-08-01.
const WINDOW_START = new Date('2026-08-01');
const DAYS = 14;
const DAY_W = 52; // px per day

const dayOffset = (dateStr) => {
  const d = new Date(dateStr);
  const diff = Math.round((d - WINDOW_START) / 86400000);
  return Math.max(0, Math.min(DAYS - 1, diff));
};

export default function TaskTimeline({ tasks, onOpen }) {
  const running = tasks.filter(t => ['Running', 'Waiting', 'Queued', 'Completed', 'Failed'].includes(t.status));
  const todayIdx = dayOffset('2026-08-06');

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Execution Timeline</h3>
        <span className="text-[11px] text-zinc-500">Aug 1 — Aug 14 · dependencies shown</span>
      </div>

      {/* Day ruler */}
      <div className="relative mb-3 ml-48" style={{ width: DAYS * DAY_W }}>
        {Array.from({ length: DAYS }).map((_, i) => (
          <div key={i} className="absolute top-0 text-center" style={{ left: i * DAY_W, width: DAY_W }}>
            <span className="text-[10px] text-zinc-600">{i + 1}</span>
          </div>
        ))}
        {/* Today marker */}
        <div className="absolute -top-1 bottom-0 w-px bg-violet-500/60" style={{ left: todayIdx * DAY_W + DAY_W / 2 }}>
          <span className="absolute -top-0 left-1.5 text-[9px] text-violet-400">today</span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <div className="space-y-2" style={{ minWidth: 192 + DAYS * DAY_W }}>
          {running.map(t => {
            const start = dayOffset(t.startDate);
            const end = dayOffset(t.dueDate);
            const width = Math.max(DAY_W * 0.6, (end - start + 1) * DAY_W - 6);
            const ss = STATUS_STYLE[t.status];
            const ps = PRIORITY_STYLE[t.priority];
            return (
              <div key={t.id} className="flex items-center">
                <button onClick={() => onOpen(t)} className="w-48 shrink-0 truncate pr-3 text-left text-xs text-zinc-300 hover:text-violet-300">
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${ps.dot}`} />
                  {t.name}
                </button>
                <div className="relative" style={{ width: DAYS * DAY_W }}>
                  {/* dependency link */}
                  {t.dependencies.length > 0 && (
                    <div className="absolute left-0 top-1/2 h-px w-full bg-white/5" />
                  )}
                  <button
                    onClick={() => onOpen(t)}
                    className={`absolute top-1/2 flex h-6 -translate-y-1/2 items-center justify-between rounded-lg border px-2 text-[10px] ${ss.chip}`}
                    style={{ left: start * DAY_W + 3, width }}
                    title={`${t.status} · ${t.progress}%`}
                  >
                    <span className="truncate">{t.status}</span>
                    <span className="opacity-70">{t.progress}%</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Running</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Waiting</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-500" />Completed</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Failed</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />Today</span>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PRIORITY_STYLE } from './tasksData';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW = ['Month', 'Week', 'Day'];

export default function TaskCalendar({ events }) {
  const [cursor, setCursor] = useState(new Date('2026-08-06'));
  const [view, setView] = useState('Month');

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const evFor = (dateStr) => events.filter(e => e.date === dateStr);

  const fmt = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const move = (dir) => setCursor(new Date(year, month + dir, 6));

  // Week & Day views
  const weekStart = new Date(cursor);
  weekStart.setDate(cursor.getDate() - cursor.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const dayEvents = evFor(`${year}-${String(month + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => move(1)} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><ChevronRight className="h-4 w-4" /></button>
          <h3 className="ml-2 text-sm font-semibold text-white">
            {cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.04] p-1">
          {VIEW.map(v => (
            <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1 text-xs ${view === v ? 'bg-white text-black' : 'text-zinc-400'}`}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'Month' && (
        <>
          <div className="grid grid-cols-7 gap-1">
            {DOW.map(d => <div key={d} className="pb-1 text-center text-[10px] uppercase tracking-wider text-zinc-600">{d}</div>)}
            {cells.map((d, i) => {
              const dateStr = d ? fmt(d) : null;
              const evs = dateStr ? evFor(dateStr) : [];
              const isToday = dateStr === '2026-08-06';
              return (
                <div key={i} className={`min-h-[84px] rounded-lg border p-1.5 ${d ? 'border-white/10 bg-black/20' : 'border-transparent'} ${isToday ? 'ring-1 ring-violet-500/50' : ''}`}>
                  {d && <p className={`mb-1 text-[10px] font-medium ${isToday ? 'text-violet-300' : 'text-zinc-500'}`}>{d}</p>}
                  <div className="space-y-1">
                    {evs.map(e => {
                      const ps = PRIORITY_STYLE[e.priority];
                      return (
                        <div key={e.id} className={`truncate rounded px-1.5 py-0.5 text-[10px] ${ps.chip}`} title={e.title}>
                          ● {e.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Critical</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Medium</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" />Low</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />Background</span>
          </div>
        </>
      )}

      {view === 'Week' && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const evs = evFor(ds);
            return (
              <div key={ds} className="min-h-[160px] rounded-lg border border-white/10 bg-black/20 p-2">
                <p className="mb-2 text-[11px] font-medium text-zinc-400">{DOW[d.getDay()]} {d.getDate()}</p>
                <div className="space-y-1.5">
                  {evs.map(e => {
                    const ps = PRIORITY_STYLE[e.priority];
                    return <div key={e.id} className={`rounded px-1.5 py-1 text-[10px] ${ps.chip}`}>{e.title}</div>;
                  })}
                  {evs.length === 0 && <p className="text-[10px] text-zinc-700">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'Day' && (
        <div className="space-y-2">
          {dayEvents.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-600">No tasks due on this day.</p>
          ) : dayEvents.map(e => {
            const ps = PRIORITY_STYLE[e.priority];
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <span className={`h-2.5 w-2.5 rounded-full ${ps.dot}`} />
                <div><p className="text-sm text-white">{e.title}</p><p className="text-xs text-zinc-500">{e.status} · due {e.date}</p></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
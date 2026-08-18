import { ListChecks, Clock, CheckCircle2, PlayCircle, ShieldAlert, XCircle, CalendarDays, User, Briefcase } from 'lucide-react';
import { TASK_STATUS_STYLE, CATEGORY_LABEL } from '@/lib/mission/catalog';
import RichTaskOutput from './RichTaskOutput';

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function Group({ title, icon: Icon, tasks, tone, onComplete }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <h3 className="text-xs font-semibold text-white">{title}</h3>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-[11px] text-zinc-600">Nothing here.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.slice(0, 8).map((t) => {
            const st = TASK_STATUS_STYLE[t.status] ?? TASK_STATUS_STYLE.pending;
            return (
              <li key={t.id} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                <div className="flex items-start gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-zinc-200">{t.title ?? t.request}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-zinc-600">
                      <span>{CATEGORY_LABEL[t.category] ?? t.category}</span>
                      <span className="inline-flex items-center gap-1">
                        {t.scope === 'professional' ? <Briefcase className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}{t.scope}
                      </span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{when(t.completed_at ?? t.created_at)}</span>
                    </p>
                  </div>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${st.badge}`}>{st.label}</span>
                </div>
                <RichTaskOutput result={t.result} />
                {onComplete && t.status !== 'completed' && (
                  <button onClick={() => onComplete(t)} className="mt-2 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400 transition hover:text-white">Mark done</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function TaskBoard({ tasks = [], onComplete }) {
  const running = tasks.filter((t) => t.status === 'running' || t.status === 'queued');
  const upcoming = tasks.filter((t) => t.status === 'pending');
  const awaiting = tasks.filter((t) => t.status === 'awaiting_approval');
  const done = tasks.filter((t) => t.status === 'completed');
  const failed = tasks.filter((t) => t.status === 'failed' || t.status === 'cancelled');

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <Group title="Running now" icon={PlayCircle} tone="text-cyan-400" tasks={running} />
        <Group title="Upcoming" icon={CalendarDays} tone="text-sky-400" tasks={upcoming} onComplete={onComplete} />
        <Group title="Awaiting approval" icon={ShieldAlert} tone="text-amber-400" tasks={awaiting} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Group title="Recently completed" icon={CheckCircle2} tone="text-emerald-400" tasks={done} />
        <Group title="Cancelled & failed" icon={XCircle} tone="text-rose-400" tasks={failed} />
      </div>
      <p className="flex items-center gap-1.5 text-[10px] text-zinc-600"><ListChecks className="h-3 w-3" />Mission Control decides which agent handles each request, which tools it may use, and whether your approval is required.</p>
    </div>
  );
}

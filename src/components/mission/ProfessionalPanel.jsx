import { motion } from 'framer-motion';
import { Briefcase, Users, Bot, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';

const RUN_STYLE = {
  running: { icon: Play, cls: 'text-cyan-300' },
  queued: { icon: Clock, cls: 'text-sky-300' },
  succeeded: { icon: CheckCircle2, cls: 'text-emerald-300' },
  completed: { icon: CheckCircle2, cls: 'text-emerald-300' },
  failed: { icon: XCircle, cls: 'text-rose-300' },
  cancelled: { icon: XCircle, cls: 'text-zinc-400' },
};

const when = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/**
 * Professional AI and AI Workforces inside Mission Control. Read-only: workforce
 * composition and execution are owned by the orchestration engine, so this view
 * reports authoritative server state rather than mutating it.
 */
export default function ProfessionalPanel({
  agents = [],
  workforces = [],
  runs = [],
  agentRuns = [],
  loading,
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Professional AI</h2>
          <span className="ml-auto text-[11px] text-zinc-500">{agents.length} agent(s)</span>
        </div>
        {agents.length === 0 ? (
          <p className="text-xs text-zinc-600">
            No professional agents yet. Create one in Workforce to staff a department.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {agents.map((a, i) => (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-300" />
                  <p className="truncate text-sm font-medium text-white">{a.name}</p>
                  <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                    {a.status}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                  {a.purpose || a.description || 'No purpose recorded.'}
                </p>
                <p className="mt-2 text-[10px] text-zinc-600">
                  {a.category} · {a.autonomy} · {a.model}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">AI Workforces</h2>
          <span className="ml-auto text-[11px] text-zinc-500">{workforces.length} workforce(s)</span>
        </div>
        {workforces.length === 0 ? (
          <p className="text-xs text-zinc-600">No workforces yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {workforces.map((w) => (
              <li key={w.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-white">{w.name}</p>
                  <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                    {w.status}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                  {w.purpose || w.description || 'No purpose recorded.'}
                </p>
                {w.department ? (
                  <p className="mt-2 text-[10px] text-zinc-600">{w.department}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Recent orchestration runs</h2>
        {runs.length === 0 ? (
          <p className="text-xs text-zinc-600">No workflow runs recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {runs.slice(0, 12).map((r) => {
              const meta = RUN_STYLE[r.status] ?? RUN_STYLE.queued;
              const Icon = meta.icon;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.cls}`} />
                  <p className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                    {r.input || r.output || 'Workflow run'}
                  </p>
                  <span className="shrink-0 text-[10px] text-zinc-600">
                    {when(r.started_at || r.completed_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Recent agent runs</h2>
        {agentRuns.length === 0 ? (
          <p className="text-xs text-zinc-600">No agent runs recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {agentRuns.slice(0, 12).map((r) => {
              const meta = RUN_STYLE[r.status] ?? RUN_STYLE.queued;
              const Icon = meta.icon;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.cls}`} />
                  <p className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                    {r.title || 'Agent run'}
                  </p>
                  <span className="shrink-0 text-[10px] text-zinc-600">
                    {r.model || r.provider || ''} · {when(r.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

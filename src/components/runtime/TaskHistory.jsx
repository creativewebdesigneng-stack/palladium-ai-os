import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import TaskStatusBadge from './TaskStatusBadge';

// Collapsible list of past runs for this agent. Each row expands to show the
// input, output (rendered as markdown), model/provider and token usage.
export default function TaskHistory({ tasks }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Task history</p>
        <span className="text-[11px] text-zinc-500">{tasks.length} run{tasks.length === 1 ? '' : 's'}</span>
      </div>
      <div className="mt-4 space-y-2">
        {tasks.length === 0 && <p className="text-xs text-zinc-600">No runs yet — enter a task above to begin.</p>}
        {tasks.map((t) => (
          <div key={t.id} className="rounded-xl border border-white/10 bg-black/20">
            <button onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/[.02]">
              <TaskStatusBadge status={t.status} />
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{t.title || t.input || 'Untitled task'}</span>
              {t.execution_ms ? <span className="text-[10px] text-zinc-600">{t.execution_ms}ms</span> : null}
            </button>
            {open === t.id && (
              <div className="border-t border-white/10 p-3 text-xs">
                {t.input && <p className="mb-2 text-zinc-400"><span className="text-zinc-600">Input:</span> {t.input}</p>}
                {t.error ? (
                  <p className="text-rose-400">{t.error}</p>
                ) : (
                  <div className="text-sm leading-relaxed text-zinc-300">
                    <ReactMarkdown>{t.output || 'No output'}</ReactMarkdown>
                  </div>
                )}
                <p className="mt-2 text-[10px] text-zinc-600">{[t.provider, t.model, t.tokens_used ? `${t.tokens_used} tokens` : ''].filter(Boolean).join(' · ')}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
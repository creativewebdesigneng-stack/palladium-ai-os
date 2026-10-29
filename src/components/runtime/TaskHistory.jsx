import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import TaskStatusBadge from './TaskStatusBadge';

const STATUS_UI = { succeeded: 'completed', queued: 'pending' };
const outputOf = (t) => t.output_text || (typeof t.output === 'string' ? t.output : t.output?.text) || '';
// Display only the bounded, server-verified public read field as plain text.
// This is authoritative source material, not a model-generated quote.
const verifiedBrowserSource = (t) => {
  const data = t.output?.verified_browser_source;
  return t.status === 'succeeded' && data?.provider === 'playwright' && data?.simulated === false &&
    data?.kind === 'approved_public_read' && typeof data.text === 'string' &&
    data.text.length > 0 && data.text.length <= 8000 &&
    typeof data.url === 'string' && data.url.startsWith('https://') ? data : null;
};

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
        {tasks.map((t) => {
          const tokens = (t.tokens_in ?? 0) + (t.tokens_out ?? 0);
          return (
            <div key={t.id} className="rounded-xl border border-white/10 bg-black/20">
              <button onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/[.02]">
                <TaskStatusBadge status={STATUS_UI[t.status] || t.status} />
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{t.title || t.input || 'Untitled task'}</span>
                {t.duration_ms ? <span className="text-[10px] text-zinc-600">{t.duration_ms}ms</span> : null}
              </button>
              {open === t.id && (
                <div className="border-t border-white/10 p-3 text-xs">
                  {t.input && <p className="mb-2 text-zinc-400"><span className="text-zinc-600">Input:</span> {t.input}</p>}
                  {t.error ? (
                    <p className={t.status === 'cancelled' ? 'text-zinc-400' : 'text-rose-400'}>{t.error}</p>
                  ) : (
                    <div className="text-sm leading-relaxed text-zinc-300">
                      <ReactMarkdown>{outputOf(t) || 'No output'}</ReactMarkdown>
                    </div>
                  )}
                  {verifiedBrowserSource(t) && (
                    <section className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3" aria-label="Verified browser source">
                      <p className="text-xs font-semibold text-sky-200">Verified browser text · exact Playwright source</p>
                      <p className="mt-1 break-all text-[10px] text-zinc-400">{verifiedBrowserSource(t).url} · Ephemeral session · Not model-transcribed</p>
                      {Array.isArray(verifiedBrowserSource(t).fields) && verifiedBrowserSource(t).fields.length > 0 ? (
                        <div className="mt-2 space-y-3">
                          {verifiedBrowserSource(t).fields.map((field, index) => (
                            <div key={field.name + '-' + index}>
                              <p className="mb-1 text-[11px] font-semibold text-sky-200">{field.name}</p>
                              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-xs text-zinc-200">{field.text}</pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-xs text-zinc-200">{verifiedBrowserSource(t).text}</pre>
                      )}
                    </section>
                  )}
                  <p className="mt-2 text-[10px] text-zinc-600">{[t.provider, t.model, tokens ? `${tokens} tokens` : ''].filter(Boolean).join(' · ')}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

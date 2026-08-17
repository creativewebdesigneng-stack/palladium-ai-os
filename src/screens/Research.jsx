import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useServerFn } from '@tanstack/react-start';
import { ExternalLink, Loader2, Search, Sparkles } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { runResearch } from '@/lib/ai/research.functions';
import { friendlyMessage } from '@/lib/errors';

export default function Research() {
  const researchFn = useServerFn(runResearch);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const submit = async (event) => {
    event?.preventDefault?.();
    const value = query.trim();
    if (pending || value.length < 3) return;
    setPending(true);
    setError(null);
    try {
      const response = await researchFn({ data: { query: value } });
      setResult(response);
    } catch (requestError) {
      console.error('[Research] live research failed', requestError);
      setError(friendlyMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="Research"
        description="Ask a research question and PalladiumAI will search the live web, compare sources and generate a cited AI report."
      />

      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm font-medium text-white" htmlFor="research-query">What do you want to research?</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <textarea
                id="research-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={3}
                maxLength={600}
                placeholder="Example: Compare the latest developments in open-source AI models and explain which are best for autonomous agents."
                className="min-h-[92px] flex-1 resize-y rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
              />
              <button
                type="submit"
                disabled={pending || query.trim().length < 3}
                className="flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 sm:self-stretch"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {pending ? 'Researching…' : 'Research'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-600">Research uses live public web results and the AI provider configured for your PalladiumAI account, with Groq fallback when available.</p>
          </form>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 text-sm text-rose-100">
            <p className="font-medium">Research failed</p>
            <p className="mt-1 text-xs text-rose-100/70">{error}</p>
          </div>
        )}

        {pending && !result && (
          <section className="rounded-2xl border border-white/10 bg-white/[.025] p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-300" />
            <p className="mt-3 text-sm font-medium text-white">Searching and synthesising live sources…</p>
            <p className="mt-1 text-xs text-zinc-500">This may take a little longer than normal Chat because Research checks multiple web results before writing the report.</p>
          </section>
        )}

        {result && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-violet-300" />Research report</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">{result.provider} · {result.model}</span>
              </div>
              <div className="prose-chat text-sm leading-7 text-zinc-200">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-violet-300 underline underline-offset-2">{children}</a>,
                    h1: ({ children }) => <h2 className="mb-2 mt-5 text-xl font-semibold text-white">{children}</h2>,
                    h2: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold text-white">{children}</h3>,
                    h3: ({ children }) => <h4 className="mb-1 mt-4 text-base font-semibold text-white">{children}</h4>,
                    p: ({ children }) => <p className="my-2">{children}</p>,
                    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  }}
                >{result.report}</ReactMarkdown>
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-white/10 bg-white/[.025] p-4">
              <h3 className="text-sm font-semibold text-white">Sources ({result.sources?.length || 0})</h3>
              <p className="mt-1 text-[11px] leading-5 text-zinc-600">These are the live web results supplied to the AI for this report.</p>
              <div className="mt-3 space-y-2">
                {(result.sources || []).map((source, index) => (
                  <a
                    key={`${source.url}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-white/10 bg-black/20 p-3 hover:bg-white/[.04]"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-[10px] font-semibold text-violet-300">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-medium text-zinc-200">{source.title || source.url}</p>
                        {source.snippet && <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-zinc-600">{source.snippet}</p>}
                        <span className="mt-2 flex items-center gap-1 text-[10px] text-violet-300">Open source <ExternalLink className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

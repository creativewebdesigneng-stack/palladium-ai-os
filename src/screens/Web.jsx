import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerFn } from '@tanstack/react-start';
import { ExternalLink, Globe2, ImageIcon, Loader2, Search, ShieldCheck, Sparkles, Video } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { searchWeb } from '@/lib/ai/web-discovery.functions';
import { friendlyMessage } from '@/lib/errors';

function hostname(value) {
  try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return value; }
}

export default function Web() {
  const navigate = useNavigate();
  const searchFn = useServerFn(searchWeb);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const submit = async (event) => {
    event?.preventDefault?.();
    const value = query.trim();
    if (pending || value.length < 2) return;
    setPending(true);
    setError(null);
    try {
      const response = await searchFn({ data: { query: value, limit: 8 } });
      setResult(response);
    } catch (requestError) {
      console.error('[Web] live search failed', requestError);
      setError(friendlyMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Discovery"
        title="PalladiumAI Web"
        description="Search the live public web through PalladiumAI's server-side discovery layer. Every displayed result comes from a real provider response and links to its original source."
      />

      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
          <form onSubmit={submit}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  maxLength={300}
                  placeholder="Search the live web…"
                  className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
                />
              </div>
              <button
                type="submit"
                disabled={pending || query.trim().length < 2}
                className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
                {pending ? 'Searching…' : 'Search web'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-zinc-600">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Public HTTP(S) sources only</span>
              <span>Up to 8 source-backed results</span>
              <span>Search activity is usage-recorded and audited</span>
            </div>
          </form>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 text-sm text-rose-100">
            <p className="font-medium">Web search failed</p>
            <p className="mt-1 text-xs text-rose-100/70">{error}</p>
          </div>
        )}

        {pending && !result && (
          <section className="rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-300" />
            <p className="mt-3 text-sm font-medium text-white">Searching live public sources…</p>
          </section>
        )}

        {result && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Live web results</h2>
                  <p className="mt-1 text-[11px] text-zinc-600">{result.results?.length ?? 0} result(s) for “{result.query}”</p>
                </div>
                <button
                  onClick={() => navigate('/search')}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-500/[.08] px-3 py-2 text-[11px] font-medium text-violet-200 hover:bg-violet-500/15"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Deep Research
                </button>
              </div>

              {(result.results ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">No public results were returned.</div>
              ) : (
                <div className="space-y-2.5">
                  {result.results.map((source, index) => (
                    <a
                      key={`${source.url}-${index}`}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/20 hover:bg-white/[.035]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-[11px] font-semibold text-violet-300">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-100">{source.title || source.url}</p>
                          <p className="mt-1 truncate text-[10px] text-emerald-400/70">{hostname(source.url)}</p>
                          {source.snippet && <p className="mt-2 text-xs leading-5 text-zinc-500">{source.snippet}</p>}
                          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-violet-300">Open source <ExternalLink className="h-3 w-3" /></span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <h3 className="text-sm font-semibold text-white">What is live</h3>
                <div className="mt-3 space-y-2 text-[11px] leading-5 text-zinc-500">
                  <p><span className="font-medium text-emerald-300">Web results:</span> live and source-backed.</p>
                  <p><span className="font-medium text-emerald-300">Video queries:</span> supported as public web links; YouTube-oriented searches are prioritised when requested.</p>
                  <p><span className="font-medium text-zinc-300">Images:</span> not exposed here until a dedicated image-search provider returns real image metadata.</p>
                  <p><span className="font-medium text-zinc-300">Publication dates:</span> not shown unless the provider can supply them reliably.</p>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <h3 className="text-sm font-semibold text-white">More discovery</h3>
                <div className="mt-3 space-y-2">
                  <button onClick={() => navigate('/search')} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/[.04]">Research — synthesise and cite multiple live sources</button>
                  <button onClick={() => navigate('/knowledge')} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/[.04]">Knowledge — search your private indexed documents</button>
                </div>
              </section>

              <section className="rounded-2xl border border-dashed border-white/10 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400"><ImageIcon className="h-4 w-4" />Image search</div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-600">Disabled until source-backed image results are available.</p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-zinc-400"><Video className="h-4 w-4" />Video search</div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-600">Use a video/YouTube query above; results remain ordinary verified external links.</p>
              </section>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

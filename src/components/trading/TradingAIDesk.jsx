import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import ReactMarkdown from 'react-markdown';
import { BrainCircuit, ExternalLink, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { runTradingIntelligence } from '@/lib/trading/trading-ai.functions';

const ROLES = [
  ['market-analyst', 'Market'],
  ['macro-analyst', 'Macro'],
  ['fundamental-analyst', 'Fundamental'],
  ['news-analyst', 'News'],
  ['risk-controller', 'Risk'],
  ['portfolio-analyst', 'Portfolio'],
];

export default function TradingAIDesk() {
  const deskFn = useServerFn(runTradingIntelligence);
  const [symbol, setSymbol] = useState('');
  const [query, setQuery] = useState('Assess the current thesis, catalysts, counterarguments and major risks. What evidence would invalidate the thesis?');
  const [roles, setRoles] = useState(['market-analyst', 'news-analyst', 'risk-controller']);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const toggle = (role) => setRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]);
  const run = async (event) => {
    event?.preventDefault?.();
    if (pending || query.trim().length < 5) return;
    setPending(true);
    setError(null);
    try {
      setResult(await deskFn({ data: { query, symbol, roles } }));
    } catch (requestError) {
      setError(friendlyMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-cyan-300" /><h2 className="font-medium text-white">AI Market Desk</h2></div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Run source-backed market research through specialist AI lenses. The desk uses live public evidence and Blackstar's configured model gateway; it does not place trades.</p>
        </div>
        <span className="flex w-fit items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-2.5 py-1 text-[9px] uppercase tracking-[.12em] text-emerald-100"><ShieldCheck className="h-3 w-3" />Research only</span>
      </div>

      <form onSubmit={run} className="mt-4 space-y-3">
        <div className="grid gap-2 md:grid-cols-[190px_minmax(0,1fr)]">
          <input value={symbol} onChange={(event) => setSymbol(event.target.value)} maxLength={30} placeholder="Symbol / pair (optional)" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-cyan-300/25" />
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={3} maxLength={700} className="resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs leading-5 text-white outline-none placeholder:text-zinc-700 focus:border-cyan-300/25" />
        </div>
        <div className="flex flex-wrap gap-1.5">{ROLES.map(([id, label]) => <button type="button" key={id} onClick={() => toggle(id)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] transition ${roles.includes(id) ? 'border-cyan-300/25 bg-cyan-300/[.07] text-cyan-100' : 'border-white/[.07] bg-black/20 text-zinc-600 hover:text-white'}`}>{label}</button>)}</div>
        <button type="submit" disabled={pending || query.trim().length < 5} className="flex items-center gap-2 rounded-xl bg-cyan-500/90 px-4 py-2.5 text-xs font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{pending ? 'Running desk…' : 'Run AI desk'}</button>
      </form>

      {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.05] p-3 text-xs text-rose-100">{error}</div>}
      {result && <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/[.07] pb-3"><span className="flex items-center gap-2 text-xs font-semibold text-white"><Sparkles className="h-3.5 w-3.5 text-cyan-300" />Desk synthesis</span><span className="text-[9px] uppercase tracking-[.1em] text-zinc-600">{result.provider} · {result.model}</span></div>
          <div className="prose-chat text-xs leading-6 text-zinc-300"><ReactMarkdown components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-2">{children}</a>, h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-white">{children}</h3>, h3: ({ children }) => <h4 className="mb-1 mt-3 text-sm font-semibold text-white">{children}</h4>, strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>, ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>, ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol> }}>{result.report}</ReactMarkdown></div>
        </div>
        <aside className="h-fit rounded-2xl border border-white/[.07] bg-black/20 p-4"><h3 className="text-xs font-semibold text-white">Evidence ({result.sources?.length || 0})</h3><p className="mt-1 text-[10px] leading-4 text-zinc-600">Current public sources supplied to the desk. Verify critical market facts against primary filings, venues and providers.</p><div className="mt-3 max-h-[540px] space-y-2 overflow-y-auto pr-1">{(result.sources || []).map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/[.06] bg-white/[.018] p-3 hover:border-cyan-300/15"><div className="flex gap-2"><span className="text-[9px] font-semibold text-cyan-300">{index + 1}</span><div className="min-w-0 flex-1"><p className="line-clamp-2 text-[11px] font-medium text-zinc-200">{source.title || source.url}</p><span className="mt-1 inline-flex items-center gap-1 text-[9px] text-zinc-600">Open <ExternalLink className="h-2.5 w-2.5" /></span></div></div></a>)}</div></aside>
      </div>}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Globe2, Loader2, Radar, Search, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { createWebIntelligenceJob, getWebIntelligenceOverview } from '@/lib/web/web-intelligence.functions';
import { friendlyMessage } from '@/lib/errors';

export default function WebIntelligence() {
  const { session } = useWorkspace();
  const [overview, setOverview] = useState(null);
  const [provider, setProvider] = useState('firecrawl');
  const [operation, setOperation] = useState('scrape');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    if (session !== 'yes') return;
    try { setOverview(await getWebIntelligenceOverview({ data: undefined })); }
    catch (e) { setError(e); }
  };
  useEffect(() => { load(); }, [session]);

  const submit = async (event) => {
    event.preventDefault();
    if (!source.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await createWebIntelligenceJob({ data: { provider, operation, source: source.trim(), limit: 20 } });
      setSource('');
      await load();
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  };

  const caps = overview?.capabilities;
  const jobs = overview?.jobs ?? [];
  return <>
    <PageHeader eyebrow="Discovery" title="Web Intelligence" description="Firecrawl-style search/scrape and Crawlee-style crawling through PalladiumAI's authenticated, audited web automation layer." />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="mb-4 flex items-center gap-2"><Radar className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">Start a web job</h2></div>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Provider"><select value={provider} onChange={(e) => { setProvider(e.target.value); if (e.target.value === 'crawlee' && operation === 'search') setOperation('scrape'); }} className="field"><option value="firecrawl">Firecrawl</option><option value="crawlee">Crawlee worker</option></select></Field>
              <Field label="Operation"><select value={operation} onChange={(e) => setOperation(e.target.value)} className="field">{provider === 'firecrawl' && <option value="search">Search</option>}<option value="scrape">Scrape</option><option value="crawl">Crawl</option></select></Field>
            </div>
            <Field label={operation === 'search' ? 'Search query' : 'Public target URL'}><input value={source} onChange={(e)=>setSource(e.target.value)} className="field" placeholder={operation === 'search' ? 'AI agent commerce trends' : 'https://example.com/docs'} /></Field>
            <button disabled={busy || !source.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : operation === 'search' ? <Search className="h-4 w-4"/> : <Globe2 className="h-4 w-4"/>}Run real job</button>
          </form>
          {error && <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{friendlyMessage(error)}</p>}
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <h2 className="text-sm font-semibold text-white">Recent web jobs</h2>
          <div className="mt-3 space-y-2">{jobs.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No web automation jobs yet.</p> : jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-white">{job.operation} · {job.provider}</span><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{job.status}</span><span className="ml-auto text-[10px] text-zinc-600">{new Date(job.created_at).toLocaleString()}</span></div><p className="mt-2 truncate text-[11px] text-zinc-500">{job.source}</p>{job.error && <p className="mt-1 text-[10px] text-rose-300">{job.error}</p>}</div>)}</div>
        </section>
      </div>
      <aside className="space-y-4">
        <Capability label="Firecrawl" configured={caps?.firecrawl?.configured} detail="Search, scrape and crawl with LLM-ready output." />
        <Capability label="Crawlee worker" configured={caps?.crawlee?.configured} detail="Reliable HTTP/browser crawling via your own worker." />
        <Capability label="Browser Use" configured={caps?.browserUse?.configured} detail="Agent-driven browser automation remains connected to the existing Browser Runtime." />
        <Capability label="OpenHands" configured={caps?.openHands?.configured} detail="Coding-agent server support is reused by PalladiumAI's developer and agent runtime layers." />
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.05] p-4 text-[11px] leading-5 text-emerald-100/75"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-300"/>Private/local network targets are blocked before jobs are submitted, reducing SSRF risk.</div>
      </aside>
    </div>
    <style>{`.field{width:100%;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.75rem;padding:.65rem .75rem;font-size:.75rem;color:white;outline:none}.field:focus{border-color:rgba(167,139,250,.45)}.field option{background:#11131a}`}</style>
  </>;
}

function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</span>{children}</label>; }
function Capability({ label, configured, detail }) { return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-white">{label}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] ${configured ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-400/20 text-amber-300'}`}>{configured ? 'Configured' : 'Needs env'}</span></div><p className="mt-2 text-[11px] leading-5 text-zinc-500">{detail}</p></div>; }

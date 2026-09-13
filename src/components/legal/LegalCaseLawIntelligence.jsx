import{useMemo,useState}from'react';import{AlertTriangle,ExternalLink,Gavel,Loader2,Search,ShieldCheck}from'lucide-react';import{runCaseLawIntelligence}from'@/lib/legal/legal-case-law.functions';import{CASE_LAW_SOURCES}from'@/lib/legal/case-law-sources';

export default function LegalCaseLawIntelligence(){
  const[query,setQuery]=useState('');
  const[jurisdiction,setJurisdiction]=useState('United Kingdom');
  const[citation,setCitation]=useState('');
  const[court,setCourt]=useState('');
  const[result,setResult]=useState(null);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const profile=useMemo(()=>CASE_LAW_SOURCES.find(x=>x.jurisdiction===jurisdiction),[jurisdiction]);

  async function run(e){
    e.preventDefault();setBusy(true);setError('');
    try{setResult(await runCaseLawIntelligence({data:{query,jurisdiction,citation:citation||undefined,court:court||undefined}}));}
    catch(e){setError(e instanceof Error?e.message:'Case-law research failed.');}
    finally{setBusy(false);}
  }

  return <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Gavel className="h-4 w-4 text-cyan-300"/><h2 className="font-medium text-white">Case-Law Intelligence</h2></div><p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Find and analyse live case-law evidence using configured official judiciary and legal-publication sources. Blackstar separates configured official evidence from discovery-only material and does not treat search results as proof that a case is binding or still good law.</p></div>
      <div className="rounded-xl border border-amber-300/15 bg-amber-400/[.04] px-3 py-2 text-[10px] leading-4 text-amber-100/70">Later treatment, appeals, distinguishing and jurisdictional applicability still require verification.</div>
    </div>

    <form onSubmit={run} className="mt-4 grid gap-2 xl:grid-cols-[1.4fr_220px_190px_190px_auto]">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3"><Search className="h-3.5 w-3.5 text-zinc-600"/><input required minLength={3} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Issue, party names or legal principle" className="w-full bg-transparent py-2.5 text-xs text-white outline-none"/></div>
      <select value={jurisdiction} onChange={e=>setJurisdiction(e.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white">{CASE_LAW_SOURCES.map(x=><option key={x.id}>{x.jurisdiction}</option>)}</select>
      <input value={citation} onChange={e=>setCitation(e.target.value)} placeholder="Citation (optional)" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none"/>
      <input value={court} onChange={e=>setCourt(e.target.value)} placeholder="Court (optional)" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none"/>
      <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] px-4 py-2 text-xs text-cyan-100">{busy?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Gavel className="h-3.5 w-3.5"/>}Find authorities</button>
    </form>

    {profile&&<div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr]"><div className="rounded-xl border border-white/[.05] bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Configured hierarchy</p><p className="mt-1 text-[11px] leading-5 text-zinc-400">{profile.hierarchy.join(' → ')}</p></div><div className="rounded-xl border border-white/[.05] bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Coverage boundary</p><p className="mt-1 text-[11px] leading-5 text-zinc-400">{profile.coverageNote}</p></div></div>}

    {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
    {result&&<div className="mt-5 grid gap-4 xl:grid-cols-[1fr_330px]">
      <article className="whitespace-pre-wrap rounded-2xl border border-white/[.06] bg-black/20 p-4 text-xs leading-6 text-zinc-300">{result.report}</article>
      <aside className="space-y-3">
        <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300"/><p className="text-xs text-zinc-300">Configured official evidence {result.official_source_count}/{result.source_count}</p></div><p className="mt-1 text-[10px] leading-4 text-zinc-600">Official-source status identifies provenance only. It does not establish precedential weight, binding effect, factual applicability or current treatment.</p></div>
        <div><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Evidence sources</p><div className="mt-2 space-y-2">{result.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/[.06] bg-black/20 p-3 hover:border-cyan-300/20"><div className="flex gap-2"><p className="flex-1 text-xs text-zinc-300">{s.title}</p><ExternalLink className="h-3 w-3 text-zinc-700"/></div><div className="mt-2 flex items-center justify-between gap-2"><span className={s.official?'rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-2 py-0.5 text-[9px] text-emerald-200':'rounded-full border border-amber-300/15 bg-amber-300/[.04] px-2 py-0.5 text-[9px] text-amber-200'}>{s.official?'Configured official source':'Discovery only'}</span><p className="min-w-0 flex-1 truncate text-right text-[9px] text-zinc-700">{s.url}</p></div></a>)}</div></div>
        <div className="flex gap-2 rounded-xl border border-amber-300/10 bg-amber-400/[.025] p-3 text-[10px] leading-4 text-amber-100/60"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0"/>Use a qualified lawyer or citator-grade research process to verify treatment and applicability before a consequential decision.</div>
      </aside>
    </div>}
  </section>;
}

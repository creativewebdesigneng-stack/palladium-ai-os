import{useMemo,useState}from'react';import{AlertTriangle,ExternalLink,FileCheck2,Globe2,Loader2,Search,ShieldCheck}from'lucide-react';import{runTreatyIntelligence}from'@/lib/legal/legal-treaty.functions';import{TREATY_SOURCE_PROFILES}from'@/lib/legal/treaty-sources';

const FOCUS_OPTIONS=[['all','Full status review'],['text','Treaty text'],['party-status','Party status'],['entry-into-force','Entry into force'],['reservations','Reservations / declarations'],['termination','Withdrawal / termination'],['domestic-effect','Domestic effect']];

export default function LegalTreatyIntelligence(){
  const[query,setQuery]=useState('');
  const[jurisdiction,setJurisdiction]=useState('International / United Nations');
  const[party,setParty]=useState('');
  const[statusFocus,setStatusFocus]=useState('all');
  const[result,setResult]=useState(null);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const profile=useMemo(()=>TREATY_SOURCE_PROFILES.find(x=>x.jurisdiction===jurisdiction),[jurisdiction]);

  async function run(e){
    e.preventDefault();setBusy(true);setError('');
    try{setResult(await runTreatyIntelligence({data:{query,jurisdiction,party:party||undefined,statusFocus}}));}
    catch(e){setError(e instanceof Error?e.message:'Treaty research failed.');}
    finally{setBusy(false);}
  }

  return <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-violet-300"/><h2 className="font-medium text-white">Treaty Intelligence</h2></div><p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Research treaty texts, party status and treaty actions against configured government and depositary sources. Blackstar keeps the instrument, international status and domestic legal effect as separate evidence questions.</p></div>
      <div className="max-w-sm rounded-xl border border-amber-300/15 bg-amber-400/[.04] px-3 py-2 text-[10px] leading-4 text-amber-100/70">A signature or treaty text does not prove that a state is currently bound, and international binding status does not by itself prove domestic enforceability.</div>
    </div>

    <form onSubmit={run} className="mt-4 grid gap-2 xl:grid-cols-[1.3fr_230px_190px_190px_auto]">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3"><Search className="h-3.5 w-3.5 text-zinc-600"/><input required minLength={3} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Treaty name, subject or status question" className="w-full bg-transparent py-2.5 text-xs text-white outline-none"/></div>
      <select value={jurisdiction} onChange={e=>setJurisdiction(e.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white">{TREATY_SOURCE_PROFILES.map(x=><option key={x.id}>{x.jurisdiction}</option>)}</select>
      <input value={party} onChange={e=>setParty(e.target.value)} placeholder="Party / state (optional)" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none"/>
      <select value={statusFocus} onChange={e=>setStatusFocus(e.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white">{FOCUS_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.06] px-4 py-2 text-xs text-violet-100">{busy?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<FileCheck2 className="h-3.5 w-3.5"/>}Research treaty</button>
    </form>

    {profile&&<div className="mt-3 grid gap-2 md:grid-cols-2"><div className="rounded-xl border border-white/[.05] bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Status checks</p><p className="mt-1 text-[11px] leading-5 text-zinc-400">{profile.statusChecks.join(' · ')}</p></div><div className="rounded-xl border border-white/[.05] bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Domestic-effect boundary</p><p className="mt-1 text-[11px] leading-5 text-zinc-400">{profile.domesticEffectNote}</p></div></div>}

    {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
    {result&&<div className="mt-5 grid gap-4 xl:grid-cols-[1fr_340px]">
      <article className="whitespace-pre-wrap rounded-2xl border border-white/[.06] bg-black/20 p-4 text-xs leading-6 text-zinc-300">{result.report}</article>
      <aside className="space-y-3">
        <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300"/><p className="text-xs text-zinc-300">Official evidence {result.official_source_count}/{result.source_count}</p></div><p className="mt-1 text-[10px] leading-4 text-zinc-600">Official-source provenance does not by itself establish current party status, domestic effect or applicability to particular facts.</p></div>
        <div><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Evidence sources</p><div className="mt-2 space-y-2">{result.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/[.06] bg-black/20 p-3 hover:border-violet-300/20"><div className="flex gap-2"><p className="flex-1 text-xs text-zinc-300">{s.title}</p><ExternalLink className="h-3 w-3 text-zinc-700"/></div><div className="mt-2 flex items-center justify-between gap-2"><span className={s.official?'rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-2 py-0.5 text-[9px] text-emerald-200':'rounded-full border border-amber-300/15 bg-amber-300/[.04] px-2 py-0.5 text-[9px] text-amber-200'}>{s.official?'Official host':'Discovery only'}</span><p className="min-w-0 flex-1 truncate text-right text-[9px] text-zinc-700">{s.url}</p></div></a>)}</div></div>
        <div className="space-y-2">{result.profile.gateways.map(g=><a key={g.url} href={g.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-white/[.05] p-3 text-[10px] text-zinc-400 hover:border-violet-300/15"><ExternalLink className="h-3 w-3"/><span>{g.name}</span></a>)}</div>
        <div className="flex gap-2 rounded-xl border border-amber-300/10 bg-amber-400/[.025] p-3 text-[10px] leading-4 text-amber-100/60"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0"/>For consequential decisions, verify depositary records, current treaty actions, reservations and implementing law, and use qualified legal advice where needed.</div>
      </aside>
    </div>}
  </section>;
}

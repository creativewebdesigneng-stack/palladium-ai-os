import { useMemo, useState } from 'react';
import { Scale, GitCompareArrows, ExternalLink, ShieldCheck, Globe2 } from 'lucide-react';
import { JURISDICTIONS, AUTHORITY_ORDER, JURISDICTION_COVERAGE_TIERS } from '@/lib/legal/jurisdictions';

export default function LegalJurisdictionIntelligence() {
  const [a, setA] = useState('uk');
  const [b, setB] = useState('eu');
  const left = useMemo(() => JURISDICTIONS.find((x) => x.id === a), [a]);
  const right = useMemo(() => JURISDICTIONS.find((x) => x.id === b), [b]);
  const regions = useMemo(() => new Set(JURISDICTIONS.map((item) => item.region)).size, []);

  return <div className="space-y-5">
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-violet-300"/><h2 className="font-medium text-white">Global jurisdiction registry</h2></div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">{JURISDICTIONS.length} jurisdiction profiles across {regions} regions. Coverage depth describes Blackstar's curated official research entry points and legal-system context; it is not a claim that every law, court decision or local rule is encoded.</p>
        </div>
        <div className="rounded-xl border border-amber-300/10 bg-amber-300/[.04] px-3 py-2 text-[11px] leading-4 text-amber-100/70">Always verify current text, commencement, territorial scope, authority and facts before relying on a result.</div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {Object.entries(JURISDICTION_COVERAGE_TIERS).map(([key, tier]) => <div key={key} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-cyan-300/70">{tier.label}</p><p className="mt-1 text-[11px] leading-4 text-zinc-500">{tier.description}</p></div>)}
      </div>
    </section>

    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5">
      <div className="flex items-center gap-2"><GitCompareArrows className="h-4 w-4 text-cyan-300"/><h2 className="font-medium text-white">Jurisdiction comparison</h2></div>
      <p className="mt-1 text-xs text-zinc-500">Compare legal structure and verified research starting points before analysing substantive law.</p>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto_1fr]"><JurisdictionCard value={a} onChange={setA} item={left}/><div className="hidden items-center xl:flex"><Scale className="h-5 w-5 text-zinc-700"/></div><JurisdictionCard value={b} onChange={setB} item={right}/></div>
    </section>

    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5">
      <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><h2 className="font-medium text-white">Authority hierarchy</h2></div>
      <p className="mt-1 text-xs text-zinc-500">Use higher-authority and current primary sources first; the exact hierarchy varies by jurisdiction.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{AUTHORITY_ORDER.map((x,i)=><div key={x} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Priority {i+1}</p><p className="mt-1 text-xs text-zinc-300">{x}</p></div>)}</div>
    </section>
  </div>;
}

function JurisdictionCard({ value, onChange, item }) {
  const tier = item ? JURISDICTION_COVERAGE_TIERS[item.coverageTier] : null;
  return <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-sm text-white">{JURISDICTIONS.map((j)=><option key={j.id} value={j.id}>{j.name}</option>)}</select>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-violet-300/15 bg-violet-300/[.05] px-2 py-1 text-[10px] uppercase tracking-[.12em] text-violet-200/80">{item?.region}</span>
      <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[.05] px-2 py-1 text-[10px] uppercase tracking-[.12em] text-cyan-200/80">{tier?.label}</span>
      <span className="text-[10px] text-zinc-600">Reviewed {item?.reviewedOn}</span>
    </div>
    <p className="mt-3 text-xs uppercase tracking-[.14em] text-violet-300/70">{item?.system}</p>
    <div className="mt-3 flex flex-wrap gap-1.5">{item?.levels.map((x)=><span key={x} className="rounded-full border border-white/[.07] px-2 py-1 text-[10px] text-zinc-500">{x}</span>)}</div>
    <p className="mt-3 text-xs leading-5 text-zinc-400">{item?.notes}</p>
    <p className="mt-3 text-[10px] uppercase tracking-[.14em] text-zinc-600">Verified official entry points · {item?.primary.length}</p>
    <div className="mt-2 space-y-1">{item?.primary.map((url)=><a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between text-[11px] text-cyan-300/80 hover:text-cyan-200"><span>{new URL(url).hostname}</span><ExternalLink className="h-3 w-3"/></a>)}</div>
  </div>;
}

import { useMemo, useState } from 'react';
import { Gauge, CheckCircle2, AlertTriangle, ArrowRight, ClipboardCheck } from 'lucide-react';

const dimensions=[
 ['Strategy','Clear priorities, market choices and measurable outcomes'],
 ['Customer','Customer insight, proposition and experience discipline'],
 ['Operations','Documented, measurable and continuously improved processes'],
 ['Data','Trusted data, ownership, accessibility and decision use'],
 ['Technology','Fit-for-purpose platforms, integration and technical resilience'],
 ['Automation & AI','Governed automation and AI embedded in valuable workflows'],
 ['Workforce','Skills, capacity, accountability and change capability'],
 ['Risk & governance','Controls, ownership, assurance and escalation'],
 ['Supply chain','Supplier visibility, resilience and value-chain coordination'],
 ['Innovation','Repeatable discovery, experimentation and scaling'],
];

export default function IndustryMaturityAssessment(){
 const [scores,setScores]=useState(Object.fromEntries(dimensions.map(([d])=>[d,3])));
 const summary=useMemo(()=>{const vals=Object.values(scores).map(Number);const avg=vals.reduce((a,b)=>a+b,0)/vals.length;const weakest=[...dimensions].sort((a,b)=>scores[a[0]]-scores[b[0]]).slice(0,3).map(x=>x[0]);return {avg,weakest,level:avg<2?'Foundational':avg<3?'Developing':avg<4?'Established':avg<4.6?'Advanced':'Leading'}},[scores]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-sky-300"><ClipboardCheck className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Industry maturity assessment</span></div><div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-xl font-semibold text-white">Assess organisational readiness across ten operating dimensions</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">A deterministic self-assessment for prioritisation—not an external certification or audited benchmark.</p></div><div className="rounded-2xl border border-sky-300/15 bg-sky-300/[.04] px-5 py-3"><p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">Maturity</p><p className="mt-1 text-lg font-semibold text-white">{summary.level} · {summary.avg.toFixed(1)}/5</p></div></div>
 <div className="mt-5 grid gap-3 lg:grid-cols-2">{dimensions.map(([name,desc])=><div key={name} className="rounded-xl border border-white/[.06] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-zinc-200">{name}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{desc}</p></div><span className="text-sm font-semibold text-sky-300">{scores[name]}/5</span></div><input aria-label={name+' maturity'} type="range" min="1" max="5" step="1" value={scores[name]} onChange={e=>setScores(s=>({...s,[name]:Number(e.target.value)}))} className="mt-3 w-full"/></div>)}</div>
 <div className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.03] p-4"><div className="flex items-center gap-2 text-xs font-medium text-amber-100"><AlertTriangle className="h-4 w-4"/>Priority improvement lenses</div><div className="mt-3 flex flex-wrap gap-2">{summary.weakest.map(x=><span key={x} className="rounded-lg border border-white/[.07] px-2.5 py-1 text-xs text-zinc-400">{x}</span>)}</div><p className="mt-3 text-[10px] leading-4 text-zinc-600">Validate scores with evidence, owners and frontline stakeholders before using them for investment decisions.</p></div></section>
}

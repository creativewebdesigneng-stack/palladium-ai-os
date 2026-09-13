import { useMemo, useState } from 'react';
import { Gauge, Users, Workflow, Banknote, Contact, ShieldCheck, Cpu, BarChart3, Megaphone, PackageCheck } from 'lucide-react';

const dims=[
 ['Strategy',Gauge],['Sales',Contact],['Marketing',Megaphone],['Finance',Banknote],['People',Users],
 ['Operations',Workflow],['Technology & data',Cpu],['Risk & governance',ShieldCheck],['Analytics',BarChart3],['Supply chain',PackageCheck],
];
export default function CompanyHealthAssessment(){
 const [scores,setScores]=useState(Object.fromEntries(dims.map(([n])=>[n,3])));
 const summary=useMemo(()=>{const vals=Object.values(scores).map(Number);const avg=vals.reduce((a,b)=>a+b,0)/vals.length;const weakest=[...dims].sort((a,b)=>scores[a[0]]-scores[b[0]]).slice(0,3).map(x=>x[0]);return{avg,weakest,level:avg<2?'Fragile':avg<3?'Developing':avg<4?'Established':avg<4.6?'Strong':'High-performing'}},[scores]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <div className="flex items-center gap-2 text-sky-300"><Gauge className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Company health assessment</span></div>
  <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-xl font-semibold text-white">Find operating weaknesses before they become growth constraints</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">A self-assessment for prioritisation, not an audit or certification. Validate scores with company evidence and owners.</p></div><div className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-4 py-3"><p className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Overall</p><p className="mt-1 text-lg font-semibold text-white">{summary.level} · {summary.avg.toFixed(1)}/5</p></div></div>
  <div className="mt-5 grid gap-3 md:grid-cols-2">{dims.map(([name,Icon])=><div key={name} className="rounded-xl border border-white/[.06] p-3"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs text-zinc-300"><Icon className="h-3.5 w-3.5 text-sky-300"/>{name}</span><span className="text-xs font-medium text-white">{scores[name]}/5</span></div><input aria-label={name+' score'} type="range" min="1" max="5" step="1" value={scores[name]} onChange={e=>setScores(s=>({...s,[name]:Number(e.target.value)}))} className="mt-3 w-full"/></div>)}</div>
  <p className="mt-4 text-xs text-zinc-500">Priority attention: <span className="text-zinc-300">{summary.weakest.join(' · ')}</span></p>
 </section>
}

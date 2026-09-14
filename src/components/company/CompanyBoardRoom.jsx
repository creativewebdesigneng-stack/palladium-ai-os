import { useMemo, useState } from 'react';
import { Presentation, AlertTriangle, CircleDollarSign, Users, Target, ShieldCheck } from 'lucide-react';

const areas=[
 ['Commercial','Pipeline quality, retention, pricing and market position',Target],
 ['Financial','Cash, margin, runway, capital allocation and forecast quality',CircleDollarSign],
 ['Operations','Delivery, capacity, quality, resilience and transformation',Presentation],
 ['People','Leadership, capability, succession, engagement and workforce risk',Users],
 ['Risk','Top enterprise risks, controls, incidents and emerging exposures',ShieldCheck],
];

export default function CompanyBoardRoom(){
 const [notes,setNotes]=useState(Object.fromEntries(areas.map(([n])=>[n,''])));
 const [risk,setRisk]=useState(Object.fromEntries(areas.map(([n])=>[n,3])));
 const ranked=useMemo(()=>areas.map(([name])=>({name,risk:risk[name]})).sort((a,b)=>b.risk-a.risk),[risk]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-rose-300"><Presentation className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Executive & board intelligence</span></div><h2 className="mt-2 text-xl font-semibold text-white">Structure the company review around decisions</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Capture management context and attention levels across the board agenda. Inputs are private planning notes unless explicitly persisted elsewhere; Blackstar does not infer board-approved conclusions.</p>
 <div className="mt-5 grid gap-3 xl:grid-cols-2">{areas.map(([name,desc,Icon])=><article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-rose-300"/><h3 className="text-sm font-medium text-white">{name}</h3></div><label className="text-[10px] text-zinc-600">Attention <select value={risk[name]} onChange={e=>setRisk(v=>({...v,[name]:Number(e.target.value)}))} className="ml-1 rounded border border-white/[.08] bg-black px-1 py-0.5 text-zinc-300">{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></label></div><p className="mt-2 text-xs text-zinc-600">{desc}</p><textarea value={notes[name]} onChange={e=>setNotes(v=>({...v,[name]:e.target.value}))} placeholder="Management context, decision required, owner, evidence…" className="mt-3 min-h-20 w-full resize-y rounded-xl border border-white/[.07] bg-black/30 p-3 text-xs text-white outline-none placeholder:text-zinc-700"/></article>)}</div>
 <div className="mt-4 rounded-xl border border-rose-300/10 bg-rose-300/[.025] p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-300"/><p className="text-xs font-medium text-zinc-300">Highest attention area: {ranked[0]?.name}</p></div><p className="mt-1 text-[10px] text-zinc-600">Attention scores prioritise discussion only; validate material risks with Finance, Legal, Security and relevant accountable executives.</p></div></section>
}

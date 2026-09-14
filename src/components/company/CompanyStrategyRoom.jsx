import { useMemo, useState } from 'react';
import { Crosshair, TrendingUp, ShieldAlert, Users, Workflow, Banknote } from 'lucide-react';

const priorities=[
 ['Revenue growth','Pipeline, conversion, retention, pricing and expansion',TrendingUp],
 ['Margin improvement','Cost-to-serve, procurement, pricing, productivity and mix',Banknote],
 ['Operational scale','Capacity, process standardisation, automation and service quality',Workflow],
 ['Workforce capability','Roles, skills, leadership, AI augmentation and succession',Users],
 ['Risk reduction','Controls, resilience, compliance, cyber and concentration',ShieldAlert],
];

export default function CompanyStrategyRoom(){
 const [goal,setGoal]=useState('Grow revenue while protecting margin');
 const [horizon,setHorizon]=useState('12 months');
 const [selected,setSelected]=useState(['Revenue growth','Margin improvement']);
 const focus=useMemo(()=>priorities.filter(([n])=>selected.includes(n)),[selected]);
 const toggle=n=>setSelected(v=>v.includes(n)?v.filter(x=>x!==n):[...v,n]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <div className="flex items-center gap-2 text-cyan-300"><Crosshair className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Company strategy room</span></div>
  <h2 className="mt-2 text-xl font-semibold text-white">Turn company objectives into an operating agenda</h2>
  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Frame an objective, choose the transformation lenses that matter and use the resulting agenda to coordinate Blackstar's specialist systems. This is planning support, not a guarantee of commercial outcomes.</p>
  <div className="mt-5 grid gap-3 md:grid-cols-2"><label className="rounded-xl border border-white/[.07] bg-black/25 p-3"><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Primary objective</span><input value={goal} onChange={e=>setGoal(e.target.value)} className="mt-2 w-full bg-transparent text-sm text-white outline-none"/></label><label className="rounded-xl border border-white/[.07] bg-black/25 p-3"><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Planning horizon</span><input value={horizon} onChange={e=>setHorizon(e.target.value)} className="mt-2 w-full bg-transparent text-sm text-white outline-none"/></label></div>
  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{priorities.map(([name,text,Icon])=><button key={name} onClick={()=>toggle(name)} className={`rounded-2xl border p-4 text-left transition ${selected.includes(name)?'border-cyan-300/25 bg-cyan-300/[.06]':'border-white/[.07] bg-white/[.02]'}`}><Icon className="h-4 w-4 text-cyan-300"/><p className="mt-2 text-xs font-medium text-white">{name}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p></button>)}</div>
  <div className="mt-4 rounded-2xl border border-violet-300/10 bg-violet-300/[.025] p-4"><p className="text-[10px] uppercase tracking-[.12em] text-violet-300">Operating agenda · {horizon}</p><p className="mt-2 text-sm text-white">{goal || 'Define a company objective'}</p><div className="mt-3 flex flex-wrap gap-2">{focus.map(([name])=><span key={name} className="rounded-lg border border-white/[.07] px-2.5 py-1 text-xs text-zinc-400">{name}</span>)}</div></div>
 </section>
}

import { useMemo, useState } from 'react';
import { PackageCheck, ShieldAlert, CircleDollarSign, Truck, BadgeCheck } from 'lucide-react';

const defaults=[
 {name:'Supplier A',criticality:5,concentration:4,financial:3,delivery:3,quality:2,geo:4},
 {name:'Supplier B',criticality:3,concentration:2,financial:2,delivery:2,quality:2,geo:2},
];
export default function SupplierIntelligence(){
 const [rows,setRows]=useState(defaults);
 const scored=useMemo(()=>rows.map(r=>({...r,score:Math.round((r.criticality*.25+r.concentration*.2+r.financial*.15+r.delivery*.15+r.quality*.1+r.geo*.15)*20)})),[rows]);
 const change=(i,k,v)=>setRows(a=>a.map((r,j)=>j===i?{...r,[k]:k==='name'?v:Number(v)}:r));
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-lime-300"><PackageCheck className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Procurement & supplier intelligence</span></div><h2 className="mt-2 text-xl font-semibold text-white">Prioritise supplier due diligence and resilience work</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">A deterministic risk triage model. Scores identify where investigation is warranted; they are not supplier credit ratings or verified facts.</p>
 <div className="mt-5 grid gap-3">{scored.map((r,i)=><div key={i} className="rounded-2xl border border-white/[.07] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><input aria-label="Supplier name" value={r.name} onChange={e=>change(i,'name',e.target.value)} className="bg-transparent text-sm font-medium text-white outline-none"/><span className={`rounded-full border px-2.5 py-1 text-xs ${r.score>=70?'border-rose-300/20 text-rose-300':r.score>=45?'border-amber-300/20 text-amber-300':'border-emerald-300/20 text-emerald-300'}`}>Triage risk {r.score}/100</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{[['criticality','Criticality'],['concentration','Concentration'],['financial','Financial'],['delivery','Delivery'],['quality','Quality'],['geo','Geopolitical']].map(([k,l])=><label key={k}><span className="text-[9px] uppercase tracking-[.08em] text-zinc-700">{l}</span><input type="range" min="1" max="5" value={r[k]} onChange={e=>change(i,k,e.target.value)} className="mt-2 w-full"/></label>)}</div></div>)}</div>
 <div className="mt-4 grid gap-3 md:grid-cols-3"><Note icon={CircleDollarSign} title="Commercial" text="Cost, payment terms, financial health and switching economics."/><Note icon={Truck} title="Continuity" text="Capacity, lead time, logistics, alternatives and recovery paths."/><Note icon={BadgeCheck} title="Assurance" text="Quality, compliance, cyber, provenance and contractual evidence."/></div></section>
}
function Note({icon:Icon,title,text}){return <div className="rounded-xl border border-white/[.06] p-3"><Icon className="h-4 w-4 text-lime-300"/><p className="mt-2 text-xs text-zinc-300">{title}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p></div>}

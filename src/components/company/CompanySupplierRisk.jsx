import { useMemo, useState } from 'react';
import { ShieldCheck, Truck, AlertTriangle, PackageCheck, BadgeDollarSign } from 'lucide-react';

const seed=[
 {name:'Critical supplier A',spend:35,criticality:5,resilience:2},
 {name:'Core services B',spend:25,criticality:4,resilience:4},
 {name:'Technology vendor C',spend:20,criticality:4,resilience:3},
 {name:'General supplier D',spend:20,criticality:2,resilience:4},
];

export default function CompanySupplierRisk(){
 const [rows,setRows]=useState(seed);
 const ranked=useMemo(()=>rows.map(r=>({...r,risk:r.criticality*(6-r.resilience)})).sort((a,b)=>b.risk-a.risk),[rows]);
 const concentration=Math.max(...rows.map(r=>r.spend),0);
 const update=(i,k,v)=>setRows(rs=>rs.map((r,x)=>x===i?{...r,[k]:Number(v)}:r));
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-amber-300"><Truck className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Supplier & procurement intelligence</span></div><h2 className="mt-2 text-xl font-semibold text-white">Map supplier concentration and resilience</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Prioritise supplier review using user-entered spend share, criticality and resilience. This does not replace due diligence, procurement controls, sanctions screening or contract/legal review.</p>
 <div className="mt-5 space-y-2">{rows.map((r,i)=><div key={r.name} className="grid gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3 md:grid-cols-[1.5fr_1fr_1fr_1fr]"><div><p className="text-xs font-medium text-white">{r.name}</p><p className="mt-1 text-[10px] text-zinc-600">Illustrative supplier record</p></div><Control label="Spend share %" value={r.spend} set={v=>update(i,'spend',v)} min="0" max="100"/><Control label="Criticality 1–5" value={r.criticality} set={v=>update(i,'criticality',v)} min="1" max="5"/><Control label="Resilience 1–5" value={r.resilience} set={v=>update(i,'resilience',v)} min="1" max="5"/></div>)}</div>
 <div className="mt-4 grid gap-3 md:grid-cols-3"><Stat icon={AlertTriangle} label="Highest review priority" value={ranked[0]?.name || 'None'}/><Stat icon={BadgeDollarSign} label="Largest spend concentration" value={concentration.toFixed(1)+'%'}/><Stat icon={ShieldCheck} label="Control" value="Validate suppliers with evidence"/></div></section>
}
function Control({label,value,set,min,max}){return <label><span className="text-[9px] uppercase tracking-[.08em] text-zinc-700">{label}</span><input type="number" min={min} max={max} value={value} onChange={e=>set(e.target.value)} className="mt-1 w-full rounded-lg border border-white/[.07] bg-black/30 px-2 py-1.5 text-xs text-white outline-none"/></label>}
function Stat({icon:Icon,label,value}){return <div className="rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3"><Icon className="h-4 w-4 text-amber-300"/><p className="mt-2 text-[10px] uppercase tracking-[.1em] text-zinc-700">{label}</p><p className="mt-1 text-xs text-zinc-300">{value}</p></div>}

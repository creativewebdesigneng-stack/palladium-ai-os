import { useMemo, useState } from 'react';
import { Gauge, CircleDollarSign, Users, HeartHandshake, Workflow, ShieldCheck } from 'lucide-react';

const metrics=[
 ['Revenue growth %','8',CircleDollarSign,'Commercial momentum'],
 ['Gross margin %','42',Gauge,'Economic quality'],
 ['Customer retention %','91',HeartHandshake,'Customer durability'],
 ['On-time delivery %','94',Workflow,'Operating reliability'],
 ['Employee retention %','88',Users,'Workforce stability'],
 ['Control completion %','96',ShieldCheck,'Governance execution'],
];

export default function CompanyKPIDashboard(){
 const [values,setValues]=useState(Object.fromEntries(metrics.map(([n,v])=>[n,v])));
 const signals=useMemo(()=>metrics.map(([name,,Icon,meaning])=>({name,Icon,meaning,value:Number(values[name])||0})),[values]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-emerald-300"><Gauge className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Executive KPI cockpit</span></div><h2 className="mt-2 text-xl font-semibold text-white">A reusable company scorecard</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Enter company metrics to structure an executive review. Values are user supplied until connected to an authoritative company data source; Blackstar does not label them live automatically.</p>
 <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{signals.map(({name,Icon,meaning,value})=><div key={name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-emerald-300"/><input aria-label={name} value={values[name]} onChange={e=>setValues(v=>({...v,[name]:e.target.value}))} inputMode="decimal" className="w-20 rounded-lg border border-white/[.07] bg-black/30 px-2 py-1 text-right text-sm text-white outline-none"/></div><p className="mt-3 text-xs font-medium text-white">{name}</p><p className="mt-1 text-[10px] text-zinc-600">{meaning} · current input {value.toFixed(1)}</p></div>)}</div>
 </section>
}

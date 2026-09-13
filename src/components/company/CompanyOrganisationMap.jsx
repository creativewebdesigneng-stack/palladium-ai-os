import { useMemo, useState } from 'react';
import { Building2, Users, Gauge, AlertTriangle, ArrowRight, Network } from 'lucide-react';

const defaultDepartments=[
 {name:'Sales',owner:'Commercial',health:4,priority:'Grow qualified pipeline'},
 {name:'Marketing',owner:'Growth',health:3,priority:'Improve demand efficiency'},
 {name:'Operations',owner:'COO',health:4,priority:'Increase throughput'},
 {name:'Finance',owner:'CFO',health:4,priority:'Protect cash and margin'},
 {name:'People',owner:'People',health:3,priority:'Close capability gaps'},
 {name:'Technology',owner:'CTO',health:3,priority:'Reduce technical friction'},
];

export default function CompanyOrganisationMap(){
 const [departments,setDepartments]=useState(defaultDepartments);
 const avg=useMemo(()=>departments.reduce((s,d)=>s+d.health,0)/departments.length,[departments]);
 const weakest=useMemo(()=>[...departments].sort((a,b)=>a.health-b.health)[0],[departments]);
 const setHealth=(i,v)=>setDepartments(ds=>ds.map((d,x)=>x===i?{...d,health:Number(v)}:d));
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-violet-300"><Network className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Organisation intelligence</span></div><h2 className="mt-2 text-xl font-semibold text-white">Department health and operating ownership</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Map functional health, accountability and the next operating priority. Scores are internal planning inputs, not externally verified performance ratings.</p>
 <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{departments.map((d,i)=><article key={d.name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-violet-300"/><h3 className="text-sm font-medium text-white">{d.name}</h3></div><span className="text-xs text-zinc-500">{d.health}/5</span></div><p className="mt-2 text-[10px] uppercase tracking-[.1em] text-zinc-700">Owner · {d.owner}</p><p className="mt-2 text-xs text-zinc-400">{d.priority}</p><input aria-label={d.name+' health'} type="range" min="1" max="5" value={d.health} onChange={e=>setHealth(i,e.target.value)} className="mt-4 w-full"/></article>)}</div>
 <div className="mt-4 grid gap-3 md:grid-cols-3"><Stat icon={Gauge} label="Average functional health" value={avg.toFixed(1)+'/5'}/><Stat icon={AlertTriangle} label="Priority function" value={weakest.name}/><Stat icon={ArrowRight} label="Next focus" value={weakest.priority}/></div></section>
}
function Stat({icon:Icon,label,value}){return <div className="rounded-xl border border-white/[.06] p-3"><Icon className="h-4 w-4 text-violet-300"/><p className="mt-2 text-[10px] uppercase tracking-[.1em] text-zinc-700">{label}</p><p className="mt-1 text-xs text-zinc-300">{value}</p></div>}

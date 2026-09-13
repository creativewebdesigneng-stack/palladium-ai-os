import { useMemo, useState } from 'react';
import { ShieldAlert, ServerCrash, Banknote, Users, Truck, LockKeyhole } from 'lucide-react';

const lenses=[
 ['Liquidity shock',Banknote,3,4],['Key supplier failure',Truck,3,3],['Cyber/service outage',ServerCrash,4,4],['Key-person loss',Users,3,3],['Data/control failure',LockKeyhole,3,4],
];

export default function CompanyResilienceMap(){
 const [rows,setRows]=useState(lenses.map(([name,Icon,likelihood,impact])=>({name,Icon,likelihood,impact})));
 const ranked=useMemo(()=>rows.map(r=>({...r,score:r.likelihood*r.impact})).sort((a,b)=>b.score-a.score),[rows]);
 const update=(i,k,v)=>setRows(rs=>rs.map((r,x)=>x===i?{...r,[k]:Number(v)}:r));
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-orange-300"><ShieldAlert className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Company risk & resilience</span></div><h2 className="mt-2 text-xl font-semibold text-white">Prioritise resilience scenarios</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Use likelihood × impact as a simple prioritisation lens, then route detailed controls to the appropriate Blackstar system. It is not a substitute for formal enterprise-risk, actuarial or regulatory assessment.</p>
 <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{rows.map((r,i)=><article key={r.name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><r.Icon className="h-4 w-4 text-orange-300"/><h3 className="mt-2 text-xs font-medium text-white">{r.name}</h3><Control label="Likelihood" value={r.likelihood} set={v=>update(i,'likelihood',v)}/><Control label="Impact" value={r.impact} set={v=>update(i,'impact',v)}/><p className="mt-3 text-[10px] text-zinc-600">Priority score <span className="text-zinc-300">{r.likelihood*r.impact}/25</span></p></article>)}</div>
 <div className="mt-4 rounded-xl border border-orange-300/10 bg-orange-300/[.025] p-3 text-xs text-zinc-400">Highest current scenario: <span className="text-orange-200">{ranked[0]?.name}</span> · score {ranked[0]?.score}/25. Define prevention, response owner, recovery target, dependencies and evidence before treating the risk as controlled.</div></section>
}
function Control({label,value,set}){return <label className="mt-3 block"><span className="text-[9px] uppercase tracking-[.08em] text-zinc-700">{label} {value}/5</span><input type="range" min="1" max="5" value={value} onChange={e=>set(e.target.value)} className="mt-1 w-full"/></label>}

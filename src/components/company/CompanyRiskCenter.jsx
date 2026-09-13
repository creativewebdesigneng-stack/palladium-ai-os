import { useMemo, useState } from 'react';
import { ShieldAlert, Siren, LockKeyhole, PackageCheck, Banknote, Scale } from 'lucide-react';

const defaults=[
 {name:'Revenue concentration',impact:4,likelihood:3,owner:'Commercial'},
 {name:'Cyber / system outage',impact:5,likelihood:2,owner:'Technology'},
 {name:'Critical supplier failure',impact:4,likelihood:2,owner:'Operations'},
 {name:'Cash / liquidity pressure',impact:5,likelihood:2,owner:'Finance'},
];
export default function CompanyRiskCenter(){
 const [rows,setRows]=useState(defaults);
 const ranked=useMemo(()=>rows.map(r=>({...r,score:r.impact*r.likelihood})).sort((a,b)=>b.score-a.score),[rows]);
 const change=(i,k,v)=>setRows(a=>a.map((r,j)=>j===i?{...r,[k]:['impact','likelihood'].includes(k)?Number(v):v}:r));
 return <section className="rounded-[26px] border border-rose-300/10 bg-rose-300/[.02] p-5 lg:p-6">
  <div className="flex items-center gap-2 text-rose-300"><ShieldAlert className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Company risk centre</span></div>
  <h2 className="mt-2 text-xl font-semibold text-white">Prioritise enterprise risks with accountable owners</h2>
  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">This deterministic impact × likelihood triage helps prioritise review. It is not a substitute for specialist cyber, legal, financial, safety or insurance assessment.</p>
  <div className="mt-5 space-y-3">{ranked.map((r)=>{const i=rows.findIndex(x=>x.name===r.name);return <article key={r.name} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><input value={r.name} onChange={e=>change(i,'name',e.target.value)} className="min-w-[220px] flex-1 bg-transparent text-sm font-medium text-white outline-none"/><span className={`rounded-full border px-2.5 py-1 text-xs ${r.score>=15?'border-rose-300/25 text-rose-300':r.score>=8?'border-amber-300/25 text-amber-300':'border-emerald-300/25 text-emerald-300'}`}>Risk score {r.score}/25</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><label><span className="text-[9px] uppercase tracking-[.08em] text-zinc-700">Impact {r.impact}/5</span><input type="range" min="1" max="5" value={r.impact} onChange={e=>change(i,'impact',e.target.value)} className="mt-2 w-full"/></label><label><span className="text-[9px] uppercase tracking-[.08em] text-zinc-700">Likelihood {r.likelihood}/5</span><input type="range" min="1" max="5" value={r.likelihood} onChange={e=>change(i,'likelihood',e.target.value)} className="mt-2 w-full"/></label><label><span className="text-[9px] uppercase tracking-[.08em] text-zinc-700">Owner</span><input value={r.owner} onChange={e=>change(i,'owner',e.target.value)} className="mt-1.5 w-full rounded-lg border border-white/[.07] bg-black/30 px-2.5 py-2 text-xs text-white outline-none"/></label></div></article>})}</div>
  <div className="mt-4 grid gap-3 md:grid-cols-4"><Lens icon={Siren} label="Continuity"/><Lens icon={LockKeyhole} label="Cyber & data"/><Lens icon={PackageCheck} label="Supply chain"/><Lens icon={Banknote} label="Financial"/></div>
 </section>
}
function Lens({icon:Icon,label}){return <div className="flex items-center gap-2 rounded-xl border border-white/[.06] p-3 text-xs text-zinc-500"><Icon className="h-4 w-4 text-rose-300"/>{label}</div>}

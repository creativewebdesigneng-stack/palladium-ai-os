import { useMemo, useState } from 'react';
import { Radar, Target, Sparkles, ShieldCheck } from 'lucide-react';

const seed=[
 {name:'Our company',price:3,product:4,distribution:3,brand:3,innovation:4},
 {name:'Competitor A',price:4,product:3,distribution:4,brand:4,innovation:3},
 {name:'Competitor B',price:2,product:4,distribution:3,brand:3,innovation:5},
];
const dims=['price','product','distribution','brand','innovation'];

export default function CompanyCompetitiveMap(){
 const [rows,setRows]=useState(seed);
 const scored=useMemo(()=>rows.map(r=>({...r,score:dims.reduce((s,k)=>s+r[k],0)/dims.length})).sort((a,b)=>b.score-a.score),[rows]);
 const update=(i,k,v)=>setRows(rs=>rs.map((r,x)=>x===i?{...r,[k]:Number(v)}:r));
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-indigo-300"><Radar className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Competitive intelligence</span></div><h2 className="mt-2 text-xl font-semibold text-white">Structure competitor comparison without inventing market facts</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Score evidence-backed competitive dimensions from 1–5. Defaults are illustrative placeholders; replace them with verified research before using the comparison for decisions.</p>
 <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="text-zinc-600"><th className="p-2">Company</th>{dims.map(d=><th key={d} className="p-2 capitalize">{d}</th>)}<th className="p-2">Composite</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.name} className="border-t border-white/[.06]"><td className="p-2 text-white">{r.name}</td>{dims.map(d=><td key={d} className="p-2"><input aria-label={r.name+' '+d} type="number" min="1" max="5" value={r[d]} onChange={e=>update(i,d,e.target.value)} className="w-14 rounded-lg border border-white/[.07] bg-black/30 px-2 py-1 text-zinc-300 outline-none"/></td>)}<td className="p-2 text-indigo-200">{(dims.reduce((s,k)=>s+r[k],0)/dims.length).toFixed(1)}</td></tr>)}</tbody></table></div>
 <div className="mt-4 grid gap-3 md:grid-cols-3"><Note icon={Target} title="Highest current composite" text={scored[0]?.name+' · '+scored[0]?.score.toFixed(1)+'/5'}/><Note icon={Sparkles} title="Opportunity lens" text="Look for important dimensions where customer need is high and competitive strength is weak."/><Note icon={ShieldCheck} title="Evidence rule" text="Use Web Intelligence and Research for current public evidence; do not treat placeholder scores as facts."/></div></section>
}
function Note({icon:Icon,title,text}){return <div className="rounded-xl border border-white/[.06] p-3"><Icon className="h-4 w-4 text-indigo-300"/><p className="mt-2 text-xs font-medium text-zinc-300">{title}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p></div>}

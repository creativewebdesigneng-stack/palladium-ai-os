import { useMemo, useState } from 'react';
import { Crosshair, Trophy, AlertCircle, BarChart3 } from 'lucide-react';

const dims=['Market position','Product / service','Customer experience','Operations','Digital & AI','Cost position','Distribution','Brand / trust'];
export default function IndustryBenchmarking(){
 const [self,setSelf]=useState(Object.fromEntries(dims.map(x=>[x,3])));
 const [peer,setPeer]=useState(Object.fromEntries(dims.map(x=>[x,3])));
 const gaps=useMemo(()=>dims.map(d=>({d,g:Number(self[d])-Number(peer[d])})).sort((a,b)=>a.g-b.g),[self,peer]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-yellow-300"><Crosshair className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Competitive benchmarking</span></div><h2 className="mt-2 text-xl font-semibold text-white">Compare operating position without inventing competitor data</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Score your organisation and a peer/benchmark from 1–5 using evidence you provide or current public research. Blackstar treats these scores as assumptions until sourced.</p>
 <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="text-[10px] uppercase tracking-[.1em] text-zinc-600"><th className="pb-3">Dimension</th><th>Your organisation</th><th>Peer / benchmark</th><th>Gap</th></tr></thead><tbody>{dims.map(d=><tr key={d} className="border-t border-white/[.05]"><td className="py-3 text-xs text-zinc-300">{d}</td><td><Score value={self[d]} set={v=>setSelf(s=>({...s,[d]:v}))}/></td><td><Score value={peer[d]} set={v=>setPeer(s=>({...s,[d]:v}))}/></td><td className={`text-xs font-medium ${self[d]-peer[d]<0?'text-rose-300':self[d]-peer[d]>0?'text-emerald-300':'text-zinc-600'}`}>{self[d]-peer[d]>0?'+':''}{self[d]-peer[d]}</td></tr>)}</tbody></table></div>
 <div className="mt-4 grid gap-3 md:grid-cols-2"><Box icon={AlertCircle} title="Largest potential gaps" text={gaps.slice(0,3).map(x=>x.d).join(' · ')}/><Box icon={Trophy} title="Potential strengths" text={[...gaps].reverse().slice(0,3).map(x=>x.d).join(' · ')}/></div></section>
}
function Score({value,set}){return <select value={value} onChange={e=>set(Number(e.target.value))} className="rounded-lg border border-white/[.07] bg-black px-2 py-1 text-xs text-zinc-300">{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select>}
function Box({icon:Icon,title,text}){return <div className="rounded-xl border border-white/[.06] p-3"><div className="flex items-center gap-2 text-xs text-zinc-300"><Icon className="h-4 w-4 text-yellow-300"/>{title}</div><p className="mt-2 text-xs leading-5 text-zinc-600">{text}</p></div>}

import { useMemo, useState } from 'react';
import { Sparkles, ArrowUpRight, Radar, ShieldCheck } from 'lucide-react';
const ideas=[
 ['AI-assisted operations','Efficiency',4,4,3],['New geographic market','Growth',5,2,4],['Supplier diversification','Resilience',3,4,2],['Premium service tier','Revenue',4,3,2],['Workflow automation','Productivity',3,5,2],['Circular / lower-waste model','Innovation',4,3,3],
];
export default function OpportunityPortfolio(){
 const [impact,setImpact]=useState(3);
 const ranked=useMemo(()=>ideas.map(([name,type,i,f,r])=>({name,type,score:Math.round(((i*impact)+f*3+(6-r)*2)/(impact+5)*20)})).sort((a,b)=>b.score-a.score),[impact]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-pink-300"><Sparkles className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Opportunity portfolio</span></div><h2 className="mt-2 text-xl font-semibold text-white">Rank industry opportunities before committing resources</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Illustrative hypotheses are scored by impact, feasibility and risk. They must be validated with organisation-specific evidence, economics and constraints.</p>
 <label className="mt-4 block max-w-sm"><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Impact weighting · {impact}×</span><input type="range" min="1" max="5" value={impact} onChange={e=>setImpact(Number(e.target.value))} className="mt-2 w-full"/></label>
 <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ranked.map((x,i)=><article key={x.name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-zinc-700">#{i+1} · {x.type}</span><ArrowUpRight className="h-4 w-4 text-pink-300"/></div><h3 className="mt-2 text-sm font-medium text-white">{x.name}</h3><p className="mt-3 text-2xl font-semibold text-zinc-200">{x.score}<span className="text-xs text-zinc-700">/100</span></p></article>)}</div></section>
}

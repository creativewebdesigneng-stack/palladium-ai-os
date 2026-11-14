import { useEffect, useMemo, useState } from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { rankIndustryOpportunities } from '@/lib/industry/industry-calculations';
const ideas=[
 {name:'AI-assisted operations',type:'Efficiency',impact:4,feasibility:4,risk:3},{name:'New geographic market',type:'Growth',impact:5,feasibility:2,risk:4},{name:'Supplier diversification',type:'Resilience',impact:3,feasibility:4,risk:2},{name:'Premium service tier',type:'Revenue',impact:4,feasibility:3,risk:2},{name:'Workflow automation',type:'Productivity',impact:3,feasibility:5,risk:2},{name:'Circular / lower-waste model',type:'Innovation',impact:4,feasibility:3,risk:3},
];
export default function OpportunityPortfolio({ onPicture }){
 const [impact,setImpact]=useState(3);
 const ranked=useMemo(()=>rankIndustryOpportunities(impact,ideas),[impact]);
 useEffect(()=>{onPicture?.(ranked)},[ranked,onPicture]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-pink-300"><Sparkles className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Opportunity portfolio</span></div><h2 className="mt-2 text-xl font-semibold text-white">Rank industry opportunities before committing resources</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Illustrative hypotheses are scored by impact, feasibility and risk. They must be validated with organisation-specific evidence, economics and constraints.</p>
 <label className="mt-4 block max-w-sm"><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Impact weighting · {impact}×</span><input type="range" min="1" max="5" value={impact} onChange={e=>setImpact(Number(e.target.value))} className="mt-2 w-full"/></label>
 <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ranked.map((x,i)=><article key={x.name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-zinc-700">#{i+1} · {x.type}</span><ArrowUpRight className="h-4 w-4 text-pink-300"/></div><h3 className="mt-2 text-sm font-medium text-white">{x.name}</h3><p className="mt-3 text-2xl font-semibold text-zinc-200">{x.score}<span className="text-xs text-zinc-700">/100</span></p></article>)}</div></section>
}

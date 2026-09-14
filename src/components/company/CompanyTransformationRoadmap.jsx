import { useMemo, useState } from 'react';
import { Route, CheckCircle2, Circle, ArrowRight, Users } from 'lucide-react';

const phases=[
 ['Diagnose','Baseline performance, evidence, constraints and root causes'],
 ['Design','Target operating model, outcomes, controls and accountable owners'],
 ['Mobilise','Sequence initiatives, resources, dependencies and change plan'],
 ['Deliver','Execute work through teams, agents, workflows and specialist systems'],
 ['Measure','Track outcomes, benefits, risk and adoption against the baseline'],
 ['Embed','Standardise successful changes, governance and continuous improvement'],
];

export default function CompanyTransformationRoadmap(){
 const [active,setActive]=useState(0);
 const progress=useMemo(()=>Math.round((active/phases.length)*100),[active]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-teal-300"><Route className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Transformation roadmap</span></div><div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-xl font-semibold text-white">Move from diagnosis to embedded operating change</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">A reusable transformation sequence for company-wide improvement. Progress is a planning marker, not proof that benefits have been realised.</p></div><span className="text-sm font-medium text-teal-200">{progress}% planning progress</span></div>
 <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{phases.map(([name,text],i)=>{const done=i<active,current=i===active;return <button key={name} onClick={()=>setActive(i)} className={`rounded-2xl border p-4 text-left ${current?'border-teal-300/25 bg-teal-300/[.06]':done?'border-emerald-300/15 bg-emerald-300/[.025]':'border-white/[.07] bg-white/[.02]'}`}><div className="flex items-center justify-between">{done?<CheckCircle2 className="h-4 w-4 text-emerald-300"/>:<Circle className={`h-4 w-4 ${current?'text-teal-300':'text-zinc-700'}`}/>}<span className="text-[10px] text-zinc-700">0{i+1}</span></div><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><p className="mt-1 text-xs leading-5 text-zinc-600">{text}</p></button>})}</div>
 <div className="mt-4 flex gap-2 rounded-xl border border-teal-300/10 bg-teal-300/[.025] p-3"><Users className="mt-0.5 h-4 w-4 shrink-0 text-teal-300"/><p className="text-[10px] leading-4 text-zinc-500">Execution should reuse Blackstar's existing AI Workforce, agents, workflows, Finance, CRM, BI, Legal and Industry systems. Human approvals remain required wherever policy, risk or external side effects demand them.</p></div></section>
}

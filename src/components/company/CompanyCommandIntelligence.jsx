import { useMemo, useState } from 'react';
import { BarChart3, CalendarClock, Scale, Sparkles, TrendingUp, Users, ShieldCheck, Target } from 'lucide-react';

const templates=[
 ['Revenue growth','Growth','%','Track top-line growth against plan and prior periods.'],
 ['Gross margin','Finance','%','Monitor pricing, mix, delivery cost and unit economics.'],
 ['Cash runway','Finance','months','Track liquidity horizon using verified finance data.'],
 ['Pipeline coverage','Sales','x','Compare qualified pipeline with revenue target.'],
 ['Customer retention','Customer','%','Monitor retained customers/revenue and churn pressure.'],
 ['On-time delivery','Operations','%','Measure reliability against committed service dates.'],
 ['Quality / defect rate','Operations','%','Track avoidable rework, defects or service failures.'],
 ['Employee retention','People','%','Monitor unwanted attrition and workforce stability.'],
 ['Automation coverage','Technology','%','Track bounded processes with approved automation support.'],
 ['Critical risk actions overdue','Risk','count','Surface unresolved high-priority risk treatments.'],
];

const cadence=[
 ['Weekly operating review','Execution','KPIs, blockers, customer/service issues, cash/revenue signals and accountable next actions.'],
 ['Monthly business review','Performance','Financials, pipeline, marketing, operations, people, risks, priorities and forecast changes.'],
 ['Quarterly strategy review','Strategy','Market changes, strategic bets, capital allocation, capability gaps and transformation roadmap.'],
 ['Board / investor pack','Governance','Performance, narrative, cash/capital, risks, decisions, outlook and required approvals.'],
];

export default function CompanyCommandIntelligence(){
 const [values,setValues]=useState({});
 const [confidence,setConfidence]=useState({});
 const populated=useMemo(()=>templates.filter(([name])=>String(values[name]??'').trim()!=='').length,[values]);
 return <section className="rounded-[26px] border border-cyan-300/10 bg-cyan-300/[.025] p-5 lg:p-6">
  <div className="flex items-center gap-2 text-cyan-300"><BarChart3 className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Company command intelligence</span></div>
  <div className="mt-2 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="text-xl font-semibold text-white">Run the company from a small set of explicit operating signals</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">Define KPI values and evidence confidence here, then connect source-of-truth metrics to Business Intelligence, Finance, CRM and other specialist systems. Manual entries are planning context, not live telemetry.</p></div><div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] px-4 py-3"><p className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Signals populated</p><p className="mt-1 text-lg font-semibold text-white">{populated}/{templates.length}</p></div></div>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{templates.map(([name,area,unit,desc])=><article key={name} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-center justify-between gap-2"><span className="text-[9px] uppercase tracking-[.1em] text-zinc-700">{area}</span><span className="text-[9px] text-zinc-700">{unit}</span></div><h3 className="mt-2 text-xs font-medium text-white">{name}</h3><input value={values[name]??''} onChange={e=>setValues(v=>({...v,[name]:e.target.value}))} placeholder="Enter value" className="mt-3 w-full rounded-lg border border-white/[.07] bg-black/30 px-2.5 py-2 text-xs text-white outline-none"/><select value={confidence[name]??'unverified'} onChange={e=>setConfidence(v=>({...v,[name]:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/[.07] bg-black/30 px-2 py-1.5 text-[10px] text-zinc-400"><option value="unverified">Unverified assumption</option><option value="internal">Internal evidence</option><option value="system">System sourced</option></select><p className="mt-2 text-[10px] leading-4 text-zinc-600">{desc}</p></article>)}</div>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{cadence.map(([name,type,text])=><article key={name} className="rounded-2xl border border-white/[.07] p-4"><CalendarClock className="h-4 w-4 text-violet-300"/><p className="mt-2 text-[9px] uppercase tracking-[.1em] text-zinc-700">{type}</p><h3 className="mt-1 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></article>)}</div>
  <div className="mt-4 grid gap-3 md:grid-cols-3"><Note icon={Scale} title="Decision log" text="Record material decisions, owner, rationale, assumptions, alternatives, expected outcome and review date."/><Note icon={ShieldCheck} title="Risk review" text="Link major decisions and initiatives to risk owners, mitigations, triggers and escalation paths."/><Note icon={Sparkles} title="Opportunity portfolio" text="Track growth, efficiency and transformation opportunities by evidence, value, feasibility, owner and next validation step."/></div>
 </section>
}
function Note({icon:Icon,title,text}){return <div className="rounded-xl border border-white/[.06] p-3"><Icon className="h-4 w-4 text-cyan-300"/><p className="mt-2 text-xs font-medium text-zinc-300">{title}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p></div>}

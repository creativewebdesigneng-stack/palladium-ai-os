import { Bot, Users, Workflow, ShieldCheck, ArrowRight } from 'lucide-react';

const missions=[
 ['Revenue operations','Research accounts, prepare outreach, qualify signals and maintain CRM context','CRM + Sales agents'],
 ['Finance operations','Prepare variance analysis, scenario packs, collections context and management summaries','Finance + BI'],
 ['Customer operations','Triage requests, draft responses, surface churn signals and coordinate follow-up','CRM + Workflows'],
 ['Operations improvement','Map processes, identify bottlenecks, draft SOPs and prepare automation candidates','Agents + Workflows'],
 ['Executive intelligence','Prepare evidence-backed company briefs, KPI narratives and decision packs','Research + BI'],
 ['Risk & compliance support','Collect evidence, track controls and prepare specialist review queues','Legal + Security'],
];

export default function CompanyAIWorkforceOrchestrator(){
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-fuchsia-300"><Bot className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">AI workforce orchestration</span></div><h2 className="mt-2 text-xl font-semibold text-white">Turn company priorities into bounded AI missions</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">This layer defines reusable company missions and routes them into Blackstar's existing agents, AI Workforce and workflows. It does not create a second execution engine or bypass approval controls.</p>
 <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{missions.map(([name,text,route])=><article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-center justify-between"><Bot className="h-4 w-4 text-fuchsia-300"/><ArrowRight className="h-3.5 w-3.5 text-zinc-700"/></div><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-600">{text}</p><p className="mt-3 text-[10px] uppercase tracking-[.1em] text-fuchsia-200/70">Route · {route}</p></article>)}</div>
 <div className="mt-4 grid gap-3 md:grid-cols-3"><Guard icon={Users} title="Human ownership" text="Every mission remains accountable to an owner and the organisation's policies."/><Guard icon={Workflow} title="Reuse execution" text="Use existing Blackstar runtime, workflow and integration paths instead of duplicate automation."/><Guard icon={ShieldCheck} title="Approval boundary" text="External side effects, regulated work and sensitive actions retain their existing approval gates."/></div></section>
}
function Guard({icon:Icon,title,text}){return <div className="rounded-xl border border-white/[.06] p-3"><Icon className="h-4 w-4 text-fuchsia-300"/><p className="mt-2 text-xs font-medium text-zinc-300">{title}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p></div>}

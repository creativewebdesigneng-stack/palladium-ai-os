import { Link } from 'react-router-dom';
import { Bot, Workflow, Brain, ShieldCheck, Contact, Megaphone, Banknote, Search, Settings2, Headphones, Users, Cpu } from 'lucide-react';

const roles=[
 ['Executive intelligence worker',Brain,'Leadership','Prepare briefs, decision context, priorities, risk summaries and follow-through.','/agents/new'],
 ['Sales development worker',Contact,'Revenue','Research accounts, prepare outreach, update CRM context and surface follow-up priorities.','/crm'],
 ['Marketing operations worker',Megaphone,'Growth','Assist campaigns, content planning, SEO/social coordination and performance reviews.','/marketing'],
 ['Finance operations worker',Banknote,'Finance','Support receivables, planning inputs, finance workflows and evidence preparation.','/finance'],
 ['Research intelligence worker',Search,'Strategy','Gather current market, company, competitor and supplier evidence through Web Intelligence.','/web-intelligence'],
 ['Operations coordinator',Workflow,'Operations','Coordinate recurring processes, SOP tasks, handoffs, approvals and exception escalation.','/workflows'],
 ['Customer service worker',Headphones,'Service','Assist support triage, knowledge retrieval, response preparation and escalation workflows.','/workforce'],
 ['People operations worker',Users,'People','Support onboarding plans, role documentation, capability mapping and internal knowledge workflows.','/workforce'],
 ['Risk & compliance worker',ShieldCheck,'Governance','Track controls, evidence requests, risk registers and route legal questions to Legal Hub.','/legal-hub'],
 ['Technology operations worker',Cpu,'Technology','Assist system inventories, integration planning, technical research and operational checks.','/agent-runtime'],
 ['Knowledge steward',Brain,'Knowledge','Keep company knowledge structured, reusable and accessible to authorised workers.','/knowledge'],
 ['Process automation worker',Settings2,'Automation','Identify repeatable work and connect approved tasks to Blackstar workflows and tools.','/workflows'],
];

export default function CompanyAIWorkforceBlueprint(){
 return <section className="rounded-[26px] border border-violet-300/10 bg-violet-300/[.025] p-5 lg:p-6">
  <div className="flex items-center gap-2 text-violet-300"><Bot className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">AI workforce blueprint</span></div>
  <h2 className="mt-2 text-xl font-semibold text-white">Build an AI workforce around company responsibilities</h2>
  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">These are operating-role templates, not duplicate agents. Use them to decide what responsibilities should be handled by existing Blackstar agents, workflows and human approvals.</p>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{roles.map(([name,Icon,dept,text,path])=><article key={name} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><Icon className="h-5 w-5 text-violet-300"/><span className="text-[9px] uppercase tracking-[.1em] text-zinc-700">{dept}</span></div><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p><Link to={path} className="mt-3 inline-flex rounded-lg border border-violet-300/15 bg-violet-300/[.04] px-2.5 py-1.5 text-[10px] text-violet-200 hover:bg-violet-300/[.08]">Open connected system</Link></article>)}</div>
  <div className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.03] p-3 text-[10px] leading-4 text-amber-100/70">High-impact external actions should continue through Blackstar's existing permissions, approvals, audit and provider controls. A role template does not grant authority by itself.</div>
 </section>
}

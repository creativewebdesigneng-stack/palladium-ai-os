import CompanyAIWorkforceBlueprint from '@/components/company/CompanyAIWorkforceBlueprint';
import CompanyHealthAssessment from '@/components/company/CompanyHealthAssessment';
import CompanyWorkspace from '@/components/company/CompanyWorkspace';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Bot, Workflow, Contact, Megaphone, Banknote, Scale, BarChart3,
  ShieldCheck, Globe2, Rocket, PackageCheck, BriefcaseBusiness, Cpu, BookOpen, Search,
  LineChart, Settings2, Factory, Handshake, ClipboardCheck, Network, Sparkles
} from 'lucide-react';

const departments=[
  ['Leadership & strategy', BriefcaseBusiness, 'Goals, operating cadence, decisions, board/leadership packs, OKRs and transformation priorities.'],
  ['Sales & CRM', Contact, 'Accounts, pipeline, contacts, follow-up, proposals, retention and revenue operations.'],
  ['Marketing & growth', Megaphone, 'Campaigns, content, SEO, social operations, positioning, acquisition and lifecycle growth.'],
  ['Finance', Banknote, 'Planning, budgets, unit economics, receivables, portfolio context and financial education.'],
  ['Legal & compliance', Scale, 'Matters, obligations, research, regulatory monitoring, rights and professional-review handoff.'],
  ['People & workforce', Users, 'Roles, teams, workforce planning, onboarding, capability maps and AI-human operating models.'],
  ['Operations', Workflow, 'Process mapping, SOPs, bottlenecks, automation, quality, service delivery and continuous improvement.'],
  ['Procurement & suppliers', PackageCheck, 'Supplier research, sourcing, concentration, resilience, due diligence and purchasing workflows.'],
  ['Technology & data', Cpu, 'Systems, integrations, architecture, AI adoption, data workflows, security and digital transformation.'],
  ['Risk & governance', ShieldCheck, 'Risk registers, controls, approvals, assurance, resilience and escalation structures.'],
  ['Analytics & intelligence', BarChart3, 'KPIs, dashboards, BI, market/industry research, competitor intelligence and decision support.'],
  ['Customer success & service', Handshake, 'Service workflows, support, retention, account health, feedback and experience improvement.'],
];

const lifecycle=[
  ['Start', 'Validate problem, market, model, structure, first customers and operating basics.'],
  ['Build', 'Create product/service, team, systems, controls, processes and repeatable delivery.'],
  ['Grow', 'Scale sales, marketing, partnerships, hiring, capacity and customer retention.'],
  ['Optimise', 'Improve margin, productivity, quality, automation, procurement and working capital.'],
  ['Expand', 'Enter new markets, products, geographies, channels and strategic partnerships.'],
  ['Transform', 'Redesign operating model, technology, data, AI workforce and organisational capability.'],
];

const systems=[
  ['Organisation & Teams','/organisation',Building2,'People, seats, roles and shared workspaces.'],
  ['AI Workforce','/workforce',Users,'AI workers, fleet assignments, delegations and durable execution.'],
  ['Agents','/agents',Bot,'Specialist agents for repeatable company responsibilities.'],
  ['Workflows','/workflows',Workflow,'Automate multi-step company processes and approvals.'],
  ['CRM','/crm',Contact,'Customers, contacts, pipeline and commercial follow-up.'],
  ['Marketing','/marketing',Megaphone,'Campaigns, content and growth execution.'],
  ['Finance Hub','/finance',Banknote,'Financial planning, receivables, education and company finance.'],
  ['Legal Hub','/legal-hub',Scale,'Global legal research, compliance and obligations.'],
  ['Industry Hub','/industry-hub',Factory,'Sector intelligence, value chains, benchmarks and transformation.'],
  ['Business Intelligence','/business-intelligence',LineChart,'Company performance and decision intelligence.'],
  ['Knowledge','/knowledge',BookOpen,'Company knowledge, references and reusable context.'],
  ['Web Intelligence','/web-intelligence',Search,'Current external research and evidence gathering.'],
];

export default function CompanyHub(){
 return <div className="space-y-6 pb-12">
  <section className="blackstar-panel relative overflow-hidden rounded-[28px] border border-white/[.08] bg-black/35 p-6 lg:p-8">
   <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"/>
   <div className="relative">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-cyan-300"><Building2 className="h-4 w-4"/> Blackstar Company Hub</div>
    <h1 className="mt-3 max-w-5xl text-3xl font-semibold tracking-tight text-white lg:text-5xl">A company operating centre connecting people, AI workers, systems, knowledge and execution.</h1>
    <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">Company Hub is the business-wide layer over Blackstar's existing specialist systems. It helps companies understand what to do, organise who or what should do it, connect AI workers and agents, automate repeatable work, monitor performance and route high-stakes work into the right governed system.</p>
    <div className="mt-6 flex flex-wrap gap-2">{['Strategy','Sales','Marketing','Finance','Legal','People','Operations','Technology','Risk','Analytics','Growth','AI workforce'].map(x=><span key={x} className="rounded-full border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-xs text-zinc-300">{x}</span>)}</div>
   </div>
  </section>

  <section>
   <p className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-600">Company lifecycle</p>
   <h2 className="mt-1 text-xl font-semibold text-white">Support from formation through transformation</h2>
   <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{lifecycle.map(([name,text],i)=><article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><span className="text-[10px] text-cyan-300">0{i+1}</span><h3 className="mt-2 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></article>)}</div>
  </section>

  <section>
   <p className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-600">Department intelligence</p>
   <h2 className="mt-1 text-xl font-semibold text-white">Company-wide operating coverage</h2>
   <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{departments.map(([name,Icon,text])=><article key={name} className="rounded-2xl border border-white/[.07] bg-black/25 p-5"><Icon className="h-5 w-5 text-violet-300"/><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></article>)}</div>
  </section>

  <section className="rounded-[26px] border border-violet-300/10 bg-violet-300/[.025] p-5 lg:p-6">
   <div className="flex items-center gap-2 text-violet-300"><Bot className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">AI company workforce</span></div>
   <h2 className="mt-2 text-xl font-semibold text-white">Connect AI workers to real company responsibilities</h2>
   <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">Company Hub does not create another agent runtime. It maps company responsibilities onto Blackstar's existing AI Workforce, agents, tasks, workflows, approvals, integrations, memory and knowledge systems so AI workers can assist departments under the same governance model.</p>
   <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Mini icon={Sparkles} title="Executive copilot" text="Briefs, decision preparation, priorities, risks and follow-through."/><Mini icon={Contact} title="Revenue worker" text="CRM hygiene, follow-up preparation, account research and pipeline support."/><Mini icon={Workflow} title="Operations worker" text="SOP support, process monitoring, task coordination and automation."/><Mini icon={Search} title="Research worker" text="Market, competitor, supplier and company research with evidence handoff."/></div>
  </section>

  <section>
   <p className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-600">Connected company systems</p>
   <h2 className="mt-1 text-xl font-semibold text-white">Use Blackstar's existing execution engines</h2>
   <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{systems.map(([name,path,Icon,text])=><Link key={path} to={path} className="group rounded-2xl border border-white/[.07] bg-white/[.02] p-4 transition hover:border-cyan-300/20"><div className="flex items-center gap-3"><div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[.04] p-2"><Icon className="h-4 w-4 text-cyan-300"/></div><h3 className="text-sm font-medium text-white group-hover:text-cyan-100">{name}</h3></div><p className="mt-3 text-xs leading-5 text-zinc-500">{text}</p></Link>)}</div>
  </section>

  <CompanyHealthAssessment />
  <CompanyAIWorkforceBlueprint />
  <CompanyWorkspace />

  <section className="grid gap-4 lg:grid-cols-3">
   <Callout icon={Network} title="Connected company context" text="Company Hub should become the place where objectives, operating context, risks, priorities and AI-worker assignments meet—while specialist data stays in the specialist system that already owns it."/>
   <Callout icon={ClipboardCheck} title="Governed execution" text="Approvals, permissions, auditability, legal/compliance boundaries and external-action controls remain enforced by Blackstar's existing trust and runtime systems."/>
   <Callout icon={Globe2} title="Global company support" text="Companies can combine Industry Hub, Legal Hub, Finance and Web Intelligence for jurisdiction, market and sector-specific expansion work without pretending static summaries are current law or market data."/>
  </section>
 </div>
}
function Mini({icon:Icon,title,text}){return <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><Icon className="h-4 w-4 text-violet-300"/><h3 className="mt-2 text-sm font-medium text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div>}
function Callout({icon:Icon,title,text}){return <div className="rounded-2xl border border-white/[.07] bg-black/25 p-5"><Icon className="h-5 w-5 text-emerald-300"/><h3 className="mt-3 text-sm font-medium text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></div>}

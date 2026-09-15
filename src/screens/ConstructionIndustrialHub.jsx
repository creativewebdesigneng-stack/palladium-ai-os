import { Link } from 'react-router-dom';
import ConstructionOperationsConsole from '@/components/construction/ConstructionOperationsConsole';
import {
  HardHat, Factory, Building2, Wrench, Ruler, ShieldCheck, ClipboardCheck, Truck, Boxes,
  Gauge, Camera, FileText, Calculator, Workflow, Users, Map, ScanLine, Leaf, RadioTower,
  Bot, Search, Banknote, Scale, Hammer, Activity, AlertTriangle, ChevronRight, Cpu,
} from 'lucide-react';

const sectors = [
  ['General construction', HardHat, 'Residential, commercial, public works, fit-out, refurbishment and multi-trade delivery.'],
  ['Civil & infrastructure', Map, 'Roads, rail, bridges, utilities, drainage, earthworks and major infrastructure programmes.'],
  ['Industrial & manufacturing', Factory, 'Plants, production lines, factories, process operations, maintenance and industrial automation.'],
  ['MEP & building services', Wrench, 'Mechanical, electrical, plumbing, HVAC, controls, commissioning and facilities systems.'],
  ['Engineering & fabrication', Ruler, 'Design coordination, fabrication, steelwork, machining, tolerances, QA and technical documentation.'],
  ['Energy & utilities', RadioTower, 'Power, renewables, substations, networks, water, utilities and asset field operations.'],
  ['Property & facilities', Building2, 'Asset lifecycle, planned maintenance, inspections, work orders, FM and building performance.'],
  ['Specialist trades', Hammer, 'Groundworks, roofing, joinery, concrete, glazing, fire protection, finishes and specialist subcontracting.'],
];

const capabilities = [
  ['Estimating & tendering', Calculator, 'Scope breakdowns, quantity take-off assistance, estimate structures, bid comparison, clarifications, exclusions and tender packs.'],
  ['Planning & scheduling', Activity, 'Programme logic, look-ahead plans, sequencing, constraints, dependencies, delay signals and recovery scenarios.'],
  ['Site operations', HardHat, 'Daily plans, site diaries, progress summaries, RFIs, snagging, handovers, logistics and coordination.'],
  ['Safety intelligence', ShieldCheck, 'RAMS support, hazard identification, toolbox-talk drafts, permit workflows, observations and escalation—without replacing competent safety review.'],
  ['Quality & inspections', ClipboardCheck, 'ITPs, checklists, NCR workflows, defect classification, photo evidence, commissioning and close-out.'],
  ['Plant & maintenance', Gauge, 'Asset registers, inspections, maintenance planning, downtime analysis, fault triage and predictive-maintenance inputs.'],
  ['Procurement & supply chain', Truck, 'Material schedules, supplier comparison, lead-time risk, substitutions, purchase planning and delivery coordination.'],
  ['Materials & inventory', Boxes, 'Track stock, consumables, tools, shortages, waste, reorder points and site/warehouse movements.'],
  ['Drawings & documents', FileText, 'Organise drawings, specifications, revisions, submittals, method statements, O&M information and document questions.'],
  ['Vision & field evidence', Camera, 'Use images for progress classification, visible defect triage, asset identification and evidence organisation with human verification.'],
  ['Cost & commercial', Banknote, 'Budgets, commitments, variations, applications, earned-value signals, cash forecasting and margin analysis.'],
  ['Sustainability', Leaf, 'Waste, energy, carbon inputs, materials, environmental actions and evidence packs.'],
];

const agents = [
  ['Construction Project Agent', 'Plans work packages, milestones, dependencies, risks, actions and reporting.'],
  ['Estimator & Tender Agent', 'Structures estimates, tender comparisons, scope gaps, clarifications and commercial assumptions.'],
  ['Site Manager Copilot', 'Turns diaries, progress, labour, deliveries and constraints into a daily operating picture.'],
  ['HSE Sentinel', 'Surfaces hazards and missing controls, drafts safety material and routes high-risk decisions for competent approval.'],
  ['Quality Inspector Agent', 'Builds ITP/checklist workflows, classifies defects and manages evidence through close-out.'],
  ['Planner Agent', 'Supports programmes, look-aheads, critical constraints, delay analysis and recovery options.'],
  ['Commercial / QS Agent', 'Tracks costs, variations, commitments, valuations and commercial risk without pretending to be a contractual authority.'],
  ['Procurement Agent', 'Compares suppliers, lead times, materials, substitutions and purchase priorities.'],
  ['Plant Reliability Agent', 'Triage faults, maintenance history, inspections and downtime to support maintenance teams.'],
  ['Document Control Agent', 'Indexes revisions, drawings, specifications, RFIs, submittals and handover records.'],
  ['BIM / Digital Twin Agent', 'Coordinates structured asset/model information and connects issues, documents and field evidence to asset context.'],
  ['Sustainability Agent', 'Tracks environmental actions, waste, energy and carbon-related project evidence.'],
];

const integrations = [
  ['BIM / CAD / CDE', ScanLine, 'Connect model, drawing and common-data-environment metadata through governed adapters.'],
  ['ERP & accounting', Banknote, 'Connect project costs, purchase orders, suppliers, invoices and financial controls.'],
  ['CMMS / EAM', Wrench, 'Connect plant, equipment, maintenance, inspections, work orders and reliability history.'],
  ['IoT / telemetry', Cpu, 'Ingest approved sensor and machine telemetry for monitoring, anomaly detection and maintenance signals.'],
  ['Drones / cameras', Camera, 'Bring authorised visual evidence into progress, inspection and documentation workflows.'],
  ['Fleet & logistics', Truck, 'Connect vehicles, deliveries, routing, utilisation and field logistics.'],
  ['Workforce systems', Users, 'Connect competency, training, labour planning, attendance and approved workforce records.'],
  ['Workflow automation', Workflow, 'Route alerts, approvals, reminders, document reviews and actions through Blackstar governance.'],
];

export default function ConstructionIndustrialHub() {
  return <div className="space-y-6 pb-12">
    <section className="blackstar-panel relative overflow-hidden rounded-[28px] border border-white/[.08] bg-black/35 p-6 lg:p-8">
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/[.08] blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 left-16 h-64 w-64 rounded-full bg-cyan-400/[.05] blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-amber-200"><HardHat className="h-4 w-4" /> Blackstar Construction & Industrial</div>
        <h1 className="mt-3 max-w-5xl text-3xl font-semibold tracking-tight text-white lg:text-5xl">AI command centre for construction, engineering, industrial operations and the asset lifecycle.</h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">A specialist layer over Blackstar's existing intelligence, agents, workflows, vision, knowledge, finance, legal, compliance and integration systems—built to help teams understand work, find problems earlier, coordinate delivery and improve decisions without inventing engineering certainty.</p>
        <div className="mt-6 flex flex-wrap gap-2">{['Projects','Estimating','Planning','Site','Safety','Quality','Plant','BIM','Procurement','Commercial','Maintenance','Sustainability'].map(x=><span key={x} className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-xs text-zinc-300">{x}</span>)}</div>
      </div>
    </section>

    <ConstructionOperationsConsole />

    <Section eyebrow="Sector coverage" title="Built for the full construction and industrial chain">
      <Grid items={sectors} />
    </Section>

    <Section eyebrow="AI capability map" title="Where Blackstar can help solve, improve and coordinate work">
      <Grid items={capabilities} cols="xl:grid-cols-3" />
    </Section>

    <section className="rounded-[28px] border border-violet-300/10 bg-violet-400/[.025] p-5 lg:p-6">
      <div className="flex items-start gap-3"><Bot className="mt-1 h-6 w-6 text-violet-300"/><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Specialist AI workforce</p><h2 className="mt-1 text-xl font-semibold text-white">Construction & industrial agent team</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">These are bounded specialist roles. They can research, analyse, draft, monitor and propose actions; safety-critical, structural, electrical, process-safety and regulated decisions stay behind competent-person and approval controls.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{agents.map(([name,desc])=><article key={name} className="rounded-2xl border border-white/[.07] bg-black/25 p-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-cyan-300"/><h3 className="text-sm font-medium text-white">{name}</h3></div><p className="mt-2 text-xs leading-5 text-zinc-500">{desc}</p></article>)}</div>
    </section>

    <Section eyebrow="Connected operations" title="Connect AI to the systems, machines and evidence teams already use">
      <Grid items={integrations} cols="xl:grid-cols-4" />
    </Section>

    <section className="grid gap-4 lg:grid-cols-3">
      <LinkCard href="/industry-hub" icon={Factory} title="Industry intelligence" text="Use Blackstar's wider Industry Hub for value chains, benchmarking, supplier intelligence, transformation and sector research." />
      <LinkCard href="/compliance-sentinel" icon={Scale} title="Regulation & compliance" text="Route current construction, environmental, employment, equipment and sector obligations into source-backed compliance workflows." />
      <LinkCard href="/finance" icon={Banknote} title="Finance & commercial" text="Connect budgets, cash flow, project economics, scenarios and financial controls to Blackstar Finance." />
      <LinkCard href="/workflows" icon={Workflow} title="Workflow automation" text="Turn approved inspections, alerts, RFIs, maintenance triggers and document reviews into governed workflows." />
      <LinkCard href="/agents" icon={Bot} title="AI agents" text="Hand specialist tasks to Blackstar's existing agent runtime rather than creating an isolated second agent platform." />
      <LinkCard href="/knowledge" icon={Search} title="Knowledge & evidence" text="Ground answers in project knowledge, manuals, specifications, procedures and approved source material." />
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-5"><h3 className="font-medium text-emerald-100">Problem-solving loop</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Observe evidence → identify the issue → retrieve project and technical context → assess risk → propose options → require approval where needed → execute through a connected system → verify the outcome → retain an audit trail.</p></div>
      <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[.035] p-5"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-amber-200"/><h3 className="font-medium text-amber-100">Engineering and safety boundary</h3></div><p className="mt-2 text-sm leading-6 text-zinc-400">Blackstar can assist competent people but must not certify structural adequacy, override permits/interlocks, approve hazardous work, or claim a machine/site is safe from AI inference alone. High-consequence actions remain human-controlled and evidence-backed.</p></div>
    </section>
  </div>;
}

function Section({eyebrow,title,children}) { return <section><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[.18em] text-zinc-500">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold text-white">{title}</h2></div>{children}</section>; }
function Grid({items,cols='xl:grid-cols-4'}) { return <div className={`grid gap-3 md:grid-cols-2 ${cols}`}>{items.map(([name,Icon,desc])=><article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-5"><Icon className="h-5 w-5 text-amber-200"/><h3 className="mt-3 font-medium text-white">{name}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{desc}</p></article>)}</div>; }
function LinkCard({href,icon:Icon,title,text}) { return <Link to={href} className="group rounded-2xl border border-white/[.07] bg-black/25 p-5 transition hover:border-violet-400/20 hover:bg-violet-400/[.03]"><Icon className="h-5 w-5 text-violet-300"/><h3 className="mt-3 font-medium text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p><span className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-[.14em] text-zinc-600 group-hover:text-violet-300">Open system <ChevronRight className="h-3 w-3"/></span></Link>; }

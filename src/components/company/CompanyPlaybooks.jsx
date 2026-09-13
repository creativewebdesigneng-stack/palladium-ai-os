import { BookOpenCheck, Rocket, ShieldAlert, Users, Handshake, Globe2, Banknote, Workflow, Cpu, Scale, PackageCheck, Siren } from 'lucide-react';

const playbooks=[
 ['Company setup & governance',BookOpenCheck,'Clarify purpose, structure, ownership, decision rights, meeting cadence, policies and core controls.'],
 ['Hiring & onboarding',Users,'Define roles, scorecards, interview structure, onboarding plans, knowledge transfer and 30/60/90-day expectations.'],
 ['Sales system',Handshake,'Ideal customer profile, pipeline stages, qualification, proposals, follow-up, forecasting and account expansion.'],
 ['Marketing engine',Rocket,'Positioning, messaging, content, acquisition channels, campaign operating cadence and measurement.'],
 ['Finance operating cadence',Banknote,'Budgeting, cash visibility, receivables, unit economics, management reporting and scenario planning.'],
 ['Procurement & vendors',PackageCheck,'Requirements, sourcing, supplier comparison, due diligence, contracts, concentration and resilience.'],
 ['Process & SOP design',Workflow,'Map recurring work, define owners, controls, SLAs, exceptions, handoffs and automation candidates.'],
 ['Technology & AI adoption',Cpu,'System map, data readiness, integration priorities, AI use-case selection, human oversight and rollout.'],
 ['Legal & compliance routing',Scale,'Identify obligations and evidence needs, then route current legal questions into Blackstar Legal Hub.'],
 ['International expansion',Globe2,'Market selection, localisation, operating model, partners, finance, tax/legal research and launch sequencing.'],
 ['Funding / investor readiness',Banknote,'Narrative, metrics, data room preparation, scenario analysis, diligence readiness and investor research.'],
 ['Crisis & incident response',Siren,'Roles, escalation, stakeholder communication, evidence preservation, continuity and post-incident review.'],
 ['Risk & resilience',ShieldAlert,'Strategic, financial, operational, cyber, supplier, people and regulatory risk identification and treatment.'],
];

export default function CompanyPlaybooks(){
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <div className="flex items-center gap-2 text-amber-300"><BookOpenCheck className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Company playbook library</span></div>
  <h2 className="mt-2 text-xl font-semibold text-white">Reusable operating playbooks for common company needs</h2>
  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">Blackstar can use these frameworks to structure work, then connect execution to the relevant specialist system, agent, workflow or human owner.</p>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{playbooks.map(([name,Icon,text])=><article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><Icon className="h-5 w-5 text-amber-300"/><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></article>)}</div>
 </section>
}

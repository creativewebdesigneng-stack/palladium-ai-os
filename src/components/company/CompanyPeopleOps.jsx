import { Users, UserPlus, GraduationCap, Network, HeartHandshake, ShieldCheck } from 'lucide-react';

const areas=[
 ['Organisation design',Network,'Clarify functions, reporting lines, spans of control, decision rights, interfaces and capacity.'],
 ['Hiring system',UserPlus,'Role scorecards, sourcing, interview structure, selection criteria and candidate experience.'],
 ['Onboarding',GraduationCap,'Role context, systems, policies, training, milestones and 30/60/90-day plans.'],
 ['Performance & development',Users,'Goals, feedback, capability maps, coaching, promotion criteria and succession planning.'],
 ['Culture & engagement',HeartHandshake,'Ways of working, values, communication rhythms, feedback loops and retention signals.'],
 ['People risk',ShieldCheck,'Key-person dependencies, skills gaps, capacity, conduct, wellbeing, access and workforce continuity.'],
];
export default function CompanyPeopleOps(){
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <p className="text-xs font-semibold uppercase tracking-[.16em] text-rose-300">People & organisation</p>
  <h2 className="mt-2 text-xl font-semibold text-white">Build the human operating system around the AI workforce</h2>
  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">Blackstar can support role design, workforce planning, onboarding and capability development while keeping employment decisions, sensitive HR data and regulated obligations under appropriate human and legal controls.</p>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{areas.map(([name,Icon,text])=><article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><Icon className="h-5 w-5 text-rose-300"/><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></article>)}</div>
 </section>
}

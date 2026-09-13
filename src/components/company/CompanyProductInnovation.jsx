import { Lightbulb, FlaskConical, PackageOpen, MessageSquareMore, Rocket, BarChart3 } from 'lucide-react';

const areas=[
 ['Opportunity discovery',Lightbulb,'Customer problems, unmet needs, industry shifts, adjacent markets and capability-led opportunities.'],
 ['Discovery & validation',FlaskConical,'Hypotheses, interviews, prototypes, experiments, evidence thresholds and kill/scale criteria.'],
 ['Product / service design',PackageOpen,'Value proposition, requirements, workflows, service blueprint, packaging and operating implications.'],
 ['Voice of customer',MessageSquareMore,'Feedback themes, requests, friction, retention drivers and evidence-backed prioritisation.'],
 ['Launch & adoption',Rocket,'Go-to-market coordination, enablement, readiness, rollout, adoption and feedback loops.'],
 ['Portfolio performance',BarChart3,'Outcome metrics, economics, usage, quality, strategic fit and investment/retirement decisions.'],
];
export default function CompanyProductInnovation(){
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <p className="text-xs font-semibold uppercase tracking-[.16em] text-purple-300">Product & innovation</p>
  <h2 className="mt-2 text-xl font-semibold text-white">Turn company insight into validated products, services and improvements</h2>
  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">Blackstar can structure discovery and experimentation, connect research to product decisions and hand execution to Projects, Workflows, Smart Tables, analytics and specialist agents.</p>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{areas.map(([name,Icon,text])=><article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><Icon className="h-5 w-5 text-purple-300"/><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></article>)}</div>
 </section>
}

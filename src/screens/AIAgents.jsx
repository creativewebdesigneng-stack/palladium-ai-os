import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Cpu, Workflow, Network, Sparkles } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import { HowAgentsWork, AgentExamples, AgentCta } from '@/components/site/AgentsShowcase';
import Footer from '@/components/site/Footer';

const PIPELINE = [
  { icon: Sparkles, label: 'Intent', desc: 'Set the objective in plain language and define the outcome that matters.' },
  { icon: Cpu, label: 'Reason', desc: 'Blackstar plans the route, selects tools and resolves the next best action.' },
  { icon: Workflow, label: 'Execute', desc: 'Agents call approved tools, services and workflows to complete real work.' },
  { icon: Network, label: 'Coordinate', desc: 'Results, context and handoffs move across the workforce without losing control.' },
];

export default function AIAgents() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-zinc-100">
      <PublicNav />

      <section className="relative overflow-hidden px-6 pb-20 pt-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[180px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(139,92,246,.14),transparent_42%)]" />
          <div className="absolute inset-0 opacity-50 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        </div>

        <SectionReveal className="relative mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/[.055] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200/80 backdrop-blur-xl">
            <Bot className="h-3.5 w-3.5" /> Blackstar Agent Infrastructure
          </span>
          <h1 className="mt-7 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl">
            Intelligence that can
            <span className="block text-violet-200">reason, act and coordinate.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/52 sm:text-lg">
            Blackstar agents are executable AI workers built for real operations — planning, using tools, collaborating across systems and completing governed tasks from one intelligence hub.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register?returnTo=/agents/new" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-zinc-200">
              Create an Agent <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/agent-marketplace" className="rounded-xl border border-white/10 bg-white/[.035] px-6 py-3 text-sm font-medium text-white/88 backdrop-blur-xl transition hover:border-violet-300/20 hover:bg-violet-300/[.06]">Explore Agent Network</Link>
          </div>
        </SectionReveal>
      </section>

      <section aria-labelledby="what-heading" className="py-16">
        <SectionReveal className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-300/70">Execution Model</p>
          <h2 id="what-heading" className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">From intent to verified execution.</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-white/48">
            Give an agent a goal, approved tools and the right knowledge. It can plan the work, execute within policy and escalate only when human control is required.
          </p>
        </SectionReveal>
        <div className="mx-auto mt-14 grid max-w-6xl gap-3 px-6 md:grid-cols-4">
          {PIPELINE.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[.025] p-5 text-left shadow-[0_22px_60px_rgba(0,0,0,.25)] backdrop-blur-xl"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/35 to-transparent" />
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[.075] text-violet-200">
                <p.icon className="h-5 w-5" />
              </span>
              <p className="mt-5 text-sm font-semibold text-white">{p.label}</p>
              <p className="mt-2 text-xs leading-6 text-white/45">{p.desc}</p>
              <div className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/22">0{i + 1}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section aria-labelledby="capabilities-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-300/70">Agent Capabilities</p>
          <h2 id="capabilities-heading" className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">A governed operating layer for AI work.</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-white/45">Compose capabilities across one agent or an entire coordinated workforce while keeping execution visible and controlled.</p>
        </SectionReveal>
        <HowAgentsWork />
      </section>

      <section aria-labelledby="examples-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-300/70">Deployment Patterns</p>
          <h2 id="examples-heading" className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Intelligence for every operating function.</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-white/45">Start with a proven configuration or assemble specialist agents around your own infrastructure and objectives.</p>
        </SectionReveal>
        <AgentExamples />
      </section>

      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6"><AgentCta /></SectionReveal>
      </section>

      <Footer />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Cpu, Workflow, Network, Sparkles } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import { HowAgentsWork, AgentExamples, AgentCta } from '@/components/site/AgentsShowcase';
import Footer from '@/components/site/Footer';

// "What Are AI Agents?" explainer
const PIPELINE = [
  { icon: Sparkles, label: 'Goal', desc: 'You describe the objective in plain language.' },
  { icon: Cpu, label: 'Reason', desc: 'The agent plans, picks tools and decides next steps.' },
  { icon: Workflow, label: 'Act', desc: 'It executes — calling APIs, browsing, coding, writing.' },
  { icon: Network, label: 'Deliver', desc: 'It returns results, learns and hands off to teammates.' },
];

export default function AIAgents() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#090a0f] text-zinc-100">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[150px]" />
          <div className="absolute right-1/3 top-32 h-96 w-96 translate-x-1/2 rounded-full bg-cyan-500/15 blur-[150px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(139,92,246,.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>
        <SectionReveal className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
            <Bot className="h-3.5 w-3.5 text-violet-400" /> AI Agents
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Meet your
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"> AI workforce.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            PalladiumAI agents don't just chat — they reason, plan, use tools and complete real tasks. Deploy specialised agents that research, code, sell and support, all from one platform.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register?returnTo=/agents/new" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Create Your First Agent <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/agent-marketplace" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">Explore Marketplace</Link>
          </div>
        </SectionReveal>
      </section>

      {/* What Are AI Agents? */}
      <section aria-labelledby="what-heading" className="py-16">
        <SectionReveal className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">How it works</p>
          <h2 id="what-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">What are AI agents?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            An AI agent is an autonomous worker powered by a language model. Give it a goal, tools and knowledge, and it plans the steps, takes actions and delivers results — escalating to you only when it needs to.
          </p>
        </SectionReveal>
        <div className="mx-auto mt-14 grid max-w-5xl gap-4 px-6 md:grid-cols-4">
          {PIPELINE.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-2xl border border-white/10 bg-white/[.025] p-5 text-center"
            >
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg">
                <p.icon className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-white">{p.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{p.desc}</p>
              {i < PIPELINE.length - 1 && (
                <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-zinc-700 md:block">→</span>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section aria-labelledby="capabilities-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Capabilities</p>
          <h2 id="capabilities-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">What every agent can do</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Each capability is built in and composes with the rest — build a single agent or an entire workforce.</p>
        </SectionReveal>
        <HowAgentsWork />
      </section>

      {/* Examples */}
      <section aria-labelledby="examples-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Examples</p>
          <h2 id="examples-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Agents for every department</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Start from a template or build your own — these are the agents teams deploy on day one.</p>
        </SectionReveal>
        <AgentExamples />
      </section>

      {/* CTA */}
      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6"><AgentCta /></SectionReveal>
      </section>

      <Footer />
    </div>
  );
}
import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import {
  CapabilityGrid, WorkflowPhases, CodeHero, DevCtas,
} from '@/components/site/DeveloperShowcase';
import Footer from '@/components/site/Footer';

export default function Developers() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#090a0f] text-zinc-100">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-600/20 blur-[150px]" />
          <div className="absolute right-1/3 top-40 h-96 w-96 translate-x-1/2 rounded-full bg-violet-500/15 blur-[150px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(139,92,246,.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>

        <SectionReveal className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
            <Code2 className="h-3.5 w-3.5 text-cyan-400" /> For Developers
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Build Software With
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">An AI Workforce.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            PalladiumAI gives developers a full AI workforce — coding, testing, debugging, deploying and automating — from a single SDK and portal.
          </p>
          <div className="mt-8"><DevCtas /></div>
        </SectionReveal>

        <div className="mt-16"><CodeHero /></div>
      </section>

      {/* Capabilities */}
      <section aria-labelledby="caps-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Capabilities</p>
          <h2 id="caps-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Everything a developer needs</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">A complete AI dev stack — from coding agents to deployment and the Model Context Protocol.</p>
        </SectionReveal>
        <CapabilityGrid />
      </section>

      {/* Workflow phases */}
      <section aria-labelledby="workflow-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Workflow</p>
          <h2 id="workflow-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Build → Test → Debug → Deploy → Automate</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Agents own the whole software lifecycle alongside you.</p>
        </SectionReveal>
        <WorkflowPhases />
      </section>

      {/* CTA */}
      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#0c0d14] to-cyan-500/15 p-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.3),transparent_60%)]" />
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }} className="relative mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-[0_0_40px_rgba(139,92,246,.5)]">
              <Code2 className="h-7 w-7 text-white" />
            </motion.div>
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">Ship faster with an AI workforce</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Start building for free — your first 14 days include frontier models, agents and deploys.</p>
            <div className="relative mt-8"><DevCtas /></div>
          </div>
        </SectionReveal>
      </section>

      <Footer />
    </div>
  );
}
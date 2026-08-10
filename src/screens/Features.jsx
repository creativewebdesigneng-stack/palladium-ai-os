import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Layers } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import FeatureShowcase from '@/components/site/FeatureShowcase';
import Footer from '@/components/site/Footer';

const CATEGORIES = [
  'AI Agents', 'AI Workforce', 'Agent Builder', 'AI App Builder', 'Browser Control',
  'Computer Control', 'Web Search', 'Knowledge', 'Memory', 'Automation', 'Workflows',
  'Integrations', 'Developer Tools', 'Marketplace', 'Analytics', 'Business Tools',
];

export default function Features() {
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
            <Layers className="h-3.5 w-3.5 text-violet-400" /> Platform Features
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Every AI capability,
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">in one platform.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            PalladiumAI unifies agents, models, tools, automation, development and business operations. Explore the full set of capabilities that power the AI operating system.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register?returnTo=/dashboard" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Start Building <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/pricing" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">View Pricing</Link>
          </div>

          {/* Category pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c, i) => (
              <motion.span
                key={c}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-zinc-400 transition hover:border-violet-400/30 hover:text-white"
              >
                {c}
              </motion.span>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* Feature grid */}
      <section id="features" aria-labelledby="features-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Explore</p>
          <h2 id="features-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">16 capabilities. Zero glue code.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Each capability is built-in and works with the rest — pick what you need, scale as you grow.</p>
        </SectionReveal>
        <FeatureShowcase />
      </section>

      {/* CTA */}
      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#0c0d14] to-cyan-500/15 p-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.3),transparent_60%)]" />
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }} className="relative mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_40px_rgba(139,92,246,.5)]">
              <Sparkles className="h-7 w-7 text-white" />
            </motion.div>
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">Start Building</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Spin up your first agent in minutes. Your first 14 days are free — no credit card required.</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register?returnTo=/dashboard" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
                Start Building <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/login" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">Login</Link>
            </div>
          </div>
        </SectionReveal>
      </section>

      <Footer />
    </div>
  );
}
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BriefcaseBusiness, ArrowRight } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import {
  AudienceGrid, UseCaseGrid, WorkforceExamples, RoiMetrics, BusinessCtas,
} from '@/components/site/BusinessShowcase';
import Footer from '@/components/site/Footer';

export default function Business() {
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
            <BriefcaseBusiness className="h-3.5 w-3.5 text-violet-400" /> For Business
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            An AI workforce for
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"> every business.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            From small businesses to enterprise — PalladiumAI deploys specialised agents across sales, marketing, finance, operations, HR, support, development and research.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register?returnTo=/workforce" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Build Your AI Workforce <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/pricing" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">Talk To Sales</Link>
          </div>
        </SectionReveal>
      </section>

      {/* Audiences */}
      <section aria-labelledby="audiences-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Who it's for</p>
          <h2 id="audiences-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Built for every kind of team</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Whatever your size, PalladiumAI scales an AI workforce to fit.</p>
        </SectionReveal>
        <AudienceGrid />
      </section>

      {/* Use cases */}
      <section aria-labelledby="usecases-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">How it helps</p>
          <h2 id="usecases-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">AI across every department</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Specialised agents plug into each function and start delivering on day one.</p>
        </SectionReveal>
        <UseCaseGrid />
      </section>

      {/* Workforce examples */}
      <section aria-labelledby="workforce-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Examples</p>
          <h2 id="workforce-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">AI workforce examples</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Ready-made teams of collaborating agents — deploy one or all.</p>
        </SectionReveal>
        <WorkforceExamples />
      </section>

      {/* ROI */}
      <section aria-labelledby="roi-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Impact</p>
          <h2 id="roi-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Real results, fast</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">The outcomes teams see after deploying a PalladiumAI workforce.</p>
        </SectionReveal>
        <RoiMetrics />
      </section>

      {/* CTAs */}
      <section className="py-24">
        <SectionReveal className="mx-auto max-w-7xl px-6"><BusinessCtas /></SectionReveal>
      </section>

      <Footer />
    </div>
  );
}
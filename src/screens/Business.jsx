import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import {
  AudienceGrid, UseCaseGrid, WorkforceExamples, RoiMetrics, BusinessCtas,
} from '@/components/site/BusinessShowcase';
import Footer from '@/components/site/Footer';
import { AstraMark } from '@/components/blackstar/AstraMark';

export default function Business() {
  return (
    <div className="blackstar-public-page min-h-screen overflow-hidden bg-[#090a0f] text-zinc-100">
      <PublicNav />

      <section className="relative overflow-hidden px-6 pb-16 pt-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[150px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(123,92,255,.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>
        <SectionReveal className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
            <AstraMark size={16} /> For business
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Intelligence for operations,
            <span className="text-violet-300"> under command.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Blackstar deploys specialised agents across sales, marketing, finance, operations, HR, support and research. External actions stay on the existing approval rails.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register?returnTo=/workforce" className="blackstar-button group flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white">
              Build a workforce <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/pricing" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">View plans</Link>
          </div>
        </SectionReveal>
      </section>

      <section aria-labelledby="audiences-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Who it's for</p>
          <h2 id="audiences-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Built for every kind of team</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Scale the existing workforce model. Do not invent departments that are not in product.</p>
        </SectionReveal>
        <AudienceGrid />
      </section>

      <section aria-labelledby="usecases-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">How it helps</p>
          <h2 id="usecases-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Agents across the functions you already run</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Specialised agents use live tools and memory. Writes that leave the tenant stay gated.</p>
        </SectionReveal>
        <UseCaseGrid />
      </section>

      <section aria-labelledby="workforce-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Examples</p>
          <h2 id="workforce-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Workforce patterns already in Blackstar</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Deploy collaborating agents from the existing builder. No invented case studies.</p>
        </SectionReveal>
        <WorkforceExamples />
      </section>

      <section aria-labelledby="roi-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Impact</p>
          <h2 id="roi-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Measure what the workspace actually runs</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">ROI tiles below are product UI. Treat them as illustrative until live metrics are wired on that surface.</p>
        </SectionReveal>
        <RoiMetrics />
      </section>

      <section className="py-24">
        <SectionReveal className="mx-auto max-w-7xl px-6"><BusinessCtas /></SectionReveal>
      </section>

      <Footer />
    </div>
  );
}

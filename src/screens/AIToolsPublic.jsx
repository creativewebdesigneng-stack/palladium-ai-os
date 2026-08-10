import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Wrench, Sparkles } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import ToolsDirectory from '@/components/site/ToolsDirectory';
import Footer from '@/components/site/Footer';

export default function AIToolsPublic() {
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
            <Wrench className="h-3.5 w-3.5 text-violet-400" /> AI Tools Directory
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Explore every
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"> AI tool.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Browse models, agents, coding, research, writing, images, video, audio, automation and business tools — all available inside PalladiumAI.
          </p>
        </SectionReveal>
      </section>

      {/* Directory */}
      <section className="py-12">
        <ToolsDirectory />
      </section>

      {/* CTA */}
      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#0c0d14] to-cyan-500/15 p-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.3),transparent_60%)]" />
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }} className="relative mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_40px_rgba(139,92,246,.5)]">
              <Sparkles className="h-7 w-7 text-white" />
            </motion.div>
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">Explore AI</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Put any of these tools to work today. Start free — no credit card required.</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register?returnTo=/dashboard" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
                Explore AI <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/pricing" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">View Pricing</Link>
            </div>
          </div>
        </SectionReveal>
      </section>

      <Footer />
    </div>
  );
}
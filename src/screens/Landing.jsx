import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Globe2 } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import NeuralSpace from '@/components/visual/NeuralSpace';
import SectionReveal from '@/components/site/SectionReveal';
import PlatformVisual from '@/components/site/PlatformVisual';
import SectionGrid from '@/components/site/SectionGrid';
import Footer from '@/components/site/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#090a0f] text-zinc-100">
      <PublicNav />

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-16 pt-24">
        <NeuralSpace mode="space" intensity="hero" interactive className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/25 blur-[150px]" />
          <div className="absolute right-1/4 top-40 h-96 w-96 translate-x-1/2 rounded-full bg-cyan-500/20 blur-[150px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,.14),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-400" /> The AI Operating System — now in open beta
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-7 text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl"
          >
            THE AI OPERATING SYSTEM
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">FOR THE WORLD</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400"
          >
            Build, deploy and manage an AI workforce that can research, code, automate, analyse and complete real-world tasks.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link to="/register?returnTo=/dashboard" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Start Building <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/register?returnTo=/workforce" className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
              <Globe2 className="h-4 w-4 text-violet-400" /> Explore AI Workforce
            </Link>
          </motion.div>
          <p className="mt-4 text-xs text-zinc-600">Plans from £150/mo · Subscription required to access the platform</p>
        </div>

        {/* Premium platform visual */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="relative z-10 mt-16 w-full px-2"
        >
          <PlatformVisual />
        </motion.div>
      </section>

      {/* Platform capabilities */}
      <section id="features" aria-labelledby="features-heading" className="py-24">
        <SectionReveal className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Platform</p>
          <h2 id="features-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            One operating system. <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Every AI capability.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            PalladiumAI unifies agents, models, tools, automation, development and business operations into a single platform — so your team can run on AI without stitching together a dozen tools.
          </p>
        </SectionReveal>
        <div className="mt-14"><SectionGrid /></div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#0c0d14] to-cyan-500/15 p-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.3),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="relative mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_40px_rgba(139,92,246,.5)]"
            >
              <Sparkles className="h-7 w-7 text-white" />
            </motion.div>
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              Build Your AI Workforce Today
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">
              Join thousands of teams running on PalladiumAI. Choose a plan and deploy your first agent in minutes.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/pricing" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
                View Plans <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/login" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
                Login
              </Link>
              <Link to="/pricing" className="rounded-xl px-4 py-3 text-sm font-medium text-violet-300 transition hover:text-violet-200">
                View Pricing →
              </Link>
            </div>
          </div>
        </SectionReveal>
      </section>

      <Footer />
    </div>
  );
}
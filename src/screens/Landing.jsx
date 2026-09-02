import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Orbit, ShieldCheck, Sparkles, Network, Bot, Boxes } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import NeuralSpace from '@/components/visual/NeuralSpace';
import SectionReveal from '@/components/site/SectionReveal';
import PlatformVisual from '@/components/site/PlatformVisual';
import SectionGrid from '@/components/site/SectionGrid';
import Footer from '@/components/site/Footer';

const pillars = [
  [Network, 'UNIFY', 'Models, agents, tools and business systems connected through one intelligence layer.'],
  [Bot, 'EMPOWER', 'Autonomous intelligence that can reason, build, automate and act.'],
  [ShieldCheck, 'GOVERN', 'Enterprise controls, approvals, security and observability built into execution.'],
  [Boxes, 'SCALE', 'Infrastructure designed to move from one agent to a global intelligent workforce.'],
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#030306] text-zinc-100">
      <PublicNav />

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-16 pt-24">
        <NeuralSpace mode="space" intensity="hero" interactive className="absolute inset-0 h-full w-full opacity-90" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[38%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(139,92,246,.16),transparent_34%),radial-gradient(circle_at_50%_38%,rgba(255,255,255,.06),transparent_18%)]" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#030306] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8 }} className="mx-auto mb-8 grid h-20 w-20 place-items-center">
            <div className="blackstar-mark" aria-hidden="true"><span /></div>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-medium uppercase tracking-[.42em] text-violet-300 sm:text-sm">
            Intelligence Hub & Infrastructure
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 }} className="mt-5 text-5xl font-semibold leading-none tracking-[.12em] text-white sm:text-7xl md:text-8xl">
            BLACKSTAR
          </motion.h1>
          <motion.h2 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }} className="mt-8 text-2xl font-medium tracking-tight text-white sm:text-4xl">
            One intelligence layer. <span className="text-violet-300">Every system.</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }} className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Blackstar unifies models, agents, tools, applications, data and infrastructure so organisations can build, automate, govern and scale intelligent operations from one command layer.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .24 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register?returnTo=/dashboard" className="blackstar-button group flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white">
              Launch Blackstar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/features" className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[.025] px-6 py-3 text-sm font-medium text-zinc-200 backdrop-blur-xl transition hover:border-violet-400/35 hover:bg-violet-500/[.08]">
              <Orbit className="h-4 w-4 text-violet-300" /> Explore the platform
            </Link>
          </motion.div>
          <p className="mt-4 text-xs text-zinc-600">Enterprise intelligence · Secure execution · Global infrastructure</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35, duration: 1 }} className="relative z-10 mt-16 w-full px-2">
          <PlatformVisual />
        </motion.div>
      </section>

      <section className="relative border-y border-white/[.06] bg-black/20 py-20">
        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[.3em] text-violet-300">Our purpose</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Intelligence at the centre of everything.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {pillars.map(([Icon, title, copy]) => (
                <div key={title} className="blackstar-panel rounded-2xl p-5">
                  <Icon className="h-5 w-5 text-violet-300" />
                  <p className="mt-4 text-xs font-semibold tracking-[.2em] text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>
      </section>

      <section id="features" aria-labelledby="features-heading" className="py-24">
        <SectionReveal className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-300">The Blackstar ecosystem</p>
          <h2 id="features-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Everything connected. <span className="text-violet-300">Everything intelligent.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Blackstar brings agents, models, tools, automation, development and business operations into one governed intelligence infrastructure.
          </p>
        </SectionReveal>
        <div className="mt-14"><SectionGrid /></div>
      </section>

      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6">
          <div className="blackstar-panel relative overflow-hidden rounded-3xl p-12 text-center">
            <NeuralSpace mode="space" intensity="subtle" className="absolute inset-0 h-full w-full opacity-40" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,.22),transparent_55%)]" />
            <div className="blackstar-mark relative mx-auto mb-7 scale-75" aria-hidden="true"><span /></div>
            <p className="relative text-xs uppercase tracking-[.35em] text-violet-300">Blackstar Intelligence Hub & Infrastructure</p>
            <h2 className="relative mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">The foundation for the intelligent future.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Connect your systems. Deploy autonomous intelligence. Govern every action. Scale without limits.</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/pricing" className="blackstar-button group flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white">View Plans <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/login" className="rounded-xl border border-white/12 bg-white/[.03] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[.07]">Sign in</Link>
            </div>
          </div>
        </SectionReveal>
      </section>

      <Footer />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Orbit, ShieldCheck, Network, Bot, Boxes } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import NeuralSpace from '@/components/visual/NeuralSpace';
import BlackstarExperienceField from '@/components/blackstar/BlackstarExperienceField';
import BlackstarCommandCore from '@/components/site/BlackstarCommandCore';
import SectionReveal from '@/components/site/SectionReveal';
import VoidObservatoryDeck from '@/components/blackstar/VoidObservatoryDeck';
import SectionGrid from '@/components/site/SectionGrid';
import Footer from '@/components/site/Footer';
import { AstraMark } from '@/components/blackstar/AstraMark';

const pillars = [
  [Network, 'UNIFY', 'Models, agents, tools and business systems connected through one intelligence layer.'],
  [Bot, 'EMPOWER', 'Bounded intelligence that can reason, build, automate and act under command.'],
  [ShieldCheck, 'GOVERN', 'Enterprise controls, approvals, security and observability built into execution.'],
  [Boxes, 'SCALE', 'Infrastructure designed to move from one agent to a governed workforce.'],
];

export default function Landing() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="blackstar-public-page blackstar-public-landing blackstar-style-cosmic-core relative isolate min-h-screen overflow-hidden bg-[#010103] text-zinc-100">
      <div className="fixed inset-0 z-0">
        <BlackstarExperienceField room="astra-room-core" visualStyle="blackstar-style-cosmic-core" />
      </div>
      <PublicNav />

      <section className="relative min-h-screen overflow-hidden px-6 pb-20 pt-24">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#010103] via-[#010103]/85 to-transparent" />
        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.04fr_.96fr] lg:gap-16">
          <div>
            <motion.div initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={reducedMotion ? { duration: 0 } : { duration: .65 }} className="inline-flex items-center gap-3 rounded-full border border-violet-300/10 bg-violet-400/[.045] px-3.5 py-2 backdrop-blur-xl">
              <AstraMark size={20} title="Blackstar" />
              <span className="text-[10px] font-semibold uppercase tracking-[.24em] text-violet-100/70">Intelligence infrastructure</span>
            </motion.div>
            <motion.h1 initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={reducedMotion ? { duration: 0 } : { delay: .06, duration: .72 }} className="mt-8 max-w-4xl text-5xl font-semibold leading-[.94] tracking-[-.055em] text-white sm:text-6xl md:text-7xl xl:text-[5.6rem]">
              Build, run and govern
              <span className="block bg-gradient-to-r from-violet-200 via-white to-sky-200 bg-clip-text text-transparent">intelligent operations.</span>
            </motion.h1>
            <motion.p initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={reducedMotion ? { duration: 0 } : { delay: .14 }} className="mt-7 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
              Blackstar brings models, agents, memory, tools, workflows and business systems into one bounded intelligence layer — with approvals, audit and infrastructure controls built into execution.
            </motion.p>
            <motion.div initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={reducedMotion ? { duration: 0 } : { delay: .2 }} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/register?returnTo=/dashboard" className="blackstar-button group flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white">
                Enter Blackstar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/features" className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-6 py-3.5 text-sm font-medium text-zinc-200 backdrop-blur-xl transition hover:border-violet-400/30 hover:bg-violet-500/[.07]">
                <Orbit className="h-4 w-4 text-violet-300" /> Explore infrastructure
              </Link>
            </motion.div>
            <motion.div initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={reducedMotion ? { duration: 0 } : { delay: .28 }} className="mt-8 grid max-w-2xl gap-3 text-xs text-zinc-500 sm:grid-cols-3">
              <div className="border-l border-violet-300/20 pl-3"><span className="block font-semibold text-zinc-200">Bounded intelligence</span><span className="mt-1 block">Policy-aware execution</span></div>
              <div className="border-l border-sky-300/20 pl-3"><span className="block font-semibold text-zinc-200">Multi-provider</span><span className="mt-1 block">Models, tools and runtimes</span></div>
              <div className="border-l border-white/15 pl-3"><span className="block font-semibold text-zinc-200">Under command</span><span className="mt-1 block">Approvals, audit and control</span></div>
            </motion.div>
          </div>

          <motion.div initial={reducedMotion ? false : { opacity: 0, scale: .94, x: 28 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={reducedMotion ? { duration: 0 } : { delay: .12, duration: .9 }} className="relative">
            <BlackstarCommandCore />
          </motion.div>
        </div>

        <motion.div initial={reducedMotion ? false : { opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={reducedMotion ? { duration: 0 } : { delay: .32, duration: .9 }} className="relative z-10 mx-auto -mt-4 w-full max-w-7xl px-2">
          <VoidObservatoryDeck />
        </motion.div>
      </section>

      <section className="relative border-y border-white/[.06] bg-black/20 py-20">
        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[.3em] text-violet-300">Our purpose</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Intelligence at the centre of operations.</h2>
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
            Everything connected. <span className="text-violet-300">Under command.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Agents, models, tools, automation and business operations sit in one governed intelligence infrastructure.
          </p>
        </SectionReveal>
        <div className="mt-14"><SectionGrid /></div>
      </section>

      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6">
          <div className="blackstar-panel relative overflow-hidden rounded-3xl p-12 text-center">
            <NeuralSpace mode="space" intensity="subtle" className="absolute inset-0 h-full w-full opacity-40" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,.22),transparent_55%)]" />
            <div className="relative mx-auto mb-7 grid place-items-center"><AstraMark size={56} /></div>
            <p className="relative text-xs uppercase tracking-[.35em] text-violet-300">Blackstar Intelligence Hub & Infrastructure</p>
            <h2 className="relative mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Command the intelligent layer.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Connect systems. Dispatch agents. Govern every external write. Scale without losing control.</p>
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

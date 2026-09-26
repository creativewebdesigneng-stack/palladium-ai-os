import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import FeatureShowcase from '@/components/site/FeatureShowcase';
import Footer from '@/components/site/Footer';
import { AstraMark } from '@/components/blackstar/AstraMark';

const CATEGORIES = [
  'AI Agents', 'AI Workforce', 'Agent Builder', 'AI App Builder', 'Browser Control',
  'Computer Control', 'Web Search', 'Knowledge', 'Memory', 'Automation', 'Workflows',
  'Integrations', 'Developer Tools', 'Marketplace', 'Analytics', 'Business Tools',
];

export default function Features() {
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
            <AstraMark size={16} /> Platform capabilities
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Every capability,
            <br />
            <span className="text-violet-300">under command.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Blackstar unifies agents, models, tools, automation and business operations in one governed intelligence layer. Bounded engine. No AGI claim.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register?returnTo=/dashboard" className="blackstar-button group flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white">
              Launch Blackstar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/pricing" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">View Pricing</Link>
          </div>

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

      <section id="features" aria-labelledby="features-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Explore</p>
          <h2 id="features-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Connected capabilities. Governed execution.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Each surface sits on the existing Blackstar kernel — agents, approvals, memory and audit stay in place.</p>
        </SectionReveal>
        <FeatureShowcase />
      </section>

      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6">
          <div className="blackstar-panel relative overflow-hidden rounded-3xl p-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(123,92,255,.22),transparent_60%)]" />
            <div className="relative mx-auto mb-6 grid place-items-center">
              <AstraMark size={56} />
            </div>
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">Command the layer</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Dispatch agents. Keep external writes on the approval gate. Scale without losing control.</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register?returnTo=/dashboard" className="blackstar-button group flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white">
                Launch Blackstar <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">Sign in</Link>
            </div>
          </div>
        </SectionReveal>
      </section>

      <Footer />
    </div>
  );
}

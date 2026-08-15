import { Link } from 'react-router-dom';
import { BookOpen, Boxes, Cpu, Library, Wrench } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import Footer from '@/components/site/Footer';

const destinations = [
  {
    to: '/developer-portal',
    icon: BookOpen,
    title: 'Developer Portal',
    text: 'Use the authenticated developer surface for real API keys, webhooks, usage and platform documentation.',
  },
  {
    to: '/marketplace',
    icon: Boxes,
    title: 'Marketplace',
    text: 'Browse listings that come from the live marketplace backend rather than a static showcase.',
  },
  {
    to: '/models',
    icon: Cpu,
    title: 'Runtime Models',
    text: 'See the providers, model assignments and usage telemetry actually configured for your workspace.',
  },
  {
    to: '/skills',
    icon: Wrench,
    title: 'Skills & Tools',
    text: 'Inspect the live tool registry and server-enforced workspace permissions available to agents.',
  },
];

export default function Resources() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#090a0f] text-zinc-100">
      <PublicNav />

      <section className="relative overflow-hidden px-6 pb-14 pt-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[150px]" />
          <div className="absolute right-1/3 top-32 h-96 w-96 translate-x-1/2 rounded-full bg-cyan-500/15 blur-[150px]" />
        </div>
        <SectionReveal className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
            <Library className="h-3.5 w-3.5 text-violet-400" /> Resources
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Product resources,
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"> without invented content.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            A public article, research and case-study feed is not connected yet. Static publication counts, fictional customer stories and dated sample articles have been removed until a real CMS or documentation source exists.
          </p>
        </SectionReveal>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionReveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {destinations.map(({ to, icon: Icon, title, text }) => (
                <Link key={to} to={to} className="rounded-2xl border border-white/10 bg-white/[.03] p-5 transition hover:bg-white/[.05]">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
                  <h2 className="mt-3 text-sm font-semibold text-white">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
                </Link>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

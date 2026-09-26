import { Code2 } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import {
  CapabilityGrid, WorkflowPhases, CodeHero, DevCtas,
} from '@/components/site/DeveloperShowcase';
import Footer from '@/components/site/Footer';
import { AstraMark } from '@/components/blackstar/AstraMark';

export default function Developers() {
  return (
    <div className="blackstar-public-page min-h-screen overflow-hidden bg-[#090a0f] text-zinc-100">
      <PublicNav />

      <section className="relative overflow-hidden px-6 pb-20 pt-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/18 blur-[150px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(123,92,255,.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>

        <SectionReveal className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
            <AstraMark size={16} /> For developers
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Build software under
            <br />
            <span className="text-violet-300">Blackstar command.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Coding, testing, debugging and deploy sit on the existing SDK and portal. External writes stay on the approval gate.
          </p>
          <div className="mt-8"><DevCtas /></div>
        </SectionReveal>

        <div className="mt-16"><CodeHero /></div>
      </section>

      <section aria-labelledby="caps-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Capabilities</p>
          <h2 id="caps-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">The developer stack already in Blackstar</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Coding agents, deploy rails and MCP — reuse what exists. Do not invent extra providers.</p>
        </SectionReveal>
        <CapabilityGrid />
      </section>

      <section aria-labelledby="workflow-heading" className="py-16">
        <SectionReveal className="mx-auto mb-12 max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Workflow</p>
          <h2 id="workflow-heading" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Build → Test → Debug → Deploy → Automate</h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400">Agents work the lifecycle alongside you. Governance is not optional.</p>
        </SectionReveal>
        <WorkflowPhases />
      </section>

      <section className="py-24">
        <SectionReveal className="mx-auto max-w-5xl px-6">
          <div className="blackstar-panel relative overflow-hidden rounded-3xl p-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(123,92,255,.22),transparent_60%)]" />
            <div className="relative mx-auto mb-6 grid place-items-center"><AstraMark size={48} /></div>
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ship on the command layer</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Use the existing developer portal and runtime. No fabricated endpoints.</p>
            <div className="relative mt-8"><DevCtas /></div>
          </div>
        </SectionReveal>
      </section>

      <Footer />
    </div>
  );
}

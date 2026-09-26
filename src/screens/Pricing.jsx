import PublicNav from '@/components/site/PublicNav';
import Footer from '@/components/site/Footer';
import PricingCards from '@/components/site/PricingCards';
import PricingFaq from '@/components/site/PricingFaq';
import EnterpriseSection from '@/components/site/EnterpriseSection';
import SectionReveal from '@/components/site/SectionReveal';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';
import FreemiumPlans from '@/components/site/FreemiumPlans';
import { AstraMark } from '@/components/blackstar/AstraMark';

export default function Pricing() {
  return (
    <div className="blackstar-public-page blackstar-public-pricing relative min-h-screen text-zinc-100">
      <div aria-hidden className="fixed inset-0 -z-20 bg-[#090a0f]" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-50"><NeuralNetworkBackground /></div>
      <PublicNav />
      <section className="relative overflow-hidden pt-32 pb-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-80 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(123,92,255,.1),transparent_60%)]" />
        </div>
        <SectionReveal className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="mb-5 flex justify-center"><AstraMark size={40} /></div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Plans that scale with command</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">Every plan includes the Blackstar platform. Monthly or yearly. Workforce scale stays on the existing approval and billing rails.</p>
        </SectionReveal>
      </section>
      <section className="relative py-10">
        <SectionReveal className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Get started</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Start building with Blackstar.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">Builder starts at £150 per month, with Business and Enterprise plans for larger workforces and governed automation.</p>
        </SectionReveal>
        <div className="mt-10"><FreemiumPlans /></div>
      </section>
      <section className="py-12"><PricingCards /></section>
      <section className="py-16"><EnterpriseSection /></section>
      <section id="faq" className="py-16">
        <SectionReveal className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Frequently asked questions</h2>
        </SectionReveal>
        <div className="mt-10"><PricingFaq /></div>
      </section>
      <Footer />
    </div>
  );
}

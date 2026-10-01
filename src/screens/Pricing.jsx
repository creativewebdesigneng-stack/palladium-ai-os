import PublicNav from '@/components/site/PublicNav';
import Footer from '@/components/site/Footer';
import PricingCards from '@/components/site/PricingCards';
import PricingFaq from '@/components/site/PricingFaq';
import EnterpriseSection from '@/components/site/EnterpriseSection';
import SectionReveal from '@/components/site/SectionReveal';
import FreemiumPlans from '@/components/site/FreemiumPlans';
import { AstraMark } from '@/components/blackstar/AstraMark';
import PublicExperienceBackdrop from '@/components/site/PublicExperienceBackdrop';

export default function Pricing() {
  return (
    <div className="blackstar-public-page blackstar-public-pricing blackstar-style-orbital-elegance relative isolate min-h-screen overflow-hidden bg-[#010103] text-zinc-100">
      <PublicExperienceBackdrop room="astra-room-company" visualStyle="blackstar-style-orbital-elegance" />
      <PublicNav />
      <section className="relative overflow-hidden pt-32 pb-12">
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

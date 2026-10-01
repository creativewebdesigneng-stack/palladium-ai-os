import { useState, useMemo } from 'react';
import { LifeBuoy } from 'lucide-react';
import PublicNav from '@/components/site/PublicNav';
import SectionReveal from '@/components/site/SectionReveal';
import { HelpSearch, TopicGrid, ArticleGrid, FaqList, ContactSupport, AIAssistant, HelpCta } from '@/components/site/HelpShowcase';
import { ARTICLES } from '@/components/site/helpData';
import Footer from '@/components/site/Footer';
import PublicExperienceBackdrop from '@/components/site/PublicExperienceBackdrop';

export default function HelpCentre() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const matchCat = active === 'all' || a.topic === active;
      const matchQ = !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
      return matchCat && matchQ;
    }).length;
  }, [query, active]);

  return (
    <div className="blackstar-public-page blackstar-public-help blackstar-style-ethereal-luxury relative isolate min-h-screen overflow-hidden bg-[#010103] text-zinc-100">
      <PublicExperienceBackdrop room="astra-room-wellbeing" visualStyle="blackstar-style-ethereal-luxury" />
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-12 pt-32">
        <SectionReveal className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
            <LifeBuoy className="h-3.5 w-3.5 text-violet-400" /> Help Centre
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            How can we
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"> help you?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Search our knowledge base, browse popular topics, or talk to our AI support assistant.
          </p>
        </SectionReveal>
      </section>

      {/* Search */}
      <section className="pb-4">
        <div className="mx-auto max-w-7xl px-6">
          <HelpSearch query={query} setQuery={setQuery} active={active} setActive={setActive} results={results} />
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-12">
        <SectionReveal className="mx-auto mb-6 max-w-7xl px-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-violet-400">Popular Topics</h2>
          <p className="mt-1 text-sm text-zinc-500">Jump straight to the area you need.</p>
        </SectionReveal>
        <TopicGrid />
      </section>

      {/* Articles */}
      <section className="py-12">
        <SectionReveal className="mx-auto mb-6 max-w-7xl px-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-violet-400">Support Articles</h2>
          <p className="mt-1 text-sm text-zinc-500">Guides and how-tos across every category.</p>
        </SectionReveal>
        <ArticleGrid query={query} active={active} />
      </section>

      {/* AI Assistant */}
      <section className="py-12">
        <SectionReveal className="mx-auto mb-6 max-w-7xl px-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-violet-400">AI Support Assistant</h2>
          <p className="mt-1 text-sm text-zinc-500">Get answers from the connected Blackstar AI support service.</p>
        </SectionReveal>
        <AIAssistant />
      </section>

      {/* FAQ */}
      <section className="py-12">
        <SectionReveal className="mx-auto mb-6 max-w-7xl px-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-violet-400">Frequently Asked Questions</h2>
          <p className="mt-1 text-sm text-zinc-500">Quick answers to common questions.</p>
        </SectionReveal>
        <FaqList />
      </section>

      {/* Contact Support */}
      <section id="contact" className="py-12">
        <SectionReveal className="mx-auto mb-6 max-w-7xl px-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-violet-400">Support Options</h2>
          <p className="mt-1 text-sm text-zinc-500">Use support channels that are actually connected on this deployment.</p>
        </SectionReveal>
        <ContactSupport />
      </section>

      {/* CTA */}
      <section className="py-24"><SectionReveal><HelpCta /></SectionReveal></section>

      <Footer />
    </div>
  );
}
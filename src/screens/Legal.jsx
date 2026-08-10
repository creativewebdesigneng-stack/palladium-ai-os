import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ShieldCheck, Cookie, BookOpen, Sparkles, Lock, ScrollText, AlertTriangle } from 'lucide-react';
import { POLICIES, ORDER } from '@/components/site/legalData';
import PublicNav from '@/components/site/PublicNav';
import Footer from '@/components/site/Footer';

const ICONS = {
  'terms-of-service': ScrollText,
  'privacy-policy': FileText,
  'cookie-policy': Cookie,
  'acceptable-use': BookOpen,
  'ai-safety': Sparkles,
  'security': Lock,
  'data-processing-agreement': ShieldCheck,
};

export default function LegalLayout() {
  const { slug } = useParams();
  const policy = POLICIES[slug];
  const [activeId, setActiveId] = useState('');

  // Track active section on scroll
  useEffect(() => {
    if (!policy) return;
    const handler = () => {
      const offsets = policy.sections.map((s) => {
        const el = document.getElementById(s.id);
        return { id: s.id, top: el ? el.getBoundingClientRect().top : Infinity };
      });
      const current = offsets.filter((o) => o.top <= 140).sort((a, b) => b.top - a.top)[0];
      setActiveId(current ? current.id : policy.sections[0].id);
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [slug, policy]);

  if (!policy) return <Navigate to={`/legal/${ORDER[0]}`} replace />;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#090a0f] text-zinc-100">
      <PublicNav />

      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute right-1/4 top-40 h-72 w-72 translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      {/* Page header */}
      <header className="relative border-b border-white/10 bg-white/[.02] px-6 pt-32 pb-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-400">Legal</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = ICONS[slug] || FileText;
                return <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400"><Icon className="h-5 w-5 text-white" /></span>;
              })()}
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{policy.label}</h1>
            </div>
            <p className="text-xs text-zinc-500">Last updated: <span className="text-zinc-300">{policy.updated}</span></p>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400">{policy.intro}</p>
        </div>
      </header>

      {/* Policy nav pills */}
      <nav className="relative sticky top-0 z-30 border-b border-white/10 bg-[#090a0f]/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto">
          {ORDER.map((s) => (
            <Link
              key={s}
              to={`/legal/${s}`}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${s === slug ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'}`}
            >
              {POLICIES[s].label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Body: TOC sidebar + content */}
      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          {/* Table of Contents */}
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Table of Contents</p>
            <ul className="mt-3 space-y-1">
              {policy.sections.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => scrollTo(s.id)}
                    className={`block w-full border-l-2 px-3 py-1.5 text-left text-[13px] transition ${activeId === s.id ? 'border-violet-400 bg-violet-500/10 text-white' : 'border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'}`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Content */}
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-w-0"
          >
            {/* Placeholder notice */}
            <div className="mb-8 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-500/[.06] p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs leading-relaxed text-amber-200/90">
                <span className="font-semibold">Placeholder content.</span> This text is shown for layout demonstration only and is <span className="font-semibold">not legal advice</span>. Replace it with reviewed, approved content before publishing.
              </p>
            </div>

            <div className="space-y-10">
              {policy.sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-28">
                  <h2 className="text-lg font-semibold tracking-tight text-white">{s.title}</h2>
                  <div className="mt-3 space-y-3">
                    {s.body.map((p, i) => (
                      <p key={i} className="text-sm leading-7 text-zinc-400">{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Footer nav */}
            <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-6 text-sm">
              {(() => {
                const idx = ORDER.indexOf(slug);
                const prev = idx > 0 ? ORDER[idx - 1] : null;
                const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
                return (
                  <>
                    {prev ? (
                      <Link to={`/legal/${prev}`} className="flex items-center gap-2 text-zinc-400 transition hover:text-white">← {POLICIES[prev].label}</Link>
                    ) : <span />}
                    {next ? (
                      <Link to={`/legal/${next}`} className="flex items-center gap-2 text-zinc-400 transition hover:text-white">{POLICIES[next].label} →</Link>
                    ) : <span />}
                  </>
                );
              })()}
            </div>
          </motion.article>
        </div>
      </div>

      <Footer />
    </div>
  );
}
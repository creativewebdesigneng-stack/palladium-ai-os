import { useParams, Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  Cookie,
  FileText,
  Lock,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { POLICIES, ORDER } from '@/components/site/legalData';
import PublicNav from '@/components/site/PublicNav';
import Footer from '@/components/site/Footer';
import PublicExperienceBackdrop from '@/components/site/PublicExperienceBackdrop';

const ICONS = {
  'terms-of-service': ScrollText,
  'privacy-policy': FileText,
  'cookie-policy': Cookie,
  'acceptable-use': BookOpen,
  'ai-safety': Sparkles,
  security: Lock,
  'data-processing-agreement': ShieldCheck,
};

export default function LegalLayout() {
  const { slug } = useParams();
  const policy = POLICIES[slug];

  if (!policy) return <Navigate to={`/legal/${ORDER[0]}`} replace />;

  const Icon = ICONS[slug] || FileText;

  return (
    <div className="blackstar-public-page blackstar-public-legal blackstar-style-elite-corporate relative isolate min-h-screen overflow-hidden bg-[#010103] text-zinc-100">
      <PublicNav />

      <PublicExperienceBackdrop room="astra-room-legal" visualStyle="blackstar-style-elite-corporate" />

      <header className="relative border-b border-white/10 bg-white/[.02] px-6 pb-10 pt-32">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-400">Legal publication status</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
              <Icon className="h-5 w-5 text-white" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{policy.label}</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Draft — not in force</p>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">{policy.summary}</p>
        </div>
      </header>

      <nav className="relative sticky top-0 z-30 border-b border-white/10 bg-[#090a0f]/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto">
          {ORDER.map((item) => (
            <Link
              key={item}
              to={`/legal/${item}`}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${item === slug ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'}`}
            >
              {POLICIES[item].label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="relative mx-auto max-w-5xl px-6 py-14">
        <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[.045] p-6 sm:p-8">
          <div className="flex gap-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-lg font-semibold text-white">Publication pending review</h2>
              <p className="mt-3 text-sm leading-7 text-amber-50/75">
                Blackstar intentionally does not publish the previous placeholder policy text as a contractual, privacy, compliance or security commitment. The final document for this topic still requires formal review and approval.
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Do not rely on this page as a binding policy or representation of certification, retention periods, support contacts, security controls or legal obligations. A reviewed version and effective date must be published before this document is treated as in force.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Blackstar status</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            The platform remains under production hardening. This legal publication state is explicit so draft language cannot be mistaken for a finalized customer promise.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Check } from 'lucide-react';

// Premium screen shown to authenticated users who attempt to access a protected
// page without an active paid subscription. Renders inside the protected layout
// (the URL is preserved) so the user can choose a plan to continue.
export default function SubscriptionRequired() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,.12),transparent_60%)]" />
      </div>
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-white/[.03] p-8 text-center backdrop-blur-xl sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_0_40px_rgba(139,92,246,.4)]">
          <Lock className="h-6 w-6 text-white" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">An active subscription is required</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          PalladiumAI is a premium AI platform. To protect your workspace and data, access to the application requires an active paid subscription. Choose a plan to continue.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/pricing" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:opacity-90">
            View Plans <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link to="/" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10">
            Back to home
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-[11px] text-zinc-500">
          {['No free tier', 'Cancel anytime', 'Stripe-secured billing', 'GBP (£) pricing'].map((t) => (
            <span key={t} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> {t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, RefreshCw, Lock, WifiOff, ShieldAlert, Search, Inbox } from 'lucide-react';

const MAP = {
  404: { code: '404', title: 'Page not found', desc: 'The page you’re looking for doesn’t exist or has been moved.', icon: Search },
  403: { code: '403', title: 'Access denied', desc: 'You don’t have permission to view this page.', icon: Lock },
  500: { code: '500', title: 'Something went wrong', desc: 'An unexpected error occurred. Please try again.', icon: ShieldAlert },
  offline: { code: '—', title: 'You’re offline', desc: 'Check your internet connection and try again.', icon: WifiOff },
  permission: { code: '403', title: 'Permission required', desc: 'You need elevated permissions to access this area.', icon: Lock },
};

export default function ErrorState({ variant = '404', message, onRetry, showHome = true }) {
  const cfg = MAP[variant] || MAP['404'];
  const Icon = cfg.icon;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 mx-auto h-40 w-40 rounded-full bg-violet-600/15 blur-3xl" />
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-violet-300">
            <Icon className="h-7 w-7" />
          </span>
        </div>
        <p className="mt-6 text-5xl font-light tracking-tight text-white">{cfg.code}</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{cfg.title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">{message || cfg.desc}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.03] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          )}
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-5 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
            <ArrowLeft className="h-4 w-4" /> Go back
          </button>
          {showHome && (
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
              <Home className="h-4 w-4" /> Home
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', desc = 'Items will appear here once created.', action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-zinc-500"><Icon className="h-6 w-6" /></span>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}
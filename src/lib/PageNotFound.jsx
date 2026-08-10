import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return { user, isAuthenticated: true };
      } catch (error) {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090a0f] p-6 text-zinc-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute right-1/3 bottom-1/4 h-72 w-72 translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-violet-300">
          <Search className="h-7 w-7" />
        </span>
        <h1 className="mt-6 text-7xl font-light tracking-tight text-white">404</h1>
        <div className="mx-auto mt-1 h-0.5 w-16 bg-white/10" />
        <h2 className="mt-5 text-2xl font-semibold text-white">Page not found</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          The page <span className="font-medium text-zinc-200">"{pageName}"</span> could not be found in this application.
        </p>

        {isFetched && authData?.isAuthenticated && authData.user?.role === 'admin' && (
          <div className="mt-8 rounded-xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-left">
            <p className="text-sm font-medium text-amber-200">Admin note</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-200/80">This page may not be implemented yet. Ask the AI builder to create it.</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.03] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
            <ArrowLeft className="h-4 w-4" /> Go back
          </button>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
            <Home className="h-4 w-4" /> Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
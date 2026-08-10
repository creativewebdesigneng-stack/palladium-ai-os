import { motion } from 'framer-motion';
import { Plug, Sparkles } from 'lucide-react';

export default function ModelsEmptyState({ onConnect }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-[#0c0d13] to-cyan-500/10 p-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(139,92,246,.2),transparent_60%)]" />
      {/* Connected brains illustration */}
      <div className="relative mx-auto mb-6 flex h-32 w-64 items-center justify-center">
        {['from-violet-500 to-indigo-500', 'from-cyan-400 to-blue-500', 'from-emerald-400 to-teal-500'].map((g, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.15 }}
            className={`absolute grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${g} shadow-[0_0_40px_rgba(139,92,246,.4)]`}
            style={{ left: `${20 + i * 30}%`, transform: `translateX(${(i - 1) * 60}px)` }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.div>
        ))}
        <motion.svg className="absolute inset-0 h-full w-full" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}>
          <line x1="30%" y1="50%" x2="50%" y2="50%" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="50%" y1="50%" x2="70%" y2="50%" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" strokeDasharray="4 4" />
        </motion.svg>
      </div>
      <h2 className="relative text-xl font-semibold text-white sm:text-2xl">Connect Your First AI Provider</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm text-zinc-400">Unlock the full power of PalladiumAI by connecting your preferred AI models.</p>
      <button onClick={onConnect} className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90">
        <Plug className="h-4 w-4" />Connect Provider
      </button>
    </motion.div>
  );
}
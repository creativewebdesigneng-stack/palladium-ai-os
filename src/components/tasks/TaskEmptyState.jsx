import { motion } from 'framer-motion';
import { Plus, Sparkles, ArrowRight } from 'lucide-react';

export default function TaskEmptyState({ onCreate }) {
  return (
    <div className="grid place-items-center py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-md text-center"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 mx-auto h-48 w-48 -translate-y-6 rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-500/20 blur-3xl" />
        <div className="mx-auto mb-6 grid h-28 w-28 place-items-center rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-cyan-400/10">
          <div className="relative">
            <Sparkles className="h-12 w-12 text-violet-300" />
            <motion.div
              className="absolute -right-2 -top-2 h-3 w-3 rounded-full bg-cyan-400"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
        </div>
        <h3 className="text-2xl font-semibold tracking-tight text-white">Start Automating Your Work</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">
          Create your first AI task and let your workforce complete it automatically.
        </p>
        <button
          onClick={onCreate}
          className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-indigo-500"
        >
          <Plus className="h-4 w-4" /> Create Task <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}
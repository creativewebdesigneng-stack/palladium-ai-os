import { motion } from 'framer-motion';
import { Workflow, Bot, Plug, GitBranch, UserCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function AutomationEmptyState({ onStart }) {
  const orbit = [
    { Icon: Bot, x: -92, y: -38, delay: 0, grad: 'from-violet-500 to-indigo-500' },
    { Icon: Plug, x: 92, y: -38, delay: 0.5, grad: 'from-cyan-500 to-sky-500' },
    { Icon: GitBranch, x: -72, y: 52, delay: 1, grad: 'from-emerald-500 to-teal-500' },
    { Icon: UserCheck, x: 72, y: 52, delay: 1.5, grad: 'from-rose-500 to-pink-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-[#0c0d13] to-cyan-500/10 p-10 text-center"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(139,92,246,.2),transparent_60%)]" />

      <div className="relative mx-auto mb-8 flex h-48 w-80 items-center justify-center">
        {/* SVG connection lines */}
        <svg className="absolute inset-0 h-full w-full">
          {[
            { x1: '50%', y1: '50%', x2: '28%', y2: '40%' },
            { x1: '50%', y1: '50%', x2: '72%', y2: '40%' },
            { x1: '50%', y1: '50%', x2: '35%', y2: '62%' },
            { x1: '50%', y1: '50%', x2: '65%', y2: '62%' },
          ].map((l, i) => (
            <motion.line
              key={i}
              {...l}
              stroke="rgba(139,92,246,.25)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.2 }}
            />
          ))}
        </svg>

        {/* Central node */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.5 }}
          className="absolute z-10 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_60px_rgba(139,92,246,.5)]"
        >
          <Workflow className="h-11 w-11 text-white" />
        </motion.div>

        {/* Orbiting nodes */}
        {orbit.map((o, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -7, 0] }}
            transition={{ repeat: Infinity, duration: 3, delay: o.delay }}
            className={`absolute grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${o.grad} shadow-xl`}
            style={{ transform: `translate(${o.x}px, ${o.y}px)` }}
          >
            <o.Icon className="h-7 w-7 text-white" />
          </motion.div>
        ))}
      </div>

      <h2 className="relative text-2xl font-semibold text-white sm:text-3xl">Build Your First AI Workflow</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm text-zinc-400">
        Connect AI agents, applications and integrations into powerful automated workflows.
      </p>
      <button
        onClick={onStart}
        className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90"
      >
        <Sparkles className="h-4 w-4" />Create Workflow <ArrowRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
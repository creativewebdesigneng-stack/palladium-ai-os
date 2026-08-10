import { motion } from 'framer-motion';
import { Rocket, Hammer, Cpu, Boxes } from 'lucide-react';

export default function BuilderEmptyState({ onStart }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-[#0c0d13] to-cyan-500/10 p-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(139,92,246,.2),transparent_60%)]" />

      {/* AI building software illustration */}
      <div className="relative mx-auto mb-8 flex h-40 w-64 items-center justify-center">
        {/* Central hammer/rocket */}
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute z-10 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_50px_rgba(139,92,246,.5)]">
          <Rocket className="h-9 w-9 text-white" />
        </motion.div>
        {/* Orbiting icons */}
        {[
          { Icon: Hammer, x: -90, y: -30, delay: 0, grad: 'from-emerald-500 to-teal-400' },
          { Icon: Cpu, x: 90, y: -30, delay: 0.6, grad: 'from-amber-500 to-orange-400' },
          { Icon: Boxes, x: -70, y: 50, delay: 1.2, grad: 'from-rose-500 to-pink-400' },
          { Icon: Rocket, x: 70, y: 50, delay: 1.8, grad: 'from-sky-500 to-cyan-400' },
        ].map((o, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, delay: o.delay }}
            className={`absolute grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${o.grad} shadow-lg`}
            style={{ transform: `translate(${o.x}px, ${o.y}px)` }}
          >
            <o.Icon className="h-5 w-5 text-white" />
          </motion.div>
        ))}
        {/* Connection lines */}
        <svg className="absolute inset-0 h-full w-full">
          {[-90, 90].map((x, i) => (
            <motion.line key={i} x1="50%" y1="50%" x2={50 + x * 0.5 + '%'} y2={i ? '20%' : '80%'} stroke="rgba(139,92,246,.25)" strokeWidth="1" strokeDasharray="3 3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: i * 0.3 }} />
          ))}
        </svg>
      </div>

      <h2 className="relative text-2xl font-semibold text-white sm:text-3xl">Start Your First AI Project</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm text-zinc-400">Describe your idea and your AI workforce will design, build and deploy it for you.</p>
      <button onClick={onStart} className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90">
        <Rocket className="h-4 w-4" />Start Building
      </button>
    </motion.div>
  );
}
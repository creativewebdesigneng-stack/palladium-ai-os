import { motion } from 'framer-motion';
import { Split, Repeat, Plus } from 'lucide-react';
import { CONDITIONS, LOOPS } from './automationData';

export default function ConditionsLoops() {
  return (
    <div className="space-y-4">
      {/* Conditions */}
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="mb-4 flex items-center gap-1.5">
          <Split className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Conditions</h2>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{CONDITIONS.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {CONDITIONS.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.2) }}
              whileHover={{ y: -2 }}
              className="group rounded-xl border border-white/10 bg-black/20 p-3 hover:border-amber-400/30"
            >
              <span className={`mb-2 grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${c.grad} text-white shadow`}>
                <c.icon className="h-4 w-4" />
              </span>
              <p className="text-xs font-semibold text-white">{c.name}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Loops */}
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="mb-4 flex items-center gap-1.5">
          <Repeat className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Loops</h2>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{LOOPS.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {LOOPS.map((l, i) => (
            <motion.div
              key={l.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              whileHover={{ y: -2 }}
              className="group rounded-xl border border-white/10 bg-black/20 p-3 hover:border-cyan-400/30"
            >
              <span className={`mb-2 grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${l.grad} text-white shadow`}>
                <l.icon className="h-4 w-4" />
              </span>
              <p className="text-xs font-semibold text-white">{l.name}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{l.desc}</p>
            </motion.div>
          ))}
          <button className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-3 text-xs text-zinc-500 hover:border-cyan-400/40 hover:text-cyan-400">
            <Plus className="h-3.5 w-3.5" />Custom Loop
          </button>
        </div>
      </div>
    </div>
  );
}
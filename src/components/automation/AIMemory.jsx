import { motion } from 'framer-motion';
import { Brain, ToggleRight, ToggleLeft } from 'lucide-react';
import { AI_MEMORY } from './automationData';

export default function AIMemory() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <Brain className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">AI Memory</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{AI_MEMORY.filter(m => m.enabled).length}/{AI_MEMORY.length} active</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {AI_MEMORY.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.2) }}
            className={`rounded-xl border p-3.5 ${m.enabled ? 'border-violet-400/30 bg-violet-500/5' : 'border-white/10 bg-black/20'}`}
          >
            <div className="flex items-start justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${m.grad} text-white shadow`}>
                <m.icon className="h-5 w-5" />
              </span>
              {m.enabled
                ? <ToggleRight className="h-5 w-5 text-violet-400" />
                : <ToggleLeft className="h-5 w-5 text-zinc-600" />}
            </div>
            <p className="mt-2.5 text-xs font-semibold text-white">{m.name}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{m.desc}</p>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-600">Storage</span>
              <span className="text-[10px] font-medium text-zinc-400">{m.size}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
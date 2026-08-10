import { motion } from 'framer-motion';
import { Brain, Plus } from 'lucide-react';
import { AI_MEMORY } from './filesData';
import { SectionHead, Progress } from './shared';

export default function AIMemory() {
  const enabled = AI_MEMORY.filter(m => m.enabled).length;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Brain} title="AI Memory" count={`${enabled}/${AI_MEMORY.length}`} grad="from-purple-500 to-violet-500" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AI_MEMORY.map((m, i) => (
          <motion.div key={m.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.25) }} whileHover={{ y: -2 }}
            className={`rounded-xl border p-3.5 ${m.enabled ? 'border-white/10 bg-black/20' : 'border-dashed border-white/10 bg-transparent opacity-60'}`}>
            <div className="mb-2.5 flex items-center justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${m.grad} shadow-lg`}><m.icon className="h-4.5 w-4.5 text-white" /></span>
              <div className={`h-5 w-9 rounded-full p-0.5 transition ${m.enabled ? 'bg-emerald-400/30' : 'bg-white/10'}`}>
                <span className={`block h-4 w-4 rounded-full transition ${m.enabled ? 'translate-x-4 bg-emerald-400' : 'bg-zinc-500'}`} />
              </div>
            </div>
            <p className="text-sm font-semibold text-white">{m.name}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{m.desc}</p>
            <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500">
              <span>{m.size}</span>
              <span>{m.entries} entries</span>
            </div>
            {m.enabled && <div className="mt-2"><Progress value={Math.floor(Math.random() * 50 + 40)} grad={m.grad} /></div>}
          </motion.div>
        ))}
        <button className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-4 text-xs text-zinc-500 hover:border-violet-400/40 hover:text-violet-400">
          <Plus className="h-4 w-4" />Add Memory Type
        </button>
      </div>
    </div>
  );
}
import { motion } from 'framer-motion';
import { DEFAULT_MODELS, MODELS } from './modelsData';

export default function DefaultModels({ onChange }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Default Models</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Choose the go-to model for each task type.</p>
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {DEFAULT_MODELS.map((d, i) => (
          <motion.div key={d.task} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-violet-300"><d.icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500">{d.task}</p>
              <select
                value={d.model}
                onChange={(e) => onChange && onChange(d.task, e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-white outline-none"
              >
                {MODELS.map(m => <option key={m.id} className="bg-[#14151d]">{m.name}</option>)}
              </select>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
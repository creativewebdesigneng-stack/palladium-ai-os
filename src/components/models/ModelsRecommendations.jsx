import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { RECOMMENDATIONS } from './modelsData';

export default function ModelsRecommendations() {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-400/5 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-white">AI Recommendations</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {RECOMMENDATIONS.map((r, i) => (
          <motion.div key={r.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${r.grad} text-white`}><r.icon className="h-4 w-4" /></span>
            <div><p className="text-sm font-medium text-white">{r.title}</p><p className="mt-0.5 text-[11px] text-zinc-400">{r.desc}</p></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
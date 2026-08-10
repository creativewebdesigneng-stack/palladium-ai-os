import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Plus } from 'lucide-react';
import { RECOMMENDED, ALL_INTEGRATIONS } from './integrationsData';
import { SectionHead } from './shared';

export default function RecommendedIntegrations({ onOpen }) {
  return (
    <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/5 to-transparent p-4">
      <SectionHead icon={Sparkles} title="AI Recommendations" grad="from-violet-500 to-fuchsia-500" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RECOMMENDED.map((r, i) => {
          const it = ALL_INTEGRATIONS.find(x => x.id === r.integration);
          return (
            <motion.div key={r.integration} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="flex flex-col rounded-xl border border-white/10 bg-black/20 p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${r.grad}`}><r.icon className="h-4 w-4 text-white" /></span>
                <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-300">Suggested</span>
              </div>
              <p className="flex-1 text-xs leading-relaxed text-zinc-300">{r.text}</p>
              {it && (
                <button onClick={() => onOpen(it)} className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-500/10 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20">
                  <Plus className="h-3.5 w-3.5" />Connect {it.name}<ArrowRight className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
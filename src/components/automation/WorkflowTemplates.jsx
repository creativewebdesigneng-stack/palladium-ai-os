import { motion } from 'framer-motion';
import { LayoutGrid, Star, Download, ArrowRight } from 'lucide-react';
import { WORKFLOW_TEMPLATES } from './automationData';

export default function WorkflowTemplates() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5">
        <LayoutGrid className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Workflow Templates</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{WORKFLOW_TEMPLATES.length}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {WORKFLOW_TEMPLATES.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-violet-400/30"
          >
            <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${t.grad} opacity-20 blur-2xl`} />
            <div className="relative flex items-start gap-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.grad} text-white shadow-lg`}>
                <t.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-white">{t.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{t.desc}</p>
              </div>
            </div>
            <div className="relative mt-3 flex flex-wrap gap-1">
              {t.tags.map(tag => (
                <span key={tag} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">{tag}</span>
              ))}
            </div>
            <div className="relative mt-3 flex items-center gap-3 border-t border-white/5 pt-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-0.5 text-amber-400"><Star className="h-3 w-3 fill-current" />{t.rating}</span>
              <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{t.runs}</span>
              <button className="ml-auto flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-white/15">
                Use Template <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
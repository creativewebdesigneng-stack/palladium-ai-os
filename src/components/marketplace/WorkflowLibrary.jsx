import { motion } from 'framer-motion';
import { Workflow as WorkflowIcon, Star, Download, GitBranch } from 'lucide-react';
import SectionHead from './SectionHead';
import { PriceButton } from './shared';
import { WORKFLOWS } from './marketplaceData';

export default function WorkflowLibrary() {
  return (
    <div>
      <SectionHead icon={WorkflowIcon} title="Workflow Library" count={WORKFLOWS.length} grad="from-emerald-500 to-teal-500" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {WORKFLOWS.map((w, i) => (
          <motion.article
            key={w.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            whileHover={{ y: -4 }}
            className="group flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-violet-400/30"
          >
            <div className="flex items-center gap-2.5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${w.grad} text-white shadow-lg`}>
                <w.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-white">{w.name}</h3>
                <p className="text-[11px] text-zinc-500">{w.steps} steps · {w.runs} runs</p>
              </div>
            </div>
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{w.desc}</p>
            <div className="mt-2.5 flex items-center gap-1 text-[11px] text-zinc-500">
              <GitBranch className="h-3 w-3" />Automation workflow
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1 text-amber-400"><Star className="h-3 w-3 fill-current" />{w.rating}</span>
              <span className="flex items-center gap-1"><Download className="h-3 w-3" />{w.downloads}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <PriceButton price={w.price} />
              <button className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Configure</button>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
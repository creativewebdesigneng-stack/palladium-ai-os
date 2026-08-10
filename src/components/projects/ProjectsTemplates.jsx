import { motion } from 'framer-motion';
import { Download, Star } from 'lucide-react';
import { TEMPLATES } from './projectsData';
import { SectionHead } from './shared';

export default function ProjectsTemplates() {
  return (
    <div>
      <SectionHead icon={Star} title="Project Templates" count={TEMPLATES.length} grad="from-amber-500 to-orange-500" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {TEMPLATES.map((t, i) => (
          <motion.button
            key={t.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[.035] p-3 text-left hover:border-violet-400/30 hover:bg-white/[.06]"
          >
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${t.grad} shadow-lg`}>
              <t.icon className="h-4 w-4 text-white" />
            </span>
            <p className="text-xs font-semibold text-white">{t.name}</p>
            <p className="line-clamp-2 text-[11px] text-zinc-500">{t.desc}</p>
            <div className="mt-1 flex items-center justify-between w-full">
              <span className="flex items-center gap-1 text-[10px] text-amber-400"><Star className="h-2.5 w-2.5 fill-amber-400" />{t.rating}</span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-500"><Download className="h-2.5 w-2.5" />{t.uses}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
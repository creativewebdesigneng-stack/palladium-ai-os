import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { TEMPLATES } from './builderData';

export default function ProjectTemplates() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Project Templates</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {TEMPLATES.map((t, i) => (
          <motion.button key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -3 }} className="group overflow-hidden rounded-xl border border-white/10 bg-black/20 text-left hover:border-white/20">
            <div className={`relative h-16 bg-gradient-to-br ${t.grad}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,.15),transparent_60%)]" />
              <t.icon className="absolute inset-0 m-auto h-6 w-6 text-white/80" />
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-white">{t.name}</p>
              <p className="text-[10px] text-zinc-500">{t.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
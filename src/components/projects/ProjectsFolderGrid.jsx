import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { FOLDERS } from './projectsData';

export default function ProjectsFolderGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      {FOLDERS.map((f, i) => (
        <motion.button
          key={f.name}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.03 }}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[.035] p-3 text-left hover:border-violet-400/30 hover:bg-white/[.06]"
        >
          <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${f.grad} shadow-lg`}>
            <f.icon className="h-4 w-4 text-white" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">{f.name}</p>
            <p className="text-[11px] text-zinc-500">{f.count} projects</p>
          </div>
        </motion.button>
      ))}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: FOLDERS.length * 0.03 }}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 p-3 text-zinc-500 hover:border-violet-400/40 hover:text-zinc-300"
      >
        <Plus className="h-4 w-4" /> <span className="text-[11px]">New Folder</span>
      </motion.button>
    </div>
  );
}
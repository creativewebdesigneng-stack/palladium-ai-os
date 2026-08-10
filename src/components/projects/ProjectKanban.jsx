import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { PROJECTS, STATUS_STYLE, catIcon, catGrad } from './projectsData';
import { Avatar, Progress } from './shared';

const COLUMNS = ['planning', 'building', 'testing', 'review', 'live'];

export default function ProjectKanban({ onOpen }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      {COLUMNS.map((col, ci) => {
        const items = PROJECTS.filter(p => p.status === col);
        const s = STATUS_STYLE[col];
        return (
          <motion.div
            key={col}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: ci * 0.05 }}
            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-3"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                <span className="text-xs font-semibold text-white">{s.label}</span>
              </div>
              <span className="rounded-md bg-white/5 px-1.5 text-[11px] text-zinc-400">{items.length}</span>
            </div>
            {items.map(p => {
              const Icon = catIcon(p.category);
              return (
                <button key={p.id} onClick={() => onOpen(p)} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[.04] p-3 text-left hover:border-violet-400/30 hover:bg-white/[.07]">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${catGrad(p.category)}`}><Icon className="h-3.5 w-3.5 text-white" /></span>
                    <span className="text-xs font-semibold text-white">{p.name}</span>
                  </div>
                  <p className="line-clamp-2 text-[11px] text-zinc-500">{p.description}</p>
                  <Progress value={p.progress} grad={catGrad(p.category)} />
                  <div className="flex items-center justify-between">
                    <Avatar initials={p.ownerAvatar} grad={p.ownerGrad} />
                    <span className="text-[10px] text-zinc-600">{p.updated}</span>
                  </div>
                </button>
              );
            })}
            <button className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 py-2 text-[11px] text-zinc-500 hover:text-zinc-300">
              <Plus className="h-3 w-3" /> Add card
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
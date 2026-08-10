import { motion } from 'framer-motion';
import { PROJECTS, catIcon, catGrad, STATUS_STYLE } from './projectsData';
import { StatusBadge, Progress } from './shared';

export default function ProjectTimeline({ onOpen }) {
  const items = [...PROJECTS].slice(0, 8);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="relative">
        <div className="absolute left-0 right-0 top-4 h-px bg-gradient-to-r from-violet-500/40 via-white/10 to-transparent" />
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {items.map((p, i) => {
            const Icon = catIcon(p.category);
            const s = STATUS_STYLE[p.status];
            return (
              <motion.button
                key={p.id}
                onClick={() => onOpen(p)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span className={`relative z-10 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${catGrad(p.category)} ring-4 ring-black/40`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                <p className="text-[11px] font-semibold text-white">{p.name}</p>
                <StatusBadge status={p.status} />
                <Progress value={p.progress} grad={catGrad(p.category)} />
                <p className="text-[10px] text-zinc-600">{p.updated}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { VERSION_HISTORY } from './projectsData';
import { SectionHead } from './shared';

export default function ProjectsVersionHistory() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={History} title="Version History" count={VERSION_HISTORY.length} grad="from-indigo-500 to-violet-500" />
      <div className="relative space-y-4 pl-4">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-violet-500/40 via-white/10 to-transparent" />
        {VERSION_HISTORY.map((v, i) => (
          <motion.div key={v.version} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
            <span className={`absolute -left-4 top-1 grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br ${v.grad} ring-4 ring-black/50`}>
              <v.icon className="h-2.5 w-2.5 text-white" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">{v.version}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 bg-gradient-to-r ${v.grad} text-white ring-white/10`}>{v.label}</span>
              <span className="text-[11px] text-zinc-500">{v.time}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{v.desc}</p>
            <p className="text-[10px] text-zinc-600">by {v.who}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
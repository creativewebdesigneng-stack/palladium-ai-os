import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { FILE_ACTIVITY } from './filesData';
import { SectionHead } from './shared';

export default function FileActivity() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Activity} title="File Activity" count={FILE_ACTIVITY.length} grad="from-cyan-500 to-sky-500" />
      <div className="relative space-y-3 pl-4">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-cyan-500/40 via-white/10 to-transparent" />
        {FILE_ACTIVITY.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative flex items-start gap-3">
            <span className={`absolute -left-4 top-1 grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br ${a.grad} ring-4 ring-black/80`}>
              <a.icon className="h-2.5 w-2.5 text-white" />
            </span>
            <div className="flex-1">
              <p className="text-xs text-zinc-300">
                <span className="font-medium text-white">{a.who}</span> {a.what}{' '}
                <span className="font-medium text-violet-400">{a.target}</span>
              </p>
              <p className="text-[10px] text-zinc-600">{a.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
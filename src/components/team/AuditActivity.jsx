import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { AUDIT } from './teamData';
import { SectionHead } from './shared';

export default function AuditActivity() {
  return (
    <div>
      <SectionHead icon={History} title="Audit Activity" grad="from-zinc-500 to-slate-600" count={AUDIT.length} />
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <div className="relative space-y-0.5 pl-6">
          <span className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-violet-400/40 via-white/10 to-transparent" />
          {AUDIT.map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="relative flex items-start gap-3 py-2.5">
              <span className={`absolute -left-5 top-3.5 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br ${a.grad} ring-4 ring-[#0b0c12]`}><a.icon className="h-3 w-3 text-white" /></span>
              <div className="flex-1">
                <p className="text-xs text-zinc-300">
                  <span className="font-medium text-white">{a.who}</span> {a.action} <span className="text-violet-300">{a.target}</span>
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-600">{a.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
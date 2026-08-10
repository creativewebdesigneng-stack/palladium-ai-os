import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { AUTH_METHODS } from './securityData';
import { SectionHead, StatusPill } from './shared';

export default function Authentication() {
  return (
    <div>
      <SectionHead icon={Lock} title="Authentication" grad="from-violet-500 to-indigo-500" count={`${AUTH_METHODS.length} methods`} />
      <div className="grid gap-3 sm:grid-cols-2">
        {AUTH_METHODS.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${m.grad} shadow-lg`}><m.icon className="h-5 w-5 text-white" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{m.name}</p>
                <StatusPill status={m.status} />
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">{m.desc}</p>
              <div className="mt-2.5 flex gap-1.5">
                {m.actions.map(a => (
                  <button key={a} className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${a === 'Disable' ? 'border border-red-400/20 text-red-300 hover:bg-red-500/10' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>{a}</button>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
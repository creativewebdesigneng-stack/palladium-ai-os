import { motion } from 'framer-motion';
import { ShieldCheck, Eye } from 'lucide-react';
import { PRIVACY } from './securityData';
import { SectionHead } from './shared';

export default function PrivacyPanel() {
  return (
    <div>
      <SectionHead icon={ShieldCheck} title="Privacy" grad="from-fuchsia-500 to-purple-500" count={`${PRIVACY.length} controls`} />
      <div className="grid gap-3 sm:grid-cols-2">
        {PRIVACY.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex items-start gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${p.grad}`}><p.icon className="h-4.5 w-4.5 text-white" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${p.enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-500/10 text-zinc-400'}`}>{p.value}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">{p.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/5"><Eye className="h-3 w-3" />Configure</button>
                  <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${p.enabled ? 'bg-emerald-500/40' : 'bg-white/10'}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition ${p.enabled ? 'translate-x-4' : ''}`} />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
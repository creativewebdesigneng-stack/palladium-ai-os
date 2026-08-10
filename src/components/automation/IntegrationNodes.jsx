import { motion } from 'framer-motion';
import { Plug } from 'lucide-react';
import { INTEGRATIONS, STATUS_STYLE } from './automationData';

export default function IntegrationNodes() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <Plug className="h-4 w-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-white">Integrations</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{INTEGRATIONS.filter(i => i.status === 'connected').length}/{INTEGRATIONS.length} connected</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {INTEGRATIONS.map((it, i) => {
          const st = STATUS_STYLE[it.status];
          return (
            <motion.div
              key={it.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              whileHover={{ y: -3 }}
              draggable
              className="group cursor-grab rounded-xl border border-white/10 bg-black/20 p-3 text-center hover:border-indigo-400/30 active:cursor-grabbing"
            >
              <div className="relative mx-auto h-10 w-10">
                <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${it.grad} text-white shadow-lg`}>
                  <it.icon className="h-5 w-5" />
                </span>
                {it.status === 'connected' && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0c0d13]" />}
              </div>
              <p className="mt-2 truncate text-[11px] font-medium text-white">{it.name}</p>
              <p className={`mt-0.5 text-[9px] ${st.text}`}>{st.label}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
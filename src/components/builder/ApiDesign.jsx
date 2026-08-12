import { motion } from 'framer-motion';
import { Server } from 'lucide-react';
import { API_GROUPS, METHOD_STYLE } from './builderData';

export default function ApiDesign() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Server className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">API Design</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{API_GROUPS.length} groups</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {API_GROUPS.map((g, i) => (
          <motion.div key={g.group} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <div className={`flex items-center gap-1.5 bg-gradient-to-r ${g.grad} px-3 py-1.5`}>
              <span className="text-xs font-semibold text-white">{g.group}</span>
              <span className="ml-auto text-[10px] text-white/70">{g.endpoints.length}</span>
            </div>
            <div className="divide-y divide-white/5">
              {g.endpoints.map(([method, path]) => (
                <div key={`${method} ${path}`} className="flex items-center gap-2 px-3 py-1.5">

                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${METHOD_STYLE[method]}`}>{method}</span>
                  <span className="truncate font-mono text-[11px] text-zinc-300">{path}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
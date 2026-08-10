import { motion } from 'framer-motion';
import { Plug, Settings2, Trash2, MoreHorizontal } from 'lucide-react';
import { ALL_INTEGRATIONS } from './integrationsData';
import { StatusBadge, SectionHead, Avatar } from './shared';

export default function ConnectedIntegrations({ onOpen }) {
  const connected = ALL_INTEGRATIONS.filter(i => i.status === 'connected' || i.status === 'attention');
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Plug} title="Connected Integrations" count={connected.length} grad="from-emerald-500 to-teal-500" />
      <div className="space-y-2">
        {connected.map((it, i) => (
          <motion.div key={it.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.25) }}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 hover:bg-white/5">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${it.grad} shadow-lg`}><it.icon className="h-5 w-5 text-white" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-white">{it.name}</p><StatusBadge status={it.status} /></div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
                <span>Connected {it.connectedDate}</span>
                <span>· Last used {it.lastUsed}</span>
                {it.metrics?.requests > 0 && <span>· {it.metrics.requests > 999 ? `${(it.metrics.requests/1000).toFixed(1)}K` : it.metrics.requests} requests</span>}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex -space-x-2">
                {['MA','DA','OA'].slice(0, Math.max(1, (it.id.length % 3) + 1)).map((a, j) => <Avatar key={j} initials={a} grad={it.grad} />)}
              </div>
              <span className="text-[10px] text-zinc-600">{(it.id.length % 4) + 1} agents</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onOpen(it)} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><Settings2 className="h-3.5 w-3.5" />Manage</button>
              <button className="grid h-8 w-8 place-items-center rounded-lg border border-red-400/20 text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
              <button className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><MoreHorizontal className="h-3.5 w-3.5" /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
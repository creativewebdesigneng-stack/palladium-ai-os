import { motion } from 'framer-motion';
import { Plus, Settings2, ArrowUpRight } from 'lucide-react';
import { StatusBadge, CapChips } from './shared';

export default function IntegrationCard({ item, onOpen, featured }) {
  const connected = item.status === 'connected';
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
      className={`group rounded-2xl border border-white/10 bg-white/[.035] p-4 hover:border-violet-400/30 ${featured ? 'bg-gradient-to-br from-white/[.05] to-transparent' : ''}`}>
      <div className="mb-3 flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${item.grad} shadow-lg`}><item.icon className="h-5 w-5 text-white" /></span>
        <StatusBadge status={item.status} />
      </div>
      <h4 className="text-sm font-semibold text-white">{item.name}</h4>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{item.desc}</p>
      {item.models?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.models.slice(0, 3).map(m => <span key={m} className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-300">{m}</span>)}
          {item.models.length > 3 && <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-500">+{item.models.length - 3}</span>}
        </div>
      )}
      {item.capabilities?.length > 0 && <div className="mt-2"><CapChips caps={item.capabilities} max={featured ? 5 : 3} /></div>}
      {connected && item.metrics?.requests > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1 text-center">
          <div className="rounded-lg bg-white/5 py-1"><p className="text-[9px] text-zinc-600">Requests</p><p className="text-[11px] font-semibold text-white">{item.metrics.requests > 999 ? `${(item.metrics.requests/1000).toFixed(1)}K` : item.metrics.requests}</p></div>
          <div className="rounded-lg bg-white/5 py-1"><p className="text-[9px] text-zinc-600">Success</p><p className="text-[11px] font-semibold text-emerald-400">{item.metrics.success}%</p></div>
          <div className="rounded-lg bg-white/5 py-1"><p className="text-[9px] text-zinc-600">Latency</p><p className="text-[11px] font-semibold text-white">{item.metrics.latency}ms</p></div>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {connected ? (
          <button onClick={() => onOpen(item)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"><Settings2 className="h-3.5 w-3.5" />Manage</button>
        ) : (
          <button onClick={() => onOpen(item)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-1.5 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Connect</button>
        )}
        <button onClick={() => onOpen(item)} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"><ArrowUpRight className="h-3.5 w-3.5" /></button>
      </div>
    </motion.div>
  );
}
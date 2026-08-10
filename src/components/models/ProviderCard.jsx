import { motion } from 'framer-motion';
import { Settings, Eye, Unplug, Star } from 'lucide-react';

export default function ProviderCard({ provider, onManage }) {
  const on = provider.connected;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl transition hover:border-white/20"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${provider.grad} text-sm font-bold text-white shadow-lg`}>{provider.logo}</span>
          <div>
            <h3 className="text-sm font-semibold text-white">{provider.name}</h3>
            <p className="text-xs text-zinc-500">{provider.models} models</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${on ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/5 text-zinc-500'}`}>
          {on ? '● Connected' : 'Not connected'}
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Speed" value={provider.speed} />
        <Stat label="Cost" value={provider.cost} />
        <Stat label="Synced" value={on ? provider.lastSync : '—'} />
      </div>

      <div className="relative mt-4 flex gap-2">
        <button onClick={() => onManage && onManage(provider)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10">
          <Settings className="h-3.5 w-3.5" />Manage
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10">
          <Eye className="h-3.5 w-3.5" />Models
        </button>
        <button className={`rounded-xl px-2.5 py-2 ${on ? 'text-rose-400 hover:bg-rose-500/10' : 'text-violet-400 hover:bg-violet-500/10'}`}>
          {on ? <Unplug className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
        </button>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 py-2">
      <p className="text-xs font-medium text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
    </div>
  );
}
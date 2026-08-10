import { motion } from 'framer-motion';
import { RefreshCw, Link2 } from 'lucide-react';
import { CONNECTED_STORAGE, STORAGE_STATUS } from './filesData';
import { SectionHead } from './shared';

export default function ConnectedStorage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Link2} title="Connected Storage" count={CONNECTED_STORAGE.length} grad="from-emerald-500 to-teal-500" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CONNECTED_STORAGE.map((s, i) => {
          const st = STORAGE_STATUS[s.status] || STORAGE_STATUS.available;
          return (
            <motion.div key={s.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.25) }} whileHover={{ y: -2 }}
              className="rounded-xl border border-white/10 bg-black/20 p-3.5 hover:border-emerald-400/30">
              <div className="mb-2.5 flex items-center justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${s.grad} shadow-lg`}><s.icon className="h-4.5 w-4.5 text-white" /></span>
                <span className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] ${st.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span>
              </div>
              <p className="text-xs font-semibold text-white">{s.name}</p>
              <div className="mt-2 space-y-1 text-[10px] text-zinc-500">
                <div className="flex justify-between"><span>Used</span><span className="text-zinc-300">{s.used}</span></div>
                <div className="flex justify-between"><span>Files Synced</span><span className="text-zinc-300">{s.synced.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Last Sync</span><span className="text-zinc-400">{s.lastSync}</span></div>
              </div>
              <button className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs ${s.status === 'connected' ? 'border border-white/10 text-zinc-300 hover:bg-white/5' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {s.status === 'connected' ? <><RefreshCw className={`h-3 w-3 ${s.syncing ? 'animate-spin' : ''}`} />{s.syncing ? 'Syncing...' : 'Sync Now'}</> : <><Link2 className="h-3 w-3" />Connect</>}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
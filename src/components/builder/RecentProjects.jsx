import { motion } from 'framer-motion';
import { Copy, Trash2, ExternalLink, Clock } from 'lucide-react';
import { RECENT_PROJECTS, PROJECT_STATUS_STYLE } from './builderData';

export default function RecentProjects() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RECENT_PROJECTS.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -3 }} className="group overflow-hidden rounded-xl border border-white/10 bg-black/20 hover:border-white/20">
            <div className={`relative h-20 bg-gradient-to-br ${p.grad}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.2),transparent_60%)]" />
              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{p.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${PROJECT_STATUS_STYLE[p.status]}`}>{p.status}</span>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-500"><span>{p.stage}</span><span>{p.lastEdited}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${p.progress}%` }} /></div>
              <div className="mt-3 flex gap-1.5">
                <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-[11px] text-zinc-200 hover:bg-white/10"><ExternalLink className="h-3 w-3" />Open</button>
                <button className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /></button>
                <button className="rounded-lg border border-white/10 p-1.5 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
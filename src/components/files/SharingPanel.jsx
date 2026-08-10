import { motion } from 'framer-motion';
import { Share2, UserPlus, Shield } from 'lucide-react';
import { SHARING } from './filesData';
import { SectionHead, Progress } from './shared';

export default function SharingPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Share2} title="Sharing & Permissions" grad="from-fuchsia-500 to-pink-500" />

      {/* Access Levels */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {SHARING.levels.map(l => (
          <div key={l.level} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${l.grad}`}><l.icon className="h-4 w-4 text-white" /></span>
              <span className="text-sm font-semibold text-white">{l.level}</span>
            </div>
            <p className="text-[10px] text-zinc-500">{l.desc}</p>
            <p className="mt-1.5 text-lg font-bold tabular-nums text-white">{l.count.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Team Access */}
      <h4 className="mb-2 text-xs font-semibold text-white">Team Access</h4>
      <div className="mb-4 space-y-2">
        {SHARING.teamAccess.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[.02] p-2">
            <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${t.grad} text-[10px] font-semibold text-white`}>{t.avatar}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">{t.name}</p>
              <p className="text-[10px] text-zinc-500">{t.role}</p>
            </div>
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">{t.access}</span>
          </motion.div>
        ))}
      </div>

      {/* Permission Levels */}
      <h4 className="mb-2 text-xs font-semibold text-white">Permission Levels</h4>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {SHARING.permissions.map((p, i) => (
          <motion.div key={p.level} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
            <span className={`mb-1.5 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${p.grad}`}><p.icon className="h-3.5 w-3.5 text-white" /></span>
            <p className="text-xs font-semibold text-white">{p.level}</p>
            <p className="text-[10px] text-zinc-500">{p.desc}</p>
          </motion.div>
        ))}
      </div>

      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 py-2.5 text-sm font-medium text-violet-300 hover:bg-violet-500/20">
        <UserPlus className="h-4 w-4" />Invite Members
      </button>
    </div>
  );
}
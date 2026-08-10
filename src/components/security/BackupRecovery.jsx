import { motion } from 'framer-motion';
import { Database, CheckCircle2, Download, Save } from 'lucide-react';
import { BACKUP } from './securityData';
import { SectionHead } from './shared';

export default function BackupRecovery() {
  const b = BACKUP;
  return (
    <div>
      <SectionHead icon={Database} title="Backup & Recovery" grad="from-emerald-500 to-teal-500" action={
        <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white"><Save className="h-3.5 w-3.5" />Backup now</button>
      } />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Status */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500"><CheckCircle2 className="h-5 w-5 text-white" /></span>
            <div>
              <p className="text-sm font-semibold text-white">Backup {b.status}</p>
              <p className="text-[11px] text-zinc-500">Last backup: {b.lastBackup}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/5 bg-white/[.02] p-3"><p className="text-[10px] uppercase text-zinc-500">Size</p><p className="mt-1 text-sm font-semibold text-white">{b.size}</p></div>
            <div className="rounded-xl border border-white/5 bg-white/[.02] p-3"><p className="text-[10px] uppercase text-zinc-500">Frequency</p><p className="mt-1 text-sm font-semibold text-white">{b.frequency}</p></div>
            <div className="col-span-2 rounded-xl border border-white/5 bg-white/[.02] p-3"><p className="text-[10px] uppercase text-zinc-500">Storage</p><p className="mt-1 text-sm font-semibold text-white">{b.storage}</p></div>
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs text-zinc-300 hover:bg-white/5"><Download className="h-3.5 w-3.5" />Export data</button>
        </motion.div>

        {/* Recovery options */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <p className="mb-3 text-xs font-semibold text-white">Recovery Options</p>
          <div className="space-y-2">
            {b.options.map(o => (
              <div key={o.name} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.02] p-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${o.grad}`}><o.icon className="h-4.5 w-4.5 text-white" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{o.name}</p>
                  <p className="text-[11px] text-zinc-500">{o.desc}</p>
                </div>
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Restore</button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
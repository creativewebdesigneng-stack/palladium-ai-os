import { motion } from 'framer-motion';
import { Database, Info } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { BACKUP_FACTS } from './securityData';
import { SectionHead } from './shared';

// Backups are managed by the platform database provider. Nothing here invents
// snapshot sizes or timestamps the app cannot observe.
export default function BackupRecovery() {
  return (
    <div>
      <SectionHead icon={Database} title="Backup & Recovery" grad="from-emerald-500 to-teal-500" />
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/[.05] p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
        <p className="text-[12px] leading-relaxed text-zinc-300">
          Database backups are handled by the managed cloud platform and are not user-initiated. To keep your own copy of
          workspace data, use the Developer API to export agents, tasks, memories and audit records.{' '}
          <Link to="/developer-portal" className="text-sky-300 underline decoration-sky-400/40">
            Open the Developer Portal
          </Link>
          .
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {BACKUP_FACTS.map((b, i) => (
          <motion.div
            key={b.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[.025] p-4"
          >
            <span className={`mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${b.grad}`}>
              <b.icon className="h-4 w-4 text-white" />
            </span>
            <p className="text-sm font-semibold text-white">{b.name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{b.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

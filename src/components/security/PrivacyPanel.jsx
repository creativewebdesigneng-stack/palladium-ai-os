import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { PRIVACY } from './securityData';
import { SectionHead } from './shared';

// Privacy behaviour is enforced server-side (RLS, redaction, metadata-only
// logging). This panel documents it rather than pretending to toggle it.
export default function PrivacyPanel() {
  return (
    <div>
      <SectionHead
        icon={ShieldCheck}
        title="Privacy"
        grad="from-fuchsia-500 to-purple-500"
        count={`${PRIVACY.length} controls`}
        action={
          <Link
            to="/memory"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
          >
            Manage stored data <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {PRIVACY.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-white/10 bg-white/[.025] p-4"
          >
            <div className="flex items-start gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${p.grad}`}>
                <p.icon className="h-4 w-4 text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">{p.value}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{p.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

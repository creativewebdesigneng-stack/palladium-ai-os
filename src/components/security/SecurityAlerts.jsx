import { motion } from 'framer-motion';
import { Bell, Check, X } from 'lucide-react';
import { ALERTS } from './securityData';
import { SectionHead, SeverityBadge } from './shared';

export default function SecurityAlerts() {
  return (
    <div>
      <SectionHead icon={Bell} title="Security Alerts" grad="from-rose-500 to-red-500" count={ALERTS.length} />
      <motion.div layout className="space-y-2">
        {ALERTS.map((a, i) => (
          <motion.div key={a.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3.5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${a.grad}`}><a.icon className="h-4.5 w-4.5 text-white" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{a.title}</p>
                <SeverityBadge severity={a.severity} />
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">{a.detail}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{a.time}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button title="Dismiss" className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><Check className="h-3.5 w-3.5" /></button>
              <button title="Remove" className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-red-400 hover:bg-white/5"><X className="h-3.5 w-3.5" /></button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
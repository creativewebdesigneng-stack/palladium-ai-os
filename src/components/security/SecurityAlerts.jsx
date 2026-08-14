import { motion } from 'framer-motion';
import { Bell, CheckCircle2 } from 'lucide-react';
import { kindStyle } from './securityData';
import { SectionHead, SeverityBadge } from './shared';
import { timeAgo } from './format';

// Alerts are facts derived server-side from denied actions, failing webhooks,
// expiring keys and integrations that lost access.
export default function SecurityAlerts({ alerts = [], query = '' }) {
  const q = query.trim().toLowerCase();
  const list = q ? alerts.filter((a) => `${a.title} ${a.detail}`.toLowerCase().includes(q)) : alerts;

  return (
    <div>
      <SectionHead icon={Bell} title="Security Alerts" grad="from-rose-500 to-red-500" count={list.length} />
      {list.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.05] p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <p className="text-xs text-zinc-300">No security alerts. Denied actions, failing webhooks and expiring credentials appear here.</p>
        </div>
      ) : (
        <motion.div layout className="space-y-2">
          {list.map((a, i) => {
            const style = kindStyle(a.kind);
            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3.5"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${style.grad}`}>
                  <style.icon className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{a.title}</p>
                    <SeverityBadge severity={a.severity} />
                  </div>
                  <p className="mt-0.5 break-words text-[11px] text-zinc-500">{a.detail}</p>
                  <p className="mt-1 text-[10px] text-zinc-600">{timeAgo(a.at)}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

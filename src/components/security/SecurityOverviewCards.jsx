import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { METRIC_STYLE } from './securityData';

// Live posture metrics. Every value is computed server-side from the caller's
// own keys, integrations, webhooks and audit trail.
export default function SecurityOverviewCards({ metrics = [], loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-white/10 bg-white/[.035]" />
        ))}
      </div>
    );
  }

  if (!metrics.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      {metrics.map((m, i) => {
        const style = METRIC_STYLE[m.key] || { icon: ShieldCheck, grad: 'from-zinc-500 to-zinc-600' };
        const detail = String(m.detail || '').toLowerCase();
        const warn = /expir|critical|need|denied|work/.test(detail) && !/0 /.test(detail);
        const good = /good|healthy|all reviewed|two factors|verified/.test(detail);
        return (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.25) }}
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <span className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${style.grad} shadow-lg`}>
                <style.icon className="h-4 w-4 text-white" />
              </span>
              <span className={`text-[10px] font-medium ${warn ? 'text-amber-400' : good ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {m.detail}
              </span>
            </div>
            <p className="text-xl font-semibold tabular-nums text-white">{m.value}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-zinc-500">{m.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

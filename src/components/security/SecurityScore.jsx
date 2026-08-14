import { motion } from 'framer-motion';
import { ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { SCORE_STYLE } from './securityData';
import { SectionHead } from './shared';
import { timeAgo } from './format';

function Ring({ value }) {
  const r = 52,
    c = 2 * Math.PI * r,
    off = c - (value / 100) * c;
  return (
    <svg viewBox="0 0 130 130" className="h-44 w-44 -rotate-90">
      <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
      <motion.circle
        cx="65"
        cy="65"
        r={r}
        fill="none"
        stroke="url(#sg)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: off }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// The score is derived on the server from real posture signals; "Run check"
// simply re-reads it.
export default function SecurityScore({ score, generatedAt, onRefresh, refreshing }) {
  const total = score?.total ?? 0;
  const breakdown = score?.breakdown ?? [];
  const band = total >= 85 ? 'Good' : total >= 70 ? 'Fair' : 'Needs work';

  return (
    <div>
      <SectionHead
        icon={ShieldCheck}
        title="Security Score"
        grad="from-emerald-500 to-teal-500"
        action={
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Run check
          </button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[.025] p-6 text-center">
          <div className="relative grid place-items-center">
            <Ring value={total} />
            <div className="absolute text-center">
              <p className="text-4xl font-bold text-white">{total}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{band}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-400">Overall security posture</p>
          <p className="mt-1 text-[10px] text-zinc-500">Checked {timeAgo(generatedAt)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {breakdown.map((s, i) => {
              const style = SCORE_STYLE[s.key] || { icon: ShieldCheck, grad: 'from-zinc-500 to-zinc-600' };
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-white/5 bg-white/[.02] p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${style.grad}`}>
                      <style.icon className="h-3.5 w-3.5 text-white" />
                    </span>
                    <p className="flex-1 text-xs font-medium text-white">{s.label}</p>
                    <p className="text-sm font-semibold tabular-nums text-white">{s.value}</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${style.grad}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-zinc-500">{s.note}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

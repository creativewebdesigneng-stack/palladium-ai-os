import { motion } from 'framer-motion';
import { Lightbulb, ArrowRight, CheckCircle2 } from 'lucide-react';
import { kindStyle } from './securityData';
import { SectionHead } from './shared';

const impactMap = {
  High: 'bg-red-500/10 text-red-300',
  Medium: 'bg-amber-500/10 text-amber-300',
  Low: 'bg-sky-500/10 text-sky-300',
};

// Recommendations are derived from live posture signals — when nothing is
// wrong, nothing is invented.
export default function SecurityRecommendations({ items = [], onNavigate }) {
  return (
    <div>
      <SectionHead icon={Lightbulb} title="Security Recommendations" grad="from-violet-500 to-fuchsia-500" count={items.length} />
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.05] p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <p className="text-xs text-zinc-300">No outstanding actions — your account, keys and connections all look healthy.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((r, i) => {
            const style = kindStyle(r.kind);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3.5"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${style.grad}`}>
                  <style.icon className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{r.title}</p>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${impactMap[r.impact] || impactMap.Low}`}>{r.impact}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">{r.detail}</p>
                  <div className="mt-2.5">
                    <button
                      onClick={() => onNavigate?.(r)}
                      className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white"
                    >
                      {r.action}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

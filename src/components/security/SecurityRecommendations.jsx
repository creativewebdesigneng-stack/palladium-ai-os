import { motion } from 'framer-motion';
import { Lightbulb, ArrowRight, Check } from 'lucide-react';
import { RECOMMENDATIONS } from './securityData';
import { SectionHead } from './shared';

const impactMap = {
  High: 'bg-red-500/10 text-red-300',
  Medium: 'bg-amber-500/10 text-amber-300',
  Low: 'bg-sky-500/10 text-sky-300',
};

export default function SecurityRecommendations() {
  return (
    <div>
      <SectionHead icon={Lightbulb} title="Security Recommendations" grad="from-violet-500 to-fuchsia-500" count={RECOMMENDATIONS.length} />
      <div className="grid gap-3 sm:grid-cols-2">
        {RECOMMENDATIONS.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3.5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${r.grad}`}><r.icon className="h-4.5 w-4.5 text-white" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{r.title}</p>
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${impactMap[r.impact]}`}>{r.impact}</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">{r.detail}</p>
              <div className="mt-2.5 flex gap-1.5">
                <button className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white">{r.action}<ArrowRight className="h-3 w-3" /></button>
                <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-white/5"><Check className="h-3 w-3" />Dismiss</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
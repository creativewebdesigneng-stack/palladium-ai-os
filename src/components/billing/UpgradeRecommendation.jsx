import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { RECOMMENDATION, PLANS } from './billingData';

export default function UpgradeRecommendation({ onUpgrade }) {
  const suggested = PLANS.find((p) => p.id === RECOMMENDATION.suggestedPlan);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-orange-500/[.06] to-transparent p-5">
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
            <Lightbulb className="h-5 w-5 text-white" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">AI Recommendation</h3>
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{RECOMMENDATION.confidence} confidence</span>
            </div>
            <p className="mt-1 text-sm font-medium text-amber-200">{RECOMMENDATION.title}</p>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-zinc-400">{RECOMMENDATION.body}</p>
          </div>
        </div>
        <button onClick={onUpgrade}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-900/20 hover:opacity-90">
          <Sparkles className="h-4 w-4" /> Upgrade to {suggested.name} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
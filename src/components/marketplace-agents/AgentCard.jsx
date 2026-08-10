import { motion } from 'framer-motion';
import { Download, Play, ArrowUpRight } from 'lucide-react';
import { Avatar, RatingStars, PriceBadge, VerifiedBadge, Flag, BADGE_GRADS } from './shared';

export default function AgentCard({ agent, onOpen, onInstall }) {
  return (
    <motion.button layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      onClick={() => onOpen(agent)}
      className="group flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-violet-400/30 hover:bg-white/[.05]">
      <div className="flex items-start gap-3">
        <Avatar grad={agent.grad} initials={agent.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-white">{agent.name}</h3>
          </div>
          <p className="truncate text-[11px] text-zinc-500">by {agent.creator.name}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-zinc-600 transition group-hover:text-violet-300" />
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">{agent.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {agent.capabilities.slice(0, 3).map((c) => <span key={c} className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] text-zinc-300">{c}</span>)}
        {agent.capabilities.length > 3 && <span className="rounded-lg border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">+{agent.capabilities.length - 3}</span>}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Flag show={agent.isNew} label="New" grad={BADGE_GRADS.new} />
        <Flag show={agent.isPopular} label="Popular" grad={BADGE_GRADS.popular} />
        <Flag show={agent.isEnterprise} label="Enterprise" grad={BADGE_GRADS.enterprise} />
        <VerifiedBadge verified={agent.isVerified} />
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          <RatingStars rating={agent.rating} count={agent.reviewsCount} />
          <span className="text-[10px] text-zinc-600">{agent.runs} runs</span>
        </div>
        <PriceBadge price={agent.price} />
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); onInstall(agent); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90">
          <Download className="h-3.5 w-3.5" /> Install
        </button>
        <button onClick={(e) => { e.stopPropagation(); onOpen(agent); }} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
          <Play className="h-3.5 w-3.5" /> Try
        </button>
      </div>
    </motion.button>
  );
}
import { motion } from 'framer-motion';
import { Star, BadgeCheck, ThumbsUp, Flag } from 'lucide-react';
import SectionHead from './SectionHead';
import { Avatar } from './shared';
import { REVIEWS } from './marketplaceData';

export default function ReviewsSection() {
  return (
    <div>
      <SectionHead icon={Star} title="Reviews" count={REVIEWS.length} grad="from-amber-500 to-orange-500" />
      <div className="space-y-3">
        {REVIEWS.map((r, i) => (
          <motion.article
            key={r.author}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className="rounded-2xl border border-white/10 bg-white/[.025] p-4"
          >
            <div className="flex items-start gap-3">
              <Avatar name={r.author} grad={r.avatarGrad} size="h-9 w-9 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">{r.author}</h4>
                  {r.verified && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                      <BadgeCheck className="h-3 w-3" />Verified Purchase
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-600">· {r.date}</span>
                </div>
                <div className="mt-1 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s < r.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
                  ))}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{r.comment}</p>
                <p className="mt-2 text-[11px] text-zinc-600">Reviewing: <span className="text-violet-400">{r.item}</span></p>
                <div className="mt-3 flex items-center gap-3">
                  <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-white/5">
                    <ThumbsUp className="h-3 w-3" />Helpful ({r.helpful})
                  </button>
                  <button className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] text-zinc-500 hover:text-rose-400">
                    <Flag className="h-3 w-3" />Report
                  </button>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
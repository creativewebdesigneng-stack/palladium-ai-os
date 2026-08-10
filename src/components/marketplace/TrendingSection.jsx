import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import SectionHead from './SectionHead';
import { Stars, DownloadCount, Avatar, CardActions, PriceButton } from './shared';
import { TRENDING } from './marketplaceData';

export default function TrendingSection() {
  return (
    <div>
      <SectionHead icon={TrendingUp} title="Trending Now" count={TRENDING.length} grad="from-emerald-500 to-teal-500" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TRENDING.map((t, i) => (
          <motion.article
            key={t.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            whileHover={{ y: -4 }}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] hover:border-violet-400/30"
          >
            <div className={`relative h-28 bg-gradient-to-br ${t.banner}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.15),transparent_60%)]" />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start gap-2.5">
                <Avatar name={t.creator} grad={t.avatarGrad} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-white">{t.title}</h3>
                  <p className="truncate text-[11px] text-zinc-500">by {t.creator}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{t.desc}</p>
              <div className="mt-3 flex items-center gap-3 text-[11px]">
                <Stars rating={t.rating} />
                <span className="text-zinc-600">({t.reviews})</span>
                <DownloadCount downloads={t.downloads} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <PriceButton price={t.price} />
                <CardActions />
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
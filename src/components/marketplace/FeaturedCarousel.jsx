import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, PriceButton } from './shared';
import { FEATURED } from './marketplaceData';

export default function FeaturedCarousel() {
  const [idx, setIdx] = useState(0);
  const item = FEATURED[idx];
  const Icon = item.icon;

  const go = d => setIdx(i => (i + d + FEATURED.length) % FEATURED.length);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-400/20 px-2.5 py-1 text-[11px] font-medium text-violet-300">Featured</span>
          <span className="text-xs text-zinc-500">{idx + 1} / {FEATURED.length}</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => go(-1)} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => go(1)} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.35 }}
          className={`relative grid gap-6 p-6 sm:grid-cols-[1.4fr_1fr]`}
        >
          <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${item.banner} p-6`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.12),transparent_60%)]" />
            <span className="absolute left-4 top-4 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">{item.tag}</span>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute bottom-6 right-6 grid h-16 w-16 place-items-center rounded-2xl bg-white/10 backdrop-blur-xl">
              <Icon className="h-8 w-8 text-white" />
            </motion.div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <Avatar name={item.creator} grad={item.avatarGrad} size="h-9 w-9 text-xs" />
              <div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-xs text-zinc-500">by {item.creator}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.desc}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1 text-amber-400"><Star className="h-3.5 w-3.5 fill-current" />{item.rating}</span>
              <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{item.downloads}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <PriceButton price={item.price} />
              <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">Details</button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 pb-4">
        {FEATURED.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-violet-400' : 'w-1.5 bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}
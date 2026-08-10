import { motion } from 'framer-motion';
import { LayoutGrid, Star, Download } from 'lucide-react';
import SectionHead from './SectionHead';
import { PriceButton } from './shared';
import { APPLICATIONS } from './marketplaceData';

export default function ApplicationsSection() {
  return (
    <div>
      <SectionHead icon={LayoutGrid} title="Applications" count={APPLICATIONS.length} grad="from-amber-500 to-orange-500" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {APPLICATIONS.map((a, i) => (
          <motion.article
            key={a.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            whileHover={{ y: -4 }}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] hover:border-violet-400/30"
          >
            <div className={`relative h-24 bg-gradient-to-br ${a.grad}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.15),transparent_60%)]" />
              <a.icon className="absolute inset-0 m-auto h-9 w-9 text-white/90" />
            </div>
            <div className="flex flex-1 flex-col p-3.5">
              <h3 className="text-sm font-semibold text-white">{a.name}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">{a.desc}</p>
              <div className="mt-2.5 flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1 text-amber-400"><Star className="h-3 w-3 fill-current" />{a.rating}</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" />{a.downloads}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <PriceButton price={a.price} />
                <button className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Preview</button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
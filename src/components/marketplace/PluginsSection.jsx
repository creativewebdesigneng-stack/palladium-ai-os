import { motion } from 'framer-motion';
import { Plug, Star, Download } from 'lucide-react';
import SectionHead from './SectionHead';
import { PriceButton } from './shared';
import { PLUGINS } from './marketplaceData';

export default function PluginsSection() {
  return (
    <div>
      <SectionHead icon={Plug} title="Plugins" count={PLUGINS.length} grad="from-violet-500 to-purple-500" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {PLUGINS.map((p, i) => (
          <motion.article
            key={p.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            whileHover={{ y: -3 }}
            className="group flex flex-col items-center rounded-2xl border border-white/10 bg-white/[.025] p-4 text-center hover:border-violet-400/30"
          >
            <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${p.grad} text-white shadow-lg`}>
              <p.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-white">{p.name}</h3>
            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">{p.desc}</p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-0.5 text-amber-400"><Star className="h-2.5 w-2.5 fill-current" />{p.rating}</span>
              <span className="flex items-center gap-0.5"><Download className="h-2.5 w-2.5" />{p.downloads}</span>
            </div>
            <PriceButton price={p.price} className="mt-3 w-full" />
          </motion.article>
        ))}
      </div>
    </div>
  );
}
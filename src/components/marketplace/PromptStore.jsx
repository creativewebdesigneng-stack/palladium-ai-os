import { motion } from 'framer-motion';
import { MessageSquare, Star, Download } from 'lucide-react';
import SectionHead from './SectionHead';
import { PriceButton } from './shared';
import { PROMPT_PACKS } from './marketplaceData';

export default function PromptStore() {
  return (
    <div>
      <SectionHead icon={MessageSquare} title="Prompt Store" count={PROMPT_PACKS.length} grad="from-cyan-500 to-sky-500" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {PROMPT_PACKS.map((p, i) => (
          <motion.article
            key={p.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            whileHover={{ y: -3 }}
            className="group flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-3.5 hover:border-violet-400/30"
          >
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${p.grad} text-white shadow-lg`}>
              <p.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">{p.name}</h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">{p.count} prompts</p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-0.5 text-amber-400"><Star className="h-2.5 w-2.5 fill-current" />{p.rating}</span>
              <span className="flex items-center gap-0.5"><Download className="h-2.5 w-2.5" />{p.downloads}</span>
            </div>
            <p className="mt-2 truncate text-[10px] text-zinc-600">by {p.creator}</p>
            <PriceButton price={p.price} className="mt-3 w-full" />
          </motion.article>
        ))}
      </div>
    </div>
  );
}
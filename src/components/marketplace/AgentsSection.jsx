import { motion } from 'framer-motion';
import { Bot, Cpu } from 'lucide-react';
import SectionHead from './SectionHead';
import { Stars, DownloadCount, Avatar, PriceButton } from './shared';
import { AI_AGENTS } from './marketplaceData';

export default function AgentsSection() {
  return (
    <div>
      <SectionHead icon={Bot} title="AI Agents" count={AI_AGENTS.length} grad="from-violet-500 to-indigo-500" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {AI_AGENTS.map((a, i) => (
          <motion.article
            key={a.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            whileHover={{ y: -4 }}
            className="group flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-violet-400/30"
          >
            <div className="flex items-center gap-2.5">
              <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${a.grad} text-white shadow-lg`}>
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-white">{a.name}</h3>
                <p className="truncate text-[11px] text-zinc-500">v{a.version}</p>
              </div>
            </div>
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{a.desc}</p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {a.capabilities.map(c => (
                <span key={c} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{c}</span>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
              <Cpu className="h-3 w-3" />{a.models}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px]">
              <Stars rating={a.rating} />
              <DownloadCount downloads={a.downloads} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Avatar name={a.creator} grad={a.grad} size="h-5 w-5 text-[8px]" />
                {a.creator}
              </div>
              <PriceButton price={a.price} />
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
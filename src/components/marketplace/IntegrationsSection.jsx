import { motion } from 'framer-motion';
import { Layers, BadgeCheck, BookOpen, Settings } from 'lucide-react';
import SectionHead from './SectionHead';
import { INTEGRATIONS, STATUS_STYLE } from './marketplaceData';

export default function IntegrationsSection() {
  return (
    <div>
      <SectionHead icon={Layers} title="Integrations" count={8} grad="from-orange-500 to-amber-500" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INTEGRATIONS.map((it, i) => (
          <motion.article
            key={it.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            whileHover={{ y: -3 }}
            className="flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-violet-400/30"
          >
            <div className="flex items-center gap-2.5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${it.grad} text-white shadow-lg`}>
                <it.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="truncate text-sm font-semibold text-white">{it.name}</h3>
                  {it.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                </div>
                <p className="truncate text-[11px] text-zinc-500">{it.desc}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-[11px] text-zinc-500">
              <div className="flex justify-between"><span>Popularity</span><span className="text-zinc-300">{it.popularity}</span></div>
              <div className="flex justify-between"><span>Compatibility</span><span className="text-zinc-300">{it.compat}</span></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLE[it.status]}`}>{it.status}</span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {it.status === 'Connected' ? (
                <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"><Settings className="h-3 w-3" />Configure</button>
              ) : (
                <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-white/15">Install</button>
              )}
              <button className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><BookOpen className="h-3.5 w-3.5" /></button>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
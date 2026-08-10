import { motion } from 'framer-motion';
import { Star, Download, ArrowRight } from 'lucide-react';

const listings = [
  ['Sales Intelligence Agent', 'Agent', '4.9', '12.4k', 'from-violet-600/40 to-cyan-400/10'],
  ['SaaS Analytics Kit', 'Template', '4.8', '8.7k', 'from-blue-600/30 to-fuchsia-500/20'],
  ['GitHub Release Copilot', 'Automation', '4.9', '6.1k', 'from-emerald-500/20 to-indigo-600/30'],
  ['Customer Voice Analyzer', 'Plugin', '4.7', '4.8k', 'from-amber-500/20 to-rose-500/20'],
];

export default function MarketplaceSection() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Marketplace</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Install agents, templates & integrations</h2>
        </div>
        <a href="#" className="hidden items-center gap-1 text-sm text-zinc-400 hover:text-white sm:flex">Browse all <ArrowRight className="h-4 w-4" /></a>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map(([name, type, rating, dl, grad], i) => (
          <motion.div key={name}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] transition hover:-translate-y-1 hover:border-violet-400/30">
            <div className={`h-28 bg-gradient-to-br ${grad} p-4`}><span className="rounded-full bg-black/30 px-2 py-1 text-[10px] backdrop-blur">{type}</span></div>
            <div className="p-4">
              <h3 className="text-sm font-medium text-white">{name}</h3>
              <p className="mt-0.5 text-[11px] text-zinc-500">by Palladium Labs</p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1 text-amber-400"><Star className="h-3 w-3 fill-current" />{rating}</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" />{dl}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
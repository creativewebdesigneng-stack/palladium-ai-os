import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const marketplaceSurfaces = [
  {
    name: 'Agent Marketplace',
    type: 'Agents',
    description: 'Discover reusable agent configurations published through Blackstar.',
    returnTo: '/agent-marketplace',
    gradient: 'from-violet-600/40 to-cyan-400/10',
  },
  {
    name: 'Template Library',
    type: 'Templates',
    description: 'Start from reusable workflow and project templates already available in the platform.',
    returnTo: '/templates',
    gradient: 'from-blue-600/30 to-fuchsia-500/20',
  },
  {
    name: 'Integration Hub',
    type: 'Integrations',
    description: 'Connect supported providers through Blackstar’s existing integration layer.',
    returnTo: '/integrations',
    gradient: 'from-emerald-500/20 to-indigo-600/30',
  },
  {
    name: 'Tool Marketplace',
    type: 'Tools',
    description: 'Browse tools exposed through the governed Blackstar tool marketplace.',
    returnTo: '/tool-marketplace',
    gradient: 'from-amber-500/20 to-rose-500/20',
  },
];

export default function MarketplaceSection() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Marketplace</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Explore real Blackstar marketplace surfaces</h2>
        </div>
        <Link
          to="/register?returnTo=/agent-marketplace"
          className="hidden items-center gap-1 text-sm text-zinc-400 hover:text-white sm:flex"
        >
          Browse agents <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {marketplaceSurfaces.map((surface, index) => (
          <motion.article
            key={surface.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.07 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] transition hover:-translate-y-1 hover:border-violet-400/30"
          >
            <div className={`h-28 bg-gradient-to-br ${surface.gradient} p-4`}>
              <span className="rounded-full bg-black/30 px-2 py-1 text-[10px] backdrop-blur">{surface.type}</span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium text-white">{surface.name}</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{surface.description}</p>
              <Link
                to={`/register?returnTo=${surface.returnTo}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-200 hover:text-white"
              >
                Open in Blackstar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { DEPLOYMENTS } from './projectsData';
import { SectionHead } from './shared';

export default function ProjectsDeployments() {
  return (
    <div>
      <SectionHead icon={RefreshCw} title="Deployments" count={DEPLOYMENTS.length} grad="from-emerald-500 to-teal-500" />
      <div className="grid gap-3 md:grid-cols-3">
        {DEPLOYMENTS.map((d, i) => (
          <motion.div
            key={d.env}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[.035] p-4"
          >
            <div className="flex items-center justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${d.grad}`}><d.icon className="h-4 w-4 text-white" /></span>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${d.status === 'healthy' ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20' : 'bg-amber-500/15 text-amber-300 ring-amber-400/20'}`}>
                {d.status === 'healthy' ? 'Healthy' : 'Warning'}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{d.label}</p>
            <p className="text-[11px] text-zinc-500">{d.version} · deployed {d.time}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-gradient-to-r ${d.grad}`} style={{ width: `${d.health}%` }} />
              </div>
              <span className="text-[11px] text-zinc-400">{d.health}%</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">
                View <ArrowRight className="h-3 w-3" />
              </button>
              <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">
                <RefreshCw className="h-3 w-3" /> Rollback
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
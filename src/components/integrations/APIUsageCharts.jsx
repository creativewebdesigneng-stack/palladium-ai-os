import { motion } from 'framer-motion';
import { BarChart3, Activity, Zap, Clock, Cpu, Bot, Workflow, XCircle } from 'lucide-react';
import { API_USAGE } from './integrationsData';
import { SectionHead } from './shared';

function MiniBar({ label, data, grad }) {
  const max = Math.max(...data);
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="mb-2 text-[10px] text-zinc-500">{label}</p>
      <div className="flex h-20 items-end gap-1">
        {data.map((v, i) => (
          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(v / max) * 100}%` }} transition={{ delay: i * 0.03 }}
            className={`flex-1 rounded-t bg-gradient-to-t ${grad}`} />
        ))}
      </div>
    </div>
  );
}

function HBarList({ items, icon: Icon }) {
  const max = Math.max(...items.map(i => i.value));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <motion.div key={it.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-2">
          <span className="w-28 truncate text-xs text-zinc-300">{it.name}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-lg bg-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(it.value / max) * 100}%` }} transition={{ delay: i * 0.04 + 0.2, duration: 0.5 }}
              className={`h-full rounded-lg bg-gradient-to-r ${it.grad}`} />
          </div>
          <span className="w-12 text-right text-[10px] tabular-nums text-zinc-400">{it.value > 999 ? `${(it.value/1000).toFixed(1)}K` : it.value}</span>
        </motion.div>
      ))}
    </div>
  );
}

export default function APIUsageCharts() {
  const u = API_USAGE;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={BarChart3} title="API Usage Analytics" grad="from-cyan-500 to-blue-500" />

      {/* Trend stats */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[['Requests Today', '48.2K', Activity, 'from-violet-500 to-indigo-500'], ['Successful', '47.9K', Zap, 'from-emerald-500 to-teal-500'], ['Failed', '142', XCircle, 'from-red-500 to-rose-500'], ['Avg Latency', '320ms', Clock, 'from-amber-500 to-orange-500']].map(([l, v, I, g], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-1 flex items-center gap-2"><span className={`grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br ${g}`}><I className="h-3 w-3 text-white" /></span></div>
            <p className="text-lg font-semibold text-white">{v}</p><p className="text-[10px] text-zinc-500">{l}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <MiniBar label="Requests (12h)" data={u.trend} grad="from-violet-600 to-indigo-500" />
        <MiniBar label="Successful (12h)" data={u.success} grad="from-emerald-600 to-teal-500" />
        <MiniBar label="Latency (ms)" data={u.latency} grad="from-amber-600 to-orange-500" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><Cpu className="h-3.5 w-3.5 text-violet-400" />By Integration</h4>
          <HBarList items={u.byIntegration} />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><Bot className="h-3.5 w-3.5 text-violet-400" />By Agent</h4>
          <HBarList items={u.byAgent} />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white"><Workflow className="h-3.5 w-3.5 text-violet-400" />By Workflow</h4>
          <HBarList items={u.byWorkflow} />
        </div>
      </div>
    </div>
  );
}
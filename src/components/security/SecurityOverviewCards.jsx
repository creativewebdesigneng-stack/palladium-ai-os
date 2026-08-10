import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { OVERVIEW } from './securityData';
import { Sparkline } from './shared';

export default function SecurityOverviewCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      {OVERVIEW.map((m, i) => {
        const numeric = !isNaN(parseFloat(m.value));
        const up = String(m.detail).toLowerCase().includes('good') || String(m.detail).toLowerCase().includes('passed');
        const warn = String(m.detail).toLowerCase().includes('expir') || String(m.detail).toLowerCase().includes('suspicious') || String(m.detail).toLowerCase().includes('critical');
        return (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.25) }} whileHover={{ y: -2 }}
            className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${m.grad} shadow-lg`}><m.icon className="h-4 w-4 text-white" /></span>
              <span className={`text-[10px] font-medium ${warn ? 'text-amber-400' : up ? 'text-emerald-400' : 'text-zinc-500'}`}>{m.detail}</span>
            </div>
            <p className="text-xl font-semibold tabular-nums text-white">{m.value}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-zinc-500">{m.label}</p>
            {numeric && <div className="mt-2"><Sparkline data={m.trend} grad={m.grad} className="h-6" /></div>}
          </motion.div>
        );
      })}
    </div>
  );
}
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import SectionHead from './SectionHead';
import { TOP_CHARTS } from './marketplaceData';

export default function TopCharts() {
  return (
    <div>
      <SectionHead icon={BarChart3} title="Top Charts" count={TOP_CHARTS.length} grad="from-blue-500 to-indigo-500" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOP_CHARTS.map((chart, i) => (
          <motion.div
            key={chart.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            className="rounded-2xl border border-white/10 bg-white/[.025] p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${chart.grad} text-white`}>
                <chart.icon className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-white">{chart.label}</h3>
            </div>
            <div className="space-y-1.5">
              {chart.items.map((item, idx) => (
                <div key={item} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/5">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold ${idx === 0 ? 'bg-amber-400/20 text-amber-400' : idx === 1 ? 'bg-zinc-400/20 text-zinc-300' : idx === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-white/5 text-zinc-500'}`}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
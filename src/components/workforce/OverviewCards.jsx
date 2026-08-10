import { motion } from 'framer-motion';

export default function OverviewCards({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div key={c.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex items-start justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${c.color} text-white shadow-lg`}><Icon className="h-5 w-5" /></span>
              <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/5 opacity-0 blur-2xl transition group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{c.value}</p>
            <p className="text-xs text-zinc-500">{c.label}</p>
            <p className="mt-1 text-[11px] text-zinc-600">{c.sub}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
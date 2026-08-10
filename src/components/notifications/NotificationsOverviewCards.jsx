import { motion } from 'framer-motion';
import { Bell, Star, AtSign, XCircle } from 'lucide-react';
import { OVERVIEW } from './notificationsData';

const ICONS = { Bell, Star, AtSign, XCircle };

export default function NotificationsOverviewCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {OVERVIEW.map((o, i) => {
        const Icon = ICONS[o.icon];
        return (
          <motion.div key={o.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${o.grad}`}><Icon className="h-4 w-4 text-white" /></span>
              <div>
                <p className="text-2xl font-semibold text-white">{o.value}</p>
                <p className="text-[11px] text-zinc-500">{o.label}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-zinc-600">{o.detail}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
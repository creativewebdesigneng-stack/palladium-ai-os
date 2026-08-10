import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { LIVE_ACTIVITY } from './builderData';

export default function BuilderLiveActivity() {
  const [items, setItems] = useState(LIVE_ACTIVITY.slice(0, 3));

  useEffect(() => {
    const id = setInterval(() => {
      setItems(prev => {
        const next = LIVE_ACTIVITY[(LIVE_ACTIVITY.indexOf(prev[0]) + 1) % LIVE_ACTIVITY.length];
        return [next, ...prev].slice(0, 6);
      });
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="h-2 w-2 rounded-full bg-emerald-400" />
        <Activity className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Live AI Activity</h2>
      </div>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((a, i) => (
            <motion.div
              key={a.text + i}
              initial={{ opacity: 0, x: -16, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-2.5"
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${a.grad} text-white`}><a.icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-zinc-200">{a.text}</p>
                <p className="text-[10px] text-zinc-600">{a.agent} · {a.time}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
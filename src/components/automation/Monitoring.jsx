import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { MONITORING } from './automationData';

function Bar({ data }) {
  const max = Math.max(...data);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full">
      {data.map((v, i) => {
        const h = (v / max) * 28;
        const x = (i / data.length) * 100;
        const w = 100 / data.length - 2;
        return <rect key={i} x={x} y={30 - h} width={w} height={h} rx={1} className="fill-violet-400/40" />;
      })}
    </svg>
  );
}

export default function Monitoring() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <Activity className="h-4 w-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-white">System Monitoring</h2>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-zinc-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {MONITORING.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.2) }}
            className="rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <div className="flex items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${m.grad} text-white`}>
                <m.icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-2 text-lg font-bold text-white">{m.value}<span className="ml-0.5 text-[10px] font-normal text-zinc-600">{m.unit}</span></p>
            <p className="text-[10px] text-zinc-500">{m.label}</p>
            <div className="mt-2"><Bar data={m.trend} /></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
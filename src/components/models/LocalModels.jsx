import { motion } from 'framer-motion';
import { Download, RefreshCw, Trash2, Server } from 'lucide-react';
import { LOCAL_RUNTIMES } from './modelsData';

export default function LocalModels() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Server className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Local Models</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{LOCAL_RUNTIMES.length} runtimes</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {LOCAL_RUNTIMES.map((r, i) => {
          const running = r.status === 'Running';
          return (
            <motion.div key={r.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${r.grad} text-white`}><r.icon className="h-4 w-4" /></span>
                  <div><p className="text-sm font-medium text-white">{r.name}</p><p className="text-[11px] text-zinc-500">{r.models} models installed</p></div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${running ? 'bg-emerald-400/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>{r.status}</span>
              </div>

              <div className="mt-3 space-y-2">
                <Bar label="Memory" value={r.memory} unit="GB" max={32} />
                <Bar label="GPU" value={r.gpu} unit="%" max={100} />
                <Bar label="CPU" value={r.cpu} unit="%" max={100} />
              </div>

              <div className="mt-3 flex gap-1.5">
                <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10"><Download className="h-3 w-3" />Download</button>
                <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10"><RefreshCw className="h-3 w-3" />Update</button>
                <button className="rounded-lg border border-white/10 p-1.5 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ label, value, unit, max }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-[11px]"><span className="text-zinc-500">{label}</span><span className="text-zinc-300">{value}{unit}</span></div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
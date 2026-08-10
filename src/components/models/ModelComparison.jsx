import { motion } from 'framer-motion';
import { X, GitCompare } from 'lucide-react';

const DIMS = [
  { key: 'speed', label: 'Speed', max: 5 },
  { key: 'reasoning', label: 'Reasoning', max: 5 },
  { key: 'coding', label: 'Coding', max: 5 },
  { key: 'quality', label: 'Creativity', max: 5 },
  { key: 'vision', label: 'Vision', max: 1, bool: true },
  { key: 'context', label: 'Context', max: 2000, raw: true },
  { key: 'priceOut', label: 'Cost', max: 80, raw: true, inv: true },
  { key: 'tools', label: 'Tool Calling', max: 1, bool: true },
  { key: 'reasoning', label: 'Reliability', max: 5 },
  { key: 'quality', label: 'Overall', max: 5 },
];

const ctxNum = (c) => { const n = parseFloat(c); return c.includes('M') ? n * 1000 : n; };

export default function ModelComparison({ models, onClose, onRemove }) {
  if (!models.length) return null;
  const winner = models[0];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><GitCompare className="h-4 w-4 text-violet-400" /><h2 className="text-sm font-semibold text-white">Model Comparison</h2><span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{models.length} models</span></div>
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white">Clear</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="w-32 p-2 text-left text-xs text-zinc-500">Metric</th>
              {models.map(m => (
                <th key={m.id} className="p-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${m.grad} text-[10px] font-bold`}>{m.name.slice(0, 2)}</span>
                    <span className="text-xs font-medium text-white">{m.name}</span>
                    <button onClick={() => onRemove(m)} className="rounded p-0.5 text-zinc-600 hover:text-rose-400"><X className="h-3 w-3" /></button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIMS.map((d, idx) => (
              <tr key={idx} className="border-b border-white/5">
                <td className="p-2 text-xs text-zinc-500">{d.label}</td>
                {models.map(m => {
                  let val, pct;
                  if (d.bool) { val = m[d.key] ? '✓' : '—'; pct = m[d.key] ? 100 : 0; }
                  else if (d.raw && d.key === 'context') { const n = ctxNum(m.context); val = m.context; pct = (n / d.max) * 100; }
                  else if (d.raw && d.inv) { val = '$' + m[d.key]; pct = (1 - m[d.key] / d.max) * 100; }
                  else { val = m[d.key] + '★'; pct = (m[d.key] / d.max) * 100; }
                  return (
                    <td key={m.id} className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="w-10 text-xs text-white">{val}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-300">
        <span className="font-semibold">Recommendation:</span> {winner.name} ranks highest overall for your workload.
      </div>
    </motion.div>
  );
}
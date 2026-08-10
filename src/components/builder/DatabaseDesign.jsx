import { motion } from 'framer-motion';
import { Database } from 'lucide-react';
import { DB_TABLES, DB_RELATIONS } from './builderData';

export default function DatabaseDesign() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Database className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Database Design</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{DB_TABLES.length} tables</span>
      </div>
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-white/5 bg-black/20">
        {/* Relation lines (SVG) */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {DB_RELATIONS.map((r, i) => {
            const from = DB_TABLES.find(t => t.name === r.from);
            const to = DB_TABLES.find(t => t.name === r.to);
            if (!from || !to) return null;
            return (
              <motion.line
                key={i}
                x1={`${from.x + 12}%`} y1={`${from.y + 8}%`} x2={`${to.x + 8}%`} y2={`${to.y + 8}%`}
                stroke="rgba(139,92,246,.35)" strokeWidth="1.5" strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: i * 0.1 }}
              />
            );
          })}
        </svg>

        {/* Tables */}
        {DB_TABLES.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="absolute w-36 overflow-hidden rounded-xl border border-white/15 bg-[#14151d] shadow-xl"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            <div className={`flex items-center gap-1.5 bg-gradient-to-r ${t.grad} px-2.5 py-1.5`}>
              <Database className="h-3 w-3 text-white" />
              <span className="text-xs font-semibold text-white">{t.name}</span>
            </div>
            <div className="divide-y divide-white/5">
              {t.fields.map(f => (
                <div key={f} className="flex items-center justify-between px-2.5 py-1 text-[11px]">
                  <span className="text-zinc-400">{f.replace(' →', '')}</span>
                  {f.includes('→') && <span className="text-[9px] text-violet-400">FK</span>}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
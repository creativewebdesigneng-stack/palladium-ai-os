import { motion } from 'framer-motion';
import { PIPELINE_STAGES } from './builderData';

export default function BuilderPipeline() {
  const doneCount = PIPELINE_STAGES.filter(s => s.status === 'done').length;
  const activeIdx = PIPELINE_STAGES.findIndex(s => s.status === 'active');
  const pct = Math.round((activeIdx / (PIPELINE_STAGES.length - 1)) * 100);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Build Pipeline</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{doneCount} of {PIPELINE_STAGES.length} stages complete</p>
        </div>
        <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
        />
      </div>

      {/* Stages */}
      <div className="flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PIPELINE_STAGES.map((s, i) => (
          <div key={s.name} className="flex items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`flex min-w-[96px] flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition ${
                s.status === 'active' ? 'border-violet-400/40 bg-violet-500/10' :
                s.status === 'done' ? 'border-emerald-400/20 bg-emerald-500/5' :
                'border-white/10 bg-black/20'
              }`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${
                s.status === 'active' ? 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white' :
                s.status === 'done' ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' :
                'bg-white/5 text-zinc-500'
              }`}>
                {s.status === 'active' ? (
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                    <s.icon className="h-4 w-4" />
                  </motion.span>
                ) : s.status === 'done' ? (
                  <s.icon className="h-4 w-4" />
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
              </span>
              <span className={`text-[10px] font-medium ${s.status === 'pending' ? 'text-zinc-600' : 'text-white'}`}>{s.name}</span>
            </motion.div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={`mx-0.5 h-0.5 w-3 rounded-full ${i < activeIdx ? 'bg-emerald-400/50' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
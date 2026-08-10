import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, Pencil } from 'lucide-react';
import { STATUS_STYLE } from './workflowsData';
import WorkflowBuilder from './WorkflowBuilder';
import RunHistoryTable from './RunHistoryTable';
import { RUN_HISTORY } from './workflowsData';

export default function WorkflowDetailDrawer({ workflow, onClose }) {
  const [tab, setTab] = useState('builder');
  if (!workflow) return null;
  const st = STATUS_STYLE[workflow.status];

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0b0c12]">
        {/* header */}
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white">{workflow.name}</h2>
              <p className="mt-0.5 text-xs text-zinc-400">{workflow.description}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{workflow.status}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">Trigger · {workflow.trigger}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{workflow.nodes.length} nodes</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{workflow.runs} runs</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1.5 text-[11px] font-medium text-white"><Play className="h-3.5 w-3.5" />Run</button>
            <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5"><Pause className="h-3.5 w-3.5" />Pause</button>
            <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" />Retry</button>
            <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5"><Pencil className="h-3.5 w-3.5" />Edit</button>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-white/10 px-3 pt-2">
          {[['builder', 'Builder'], ['runs', 'Run History']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-t-lg px-3 py-2 text-xs font-medium transition ${tab === k ? 'border-b-2 border-violet-500 text-white' : 'text-zinc-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {tab === 'builder' ? <WorkflowBuilder workflow={workflow} /> : <RunHistoryTable runs={RUN_HISTORY.some((r) => r.workflow === workflow.name) ? RUN_HISTORY.filter((r) => r.workflow === workflow.name) : RUN_HISTORY.slice(0, 4)} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  );
}
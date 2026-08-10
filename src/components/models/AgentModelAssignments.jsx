import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { AGENT_ASSIGNMENTS } from './modelsData';

export default function AgentModelAssignments({ onSwitch }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">Agent Model Assignments</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Models powering each agent, with fallbacks.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 text-left text-[11px] text-zinc-500">
            <tr>{['Agent', 'Current Model', 'Fallback', 'Provider', 'Status', ''].map(h => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {AGENT_ASSIGNMENTS.map((a, i) => (
              <motion.tr key={a.agent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${a.grad} text-[10px] font-bold`}>{a.icon}</span>
                    <span className="text-xs font-medium text-white">{a.agent}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-300">{a.currentModel}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">{a.fallback}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-400">{a.provider}</td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] ${a.status === 'Active' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/5 text-zinc-500'}`}>{a.status}</span></td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => onSwitch && onSwitch(a)} className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">Switch <ArrowRight className="h-3 w-3" /></button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
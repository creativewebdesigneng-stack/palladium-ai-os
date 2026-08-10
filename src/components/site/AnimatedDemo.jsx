import { motion } from 'framer-motion';
import { Bot, Activity, Cpu, Workflow } from 'lucide-react';

const bars = [40, 64, 52, 78, 60, 88, 72, 96];
const agents = [
  { name: 'Research Analyst', color: 'from-violet-500 to-indigo-600', status: 'Analyzing 12 sources' },
  { name: 'Support Copilot', color: 'from-cyan-500 to-blue-600', status: 'Resolving ticket' },
  { name: 'Code Reviewer', color: 'from-emerald-500 to-teal-600', status: 'Reviewing PR #284' },
];

export default function AnimatedDemo() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d14] shadow-2xl">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-rose-400/70" />
          <span className="h-3 w-3 rounded-full bg-amber-400/70" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-xs text-zinc-500">palladiumai.app / dashboard</span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live</span>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {[[ 'AI requests', '4,128', '+12%' ],[ 'Active agents', '3', '2 running' ],[ 'Tasks done', '184', 'this week' ]].map(([l,v,d]) => (
            <div key={l} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-xs text-zinc-500">{l}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{v}</p>
              <p className="mt-1 text-[11px] text-emerald-400">{d}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-[1.5fr_1fr]">
          {/* animated chart */}
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="flex items-center gap-2 text-sm text-zinc-300"><Activity className="h-4 w-4 text-violet-400" />Usage this week</div>
            <div className="mt-5 flex h-40 items-end gap-2">
              {bars.map((h, i) => (
                <motion.div key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600/30 to-violet-400" />
              ))}
            </div>
          </div>
          {/* agents working */}
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="flex items-center gap-2 text-sm text-zinc-300"><Bot className="h-4 w-4 text-cyan-400" />Agents working</div>
            <div className="mt-4 space-y-3">
              {agents.map((a, i) => (
                <motion.div key={a.name}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-3">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${a.color} text-[10px] font-semibold text-white`}>{a.name[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white">{a.name}</p>
                    <p className="text-[10px] text-zinc-500">{a.status}</p>
                  </div>
                  <motion.span className="h-2 w-2 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t border-white/10 px-5 py-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5 text-violet-400" />Claude · GPT · Gemini</span>
          <span className="flex items-center gap-1"><Workflow className="h-3.5 w-3.5 text-cyan-400" />4 automations running</span>
          <span className="ml-auto">Updated just now</span>
        </div>
      </div>
    </div>
  );
}
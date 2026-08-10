import { motion } from 'framer-motion';
import { Bot, Sparkles, ArrowUpRight } from 'lucide-react';

const agents = [
  { name: 'Research Analyst', role: 'Gathers & synthesizes intelligence', color: 'from-violet-500 to-indigo-600', task: 'Scanning 12 sources', metric: '94%' },
  { name: 'Support Copilot', role: 'Resolves customer tickets', color: 'from-cyan-500 to-blue-600', task: 'Ticket #4812', metric: '98%' },
  { name: 'Code Reviewer', role: 'Reviews pull requests', color: 'from-emerald-500 to-teal-600', task: 'PR #284', metric: '96%' },
  { name: 'Growth Writer', role: 'Drafts marketing content', color: 'from-fuchsia-500 to-pink-600', task: 'Launch blog', metric: '91%' },
];

export default function AgentShowcase() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {agents.map((a, i) => (
          <motion.div key={a.name}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-violet-400/30">
            <div className="flex items-center gap-3">
              <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${a.color} text-sm font-semibold text-white shadow-lg`}>{a.name[0]}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{a.name}</p>
                <p className="text-[11px] text-zinc-500">{a.role}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <motion.span className="h-2 w-2 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }} />
              <span className="text-[11px] text-zinc-400">{a.task}</span>
              <span className="ml-auto text-[11px] font-medium text-emerald-400">{a.metric}</span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-600 group-hover:text-violet-300">
              <Bot className="h-3.5 w-3.5" />Autonomous<span className="ml-auto flex items-center gap-0.5">Open<ArrowUpRight className="h-3 w-3" /></span>
            </div>
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl opacity-0 transition group-hover:opacity-100" />
          </motion.div>
        ))}
      </div>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-600"><Sparkles className="h-3.5 w-3.5 text-violet-400" />Build any agent in minutes — no code required.</p>
    </div>
  );
}
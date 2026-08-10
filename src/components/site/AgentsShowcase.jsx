import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, WandSparkles, Store, Wrench, BrainCircuit, BookOpen,
  Globe2, Monitor, GitBranch, Network, ArrowRight, Code2,
  Search, Megaphone, Wallet, Headset, Sparkles,
} from 'lucide-react';

// ── "How agents work" capability sections ───────────────────────────────────
const SECTIONS = [
  { icon: Users, title: 'AI Workforce', desc: 'Orchestrate teams of specialised agents that delegate, collaborate and deliver together.' },
  { icon: WandSparkles, title: 'Agent Builder', desc: 'Compose agents from skills, tools and prompts — no code required.' },
  { icon: Store, title: 'Agent Marketplace', desc: 'Deploy pre-built agents from the community in a single click.' },
  { icon: Wrench, title: 'Tools', desc: 'Give agents tools: APIs, code execution, file access and integrations.' },
  { icon: BrainCircuit, title: 'Memory', desc: 'Agents remember context, preferences and outcomes across sessions.' },
  { icon: BookOpen, title: 'Knowledge', desc: 'Ground every answer in your company documents and knowledge base.' },
  { icon: Globe2, title: 'Browser Control', desc: 'Agents navigate, click and extract from any website autonomously.' },
  { icon: Monitor, title: 'Computer Control', desc: 'Agents operate your desktop, files and applications end-to-end.' },
  { icon: GitBranch, title: 'Workflows', desc: 'Chain agents into branching pipelines with approvals and durable waits.' },
  { icon: Network, title: 'Collaboration', desc: 'Agents talk to each other and your team — sharing context and results.' },
];

export function HowAgentsWork() {
  return (
    <div className="mx-auto grid max-w-7xl gap-3 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {SECTIONS.map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
          className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-violet-400/30 hover:bg-white/[.04]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-violet-300 transition group-hover:scale-105">
              <s.icon className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold text-white">{s.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Agent examples ───────────────────────────────────────────────────────────
const AGENTS = [
  { name: 'Developer Agent', icon: Code2, tone: 'from-violet-500 to-indigo-500', tag: 'Code', tasks: ['Writes & reviews PRs', 'Runs tests in sandbox', 'Fixes bugs autonomously'] },
  { name: 'Research Agent', icon: Search, tone: 'from-cyan-500 to-sky-500', tag: 'Research', tasks: ['Scans the live web', 'Synthesises briefs', 'Cites every source'] },
  { name: 'Marketing Agent', icon: Megaphone, tone: 'from-fuchsia-500 to-pink-500', tag: 'Growth', tasks: ['Drafts campaigns', 'Schedules posts', 'Analyses performance'] },
  { name: 'Sales Agent', icon: Wallet, tone: 'from-emerald-500 to-teal-500', tag: 'Revenue', tasks: ['Qualifies leads', 'Enriches CRM records', 'Books meetings'] },
  { name: 'Finance Agent', icon: Wallet, tone: 'from-amber-500 to-orange-500', tag: 'Finance', tasks: ['Reconciles invoices', 'Forecasts cashflow', 'Flags anomalies'] },
  { name: 'Support Agent', icon: Headset, tone: 'from-rose-500 to-red-500', tag: 'Support', tasks: ['Answers tickets 24/7', 'Escalates when unsure', 'Updates knowledge base'] },
];

export function AgentExamples() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {AGENTS.map((a, i) => (
        <motion.article
          key={a.name}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20"
        >
          <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${a.tone} opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40`} />
          <div className="relative flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${a.tone} shadow-lg`}>
              <a.icon className="h-6 w-6 text-white" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-white">{a.name}</h3>
              <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">{a.tag}</span>
            </div>
          </div>
          <ul className="relative mt-4 space-y-2">
            {a.tasks.map((t, j) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + j * 0.08 }}
                className="flex items-center gap-2 text-sm text-zinc-400"
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${a.tone}`} /> {t}
              </motion.li>
            ))}
          </ul>
          <div className="relative mt-4 flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Ready to deploy
            </span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

export function AgentCta() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#0c0d14] to-cyan-500/15 p-12 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.3),transparent_60%)]" />
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }} className="relative mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_40px_rgba(139,92,246,.5)]">
        <Sparkles className="h-7 w-7 text-white" />
      </motion.div>
      <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">Create Your First Agent</h2>
      <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Spin up an AI agent in minutes — give it tools, knowledge and memory, then put it to work. Your first 14 days are free.</p>
      <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to="/register?returnTo=/agents/new" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
          Create Your First Agent <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
        <Link to="/agent-marketplace" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">Browse Marketplace</Link>
      </div>
    </div>
  );
}
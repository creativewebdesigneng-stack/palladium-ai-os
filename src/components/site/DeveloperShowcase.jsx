import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Code2, Boxes, Cable, TerminalSquare, Monitor, GitBranch, Rocket,
  Plug, Wrench, Cpu, Hammer, TestTube, Bug, ArrowRight, BookOpen,
  Workflow, FileCode2, Cog,
} from 'lucide-react';

// ── Capabilities grid ───────────────────────────────────────────────────────
const CAPS = [
  { icon: Code2, title: 'AI Coding', tone: 'text-cyan-300', desc: 'Agents write, review and refactor code in your repo.' },
  { icon: Boxes, title: 'Agent SDK', tone: 'text-violet-300', desc: 'Build custom agents in code with full tool access.' },
  { icon: Cable, title: 'API', tone: 'text-amber-300', desc: 'REST + webhooks to run agents, models and workflows.' },
  { icon: TerminalSquare, title: 'Developer Portal', tone: 'text-sky-300', desc: 'Keys, usage, webhooks and live API explorer.' },
  { icon: TerminalSquare, title: 'Terminal', tone: 'text-emerald-300', desc: 'Run commands in a sandboxed agent terminal.' },
  { icon: Monitor, title: 'Browser Preview', tone: 'text-indigo-300', desc: 'See your app live as agents edit and ship.' },
  { icon: GitBranch, title: 'Git', tone: 'text-rose-300', desc: 'Branches, PRs and commits managed by AI.' },
  { icon: Rocket, title: 'Deployments', tone: 'text-teal-300', desc: 'Ship to staging and prod with one click.' },
  { icon: Plug, title: 'MCP', tone: 'text-fuchsia-300', desc: 'Model Context Protocol servers for any tool.' },
  { icon: Wrench, title: 'Tools', tone: 'text-blue-300', desc: 'Code execution, file access and integrations.' },
  { icon: Cpu, title: 'Models', tone: 'text-violet-300', desc: 'Frontier models with tool use and vision.' },
];

export function CapabilityGrid() {
  return (
    <div className="mx-auto grid max-w-7xl gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
      {CAPS.map((c, i) => (
        <motion.div
          key={c.title}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
          className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20 hover:bg-white/[.04]"
        >
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${c.tone}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold text-white">{c.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{c.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Workflow sections (Build / Test / Debug / Deploy / Automate) ─────────────
const PHASES = [
  { icon: Hammer, label: 'Build', tone: 'from-cyan-500 to-sky-500', desc: 'Describe a feature and agents scaffold the project, write the code and wire the APIs.', points: ['Generate full-stack features from a prompt', 'Edit existing files with context awareness', 'Compose UI, API and database together'] },
  { icon: TestTube, label: 'Test', tone: 'from-emerald-500 to-teal-500', desc: 'Agents generate tests, run them in the sandbox and fix what breaks.', points: ['Unit, integration and e2e generation', 'Run tests and read failures', 'Self-heal until green'] },
  { icon: Bug, label: 'Debug', tone: 'from-amber-500 to-orange-500', desc: 'Triage errors, inspect logs and let agents patch the root cause.', points: ['Live error & log analysis', 'Reproduce from stack traces', 'Propose and apply fixes'] },
  { icon: Rocket, label: 'Deploy', tone: 'from-violet-500 to-fuchsia-500', desc: 'Ship to staging or production with previews and rollback.', points: ['One-click staging + prod', 'Preview URLs per PR', 'Instant rollback'] },
  { icon: Workflow, label: 'Automate', tone: 'from-rose-500 to-red-500', desc: 'Trigger agents on git events, schedules and webhooks.', points: ['Auto-review on every PR', 'Scheduled maintenance tasks', 'Webhook-driven workflows'] },
];

export function WorkflowPhases() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-6">
      {PHASES.map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, x: i % 2 ? 24 : -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:p-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-4 sm:w-48">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${p.tone} shadow-lg`}>
                <p.icon className="h-6 w-6 text-white" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Phase {i + 1}</p>
                <h3 className="text-xl font-semibold text-white">{p.label}</h3>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-zinc-400">{p.desc}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${p.tone}`} /> {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Code-style hero visual ──────────────────────────────────────────────────
const CODE_LINES = [
  { t: 'import', c: ' { Palladium } ', m: 'from', v: ' "@palladiumai/sdk"' },
  { t: '', c: '', m: '', v: '' },
  { t: 'const', c: ' agent = ', m: 'await', v: ' Palladium.agents.create({' },
  { t: '  name:', c: ' "Build Software With An AI Workforce",', m: '', v: '' },
  { t: '  tools:', c: ' [code, terminal, browser, git, deploy],', m: '', v: '' },
  { t: '  model:', c: ' "palladium-frontier",', m: '', v: '' },
  { t: '  knowledge:', c: ' repo.context(),', m: '', v: '' },
  { t: '})', c: '', m: '', v: '' },
  { t: '', c: '', m: '', v: '' },
  { t: 'await', c: ' agent.run(', m: '"ship the auth feature"', v: ')' },
];

export function CodeHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative mx-auto max-w-2xl"
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/30 via-transparent to-cyan-500/30 blur-md" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c12]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <FileCode2 className="h-3.5 w-3.5" /> workforce.ts
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
            <Cog className="h-3 w-3 animate-spin" /> agent running
          </span>
        </div>
        <pre className="overflow-x-auto p-5 text-[12.5px] leading-relaxed font-mono">
          <code>
            {CODE_LINES.map((l, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                className="whitespace-pre"
              >
                <span className="text-violet-400">{l.t}</span>
                <span className="text-zinc-300">{l.c}</span>
                <span className="text-cyan-400">{l.m}</span>
                <span className="text-emerald-300">{l.v}</span>
              </motion.div>
            ))}
          </code>
        </pre>
        <div className="border-t border-white/10 bg-black/30 px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Build → Test → Debug → Deploy → Automate
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── CTAs ────────────────────────────────────────────────────────────────────
export function DevCtas() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link to="/register?returnTo=/developer-workspace" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
        Start Building <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
      <Link to="/docs" className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
        <BookOpen className="h-4 w-4 text-violet-400" /> Read Documentation
      </Link>
    </div>
  );
}
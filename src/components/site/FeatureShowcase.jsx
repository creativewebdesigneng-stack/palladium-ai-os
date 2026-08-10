import { motion } from 'framer-motion';
import {
  Bot, Users, WandSparkles, Globe2, Monitor, MousePointer2,
  Search, BookOpen, BrainCircuit, Workflow, GitBranch, Plug,
  Code2, Store, BarChart3, BriefcaseBusiness, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Feature catalog (16 capabilities) ──────────────────────────────────────
const FEATURES = [
  { key: 'agents', icon: Bot, title: 'AI Agents', desc: 'Build intelligent agents that research, reason and complete real tasks autonomously.', tone: 'violet' },
  { key: 'workforce', icon: Users, title: 'AI Workforce', desc: 'Orchestrate teams of collaborating agents that delegate, specialise and deliver together.', tone: 'cyan' },
  { key: 'agent-builder', icon: WandSparkles, title: 'Agent Builder', desc: 'Compose agents from skills, tools and prompts — no code required.', tone: 'fuchsia' },
  { key: 'app-builder', icon: Globe2, title: 'AI App Builder', desc: 'Describe an application in plain language and watch AI build, test and ship it.', tone: 'emerald' },
  { key: 'browser-control', icon: Globe2, title: 'Browser Control', desc: 'Agents navigate, click and extract data from any website just like a human.', tone: 'sky' },
  { key: 'computer-control', icon: Monitor, title: 'Computer Control', desc: 'Let agents operate your desktop, files and applications end-to-end.', tone: 'indigo' },
  { key: 'web-search', icon: Search, title: 'Web Search', desc: 'Search and synthesise answers from across the live internet in seconds.', tone: 'rose' },
  { key: 'knowledge', icon: BookOpen, title: 'Knowledge', desc: 'Connect your documents so agents ground every answer in your company knowledge.', tone: 'amber' },
  { key: 'memory', icon: BrainCircuit, title: 'Memory', desc: 'Give your agents persistent memory across conversations and sessions.', tone: 'violet' },
  { key: 'automation', icon: Workflow, title: 'Automation', desc: 'Turn repetitive work into autonomous, multi-step workflows that run themselves.', tone: 'emerald' },
  { key: 'workflows', icon: GitBranch, title: 'Workflows', desc: 'Design branching, conditional pipelines with human approvals and durable waits.', tone: 'cyan' },
  { key: 'integrations', icon: Plug, title: 'Integrations', desc: 'Connect the services your business already uses — Slack, Google, GitHub and 100+ more.', tone: 'blue' },
  { key: 'developer-tools', icon: Code2, title: 'Developer Tools', desc: 'Code explorer, terminal, browser preview and AI pair-programming in one workspace.', tone: 'amber' },
  { key: 'marketplace', icon: Store, title: 'Marketplace', desc: 'Discover and deploy agents, tools, models and workflows built by the community.', tone: 'fuchsia' },
  { key: 'analytics', icon: BarChart3, title: 'Analytics', desc: 'Understand usage, costs and agent performance with rich, real-time dashboards.', tone: 'rose' },
  { key: 'business-tools', icon: BriefcaseBusiness, title: 'Business Tools', desc: 'Run CRM, marketing, finance and support — supercharged by your AI workforce.', tone: 'indigo' },
];

const TONES = {
  violet: { text: 'text-violet-300', grad: 'from-violet-500/25', dot: 'bg-violet-400', stroke: 'rgba(139,92,246,0.6)' },
  cyan: { text: 'text-cyan-300', grad: 'from-cyan-500/25', dot: 'bg-cyan-400', stroke: 'rgba(34,211,238,0.6)' },
  fuchsia: { text: 'text-fuchsia-300', grad: 'from-fuchsia-500/25', dot: 'bg-fuchsia-400', stroke: 'rgba(232,121,249,0.6)' },
  emerald: { text: 'text-emerald-300', grad: 'from-emerald-500/25', dot: 'bg-emerald-400', stroke: 'rgba(52,211,153,0.6)' },
  sky: { text: 'text-sky-300', grad: 'from-sky-500/25', dot: 'bg-sky-400', stroke: 'rgba(56,189,248,0.6)' },
  indigo: { text: 'text-indigo-300', grad: 'from-indigo-500/25', dot: 'bg-indigo-400', stroke: 'rgba(129,140,248,0.6)' },
  rose: { text: 'text-rose-300', grad: 'from-rose-500/25', dot: 'bg-rose-400', stroke: 'rgba(251,113,133,0.6)' },
  amber: { text: 'text-amber-300', grad: 'from-amber-500/25', dot: 'bg-amber-400', stroke: 'rgba(251,191,36,0.6)' },
  blue: { text: 'text-blue-300', grad: 'from-blue-500/25', dot: 'bg-blue-400', stroke: 'rgba(96,165,250,0.6)' },
};

// ── Per-feature animated mini visuals ───────────────────────────────────────
function FeatureVisual({ k, tone }) {
  const t = TONES[tone];
  const base = 'relative h-36 w-full overflow-hidden rounded-xl border border-white/10 bg-black/40';

  switch (k) {
    case 'agents':
      return (
        <div className={base}>
          <div className="absolute inset-0 flex items-end gap-1.5 p-4">
            {[40, 64, 52, 80, 68, 96].map((h, i) => (
              <motion.div key={i} className={`flex-1 rounded-t bg-gradient-to-t ${t.grad} to-transparent`} initial={{ height: 0 }} whileInView={{ height: h }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6 }} />
            ))}
          </div>
        </div>
      );
    case 'workforce':
      return (
        <div className={base}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-24 w-24">
              {[0, 1, 2, 3, 4].map((i) => {
                const a = (i / 5) * Math.PI * 2;
                return <motion.span key={i} className={`absolute h-3 w-3 rounded-full ${t.dot}`} style={{ left: '50%', top: '50%' }} animate={{ x: [Math.cos(a) * 36, Math.cos(a + 1) * 36, Math.cos(a) * 36], y: [Math.sin(a) * 36, Math.sin(a + 1) * 36, Math.sin(a) * 36] }} transition={{ duration: 6, repeat: Infinity, delay: i * 0.2 }} />;
              })}
              <span className={`absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-br ${t.grad} to-white/10`} />
            </div>
          </div>
        </div>
      );
    case 'agent-builder':
      return (
        <div className={base}>
          <div className="space-y-2 p-4">
            {['Trigger', 'Skill · Web Search', 'Action · Notify'].map((s, i) => (
              <motion.div key={s} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 py-2" initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
                <span className={`h-2 w-2 rounded-full ${t.dot}`} /><span className="text-[11px] text-zinc-300">{s}</span>
              </motion.div>
            ))}
          </div>
        </div>
      );
    case 'app-builder':
      return (
        <div className={base}>
          <div className="flex h-full flex-col justify-center gap-1.5 p-4">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
              <WandSparkles className={`h-3.5 w-3.5 ${t.text}`} />
              <motion.span className="text-[11px] text-zinc-400" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>Build an inventory tracker…</motion.span>
            </div>
            {[88, 64, 76].map((w, i) => (
              <motion.div key={i} className={`h-2 rounded-full bg-gradient-to-r ${t.grad} to-transparent`} style={{ width: `${w}%` }} initial={{ scaleX: 0, originX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12 }} />
            ))}
          </div>
        </div>
      );
    case 'browser-control':
      return (
        <div className={base}>
          <div className="flex h-full flex-col p-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-rose-400/60" /><span className="h-2 w-2 rounded-full bg-amber-400/60" /><span className="h-2 w-2 rounded-full bg-emerald-400/60" />
              <div className="ml-2 h-3 flex-1 rounded bg-white/5" />
            </div>
            <div className="mt-2 grid flex-1 grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => <motion.div key={i} className="rounded-lg border border-white/10 bg-white/[.03]" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />)}
            </div>
            <motion.div className={`mx-auto mt-1.5 flex items-center gap-1 rounded-full bg-gradient-to-r ${t.grad} px-2 py-0.5`} animate={{ x: [0, 60, -20, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <MousePointer2 className={`h-3 w-3 ${t.text}`} />
            </motion.div>
          </div>
        </div>
      );
    case 'computer-control':
      return (
        <div className={base}>
          <div className="relative flex h-full items-center justify-center p-4">
            <Monitor className="h-16 w-16 text-white/10" />
            <motion.div className="absolute" animate={{ x: [-30, 30, -30], y: [-10, 10, -10] }} transition={{ duration: 5, repeat: Infinity }}>
              <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${t.grad} to-white/10`}><MousePointer2 className="h-3.5 w-3.5 text-white" /></span>
            </motion.div>
          </div>
        </div>
      );
    case 'web-search':
      return (
        <div className={base}>
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
              <Search className={`h-3.5 w-3.5 ${t.text}`} />
              <span className="text-[11px] text-zinc-400">competitor pricing 2026</span>
            </div>
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="flex items-center gap-2" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }}>
                <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                <div className="h-1.5 flex-1 rounded-full bg-white/10" />
              </motion.div>
            ))}
          </div>
        </div>
      );
    case 'knowledge':
      return (
        <div className={base}>
          <div className="grid h-full grid-cols-4 gap-1.5 p-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div key={i} className="rounded-md border border-white/10 bg-white/[.03]" animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.1 }} />
            ))}
          </div>
        </div>
      );
    case 'memory':
      return (
        <div className={base}>
          <div className="relative flex h-full items-center justify-center">
            <motion.div className={`h-20 w-20 rounded-full border-2 ${t.dot} border-opacity-30`} animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity }} />
            <BrainCircuit className={`absolute h-8 w-8 ${t.text}`} />
          </div>
        </div>
      );
    case 'automation':
      return (
        <div className={base}>
          <div className="flex h-full items-center justify-center gap-2 p-4">
            {['Start', 'Run', 'Done'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <motion.span className="rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-1.5 text-[10px] text-zinc-300" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}>{s}</motion.span>
                {i < 2 && <motion.span className={`h-px w-6 ${t.dot} bg-opacity-40`} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }} />}
              </div>
            ))}
          </div>
        </div>
      );
    case 'workflows':
      return (
        <div className={base}>
          <svg className="h-full w-full" viewBox="0 0 200 120" fill="none">
            <motion.path d="M20 60 L70 60 L70 25 L130 25 L130 60 L180 60" stroke={t.stroke} strokeWidth="2" strokeDasharray="4 4" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4 }} />
            {[[20, 60], [130, 25], [130, 95], [180, 60]].map(([cx, cy], i) => (
              <motion.circle key={i} cx={cx} cy={cy} r="6" className={t.dot} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.15 }} />
            ))}
          </svg>
        </div>
      );
    case 'integrations':
      return (
        <div className={base}>
          <div className="grid h-full grid-cols-4 gap-1.5 p-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.div key={i} className="grid place-items-center rounded-lg border border-white/10 bg-white/[.03]" animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}>
                <Plug className={`h-4 w-4 ${t.text}`} />
              </motion.div>
            ))}
          </div>
        </div>
      );
    case 'developer-tools':
      return (
        <div className={base}>
          <div className="flex h-full items-center gap-3 p-4 font-mono text-[11px]">
            <div className="flex flex-col gap-1 opacity-50">
              <span className={t.text}>const</span>
              <span>agent</span>
              <span className={t.text}>= await</span>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {['build()', 'deploy()', 'test()'].map((s, i) => (
                <motion.div key={s} className="rounded border border-white/10 bg-white/[.03] px-2 py-1 text-zinc-300" initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>{s}</motion.div>
              ))}
            </div>
          </div>
        </div>
      );
    case 'marketplace':
      return (
        <div className={base}>
          <div className="grid h-full grid-cols-3 gap-1.5 p-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div key={i} className="rounded-lg border border-white/10 bg-white/[.03] p-2" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }}>
                <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${t.grad} to-transparent`} />
                <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-white/10" />
              </motion.div>
            ))}
          </div>
        </div>
      );
    case 'analytics':
      return (
        <div className={base}>
          <div className="flex h-full items-end gap-1.5 p-4">
            {[30, 55, 42, 70, 60, 88, 76, 96].map((h, i) => (
              <motion.div key={i} className={`flex-1 rounded-t bg-gradient-to-t ${t.grad} to-transparent`} initial={{ height: 0 }} whileInView={{ height: h }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5 }} />
            ))}
          </div>
        </div>
      );
    case 'business-tools':
      return (
        <div className={base}>
          <div className="grid h-full grid-cols-2 gap-1.5 p-3">
            {['CRM', 'MKT', 'FIN', 'SPT'].map((s, i) => (
              <motion.div key={s} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-2" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <span className={`h-5 w-5 rounded bg-gradient-to-br ${t.grad} to-transparent`} />
                <span className="text-[10px] text-zinc-300">{s}</span>
              </motion.div>
            ))}
          </div>
        </div>
      );
    default:
      return <div className={base} />;
  }
}

// ── Single feature card ─────────────────────────────────────────────────────
function FeatureCard({ feature, index }) {
  const t = TONES[feature.tone];
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20"
    >
      <div className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${t.grad} to-transparent opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100`} />
      <FeatureVisual k={feature.key} tone={feature.tone} />
      <div className="mt-4 flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${t.text}`}>
          <feature.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{feature.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{feature.desc}</p>
        </div>
      </div>
      <Link to="/register?returnTo=/dashboard" className="mt-4 flex items-center gap-1 text-[12px] font-medium text-zinc-500 transition group-hover:text-white">
        Learn More <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </Link>
    </motion.article>
  );
}

export default function FeatureShowcase() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f, i) => <FeatureCard key={f.key} feature={f} index={i} />)}
    </div>
  );
}
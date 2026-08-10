import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Store, BriefcaseBusiness, Rocket, Building2, ArrowRight,
  TrendingUp, Megaphone, Wallet, Settings, Users, Headset, Code2, Search,
  Bot, Sparkles, Phone,
} from 'lucide-react';

// ── Audiences ───────────────────────────────────────────────────────────────
const AUDIENCES = [
  { icon: Store, title: 'Small Businesses', tone: 'from-violet-500 to-fuchsia-500', desc: 'Run a full team on a founder budget — sales, support and marketing handled by AI.' },
  { icon: BriefcaseBusiness, title: 'Agencies', tone: 'from-cyan-500 to-sky-500', desc: 'Deliver more clients with fewer hires. AI agents do the production work.' },
  { icon: Rocket, title: 'Startups', tone: 'from-emerald-500 to-teal-500', desc: 'Ship faster with AI engineers, researchers and ops agents from day one.' },
  { icon: Building2, title: 'Enterprise', tone: 'from-amber-500 to-orange-500', desc: 'Scale an AI workforce across thousands of employees with security and control.' },
];

export function AudienceGrid() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
      {AUDIENCES.map((a, i) => (
        <motion.div
          key={a.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-6 transition hover:border-white/20"
        >
          <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${a.tone} opacity-20 blur-3xl transition-opacity group-hover:opacity-40`} />
          <span className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${a.tone} shadow-lg`}>
            <a.icon className="h-6 w-6 text-white" />
          </span>
          <h3 className="relative mt-4 text-lg font-semibold text-white">{a.title}</h3>
          <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{a.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Use cases ───────────────────────────────────────────────────────────────
const USE_CASES = [
  { icon: TrendingUp, title: 'Sales', tone: 'text-emerald-300', desc: 'Agents qualify leads, enrich CRM records, draft outreach and book meetings.' },
  { icon: Megaphone, title: 'Marketing', tone: 'text-fuchsia-300', desc: 'Generate campaigns, schedule posts, analyse performance and A/B test copy.' },
  { icon: Wallet, title: 'Finance', tone: 'text-amber-300', desc: 'Reconcile invoices, forecast cashflow and flag anomalies automatically.' },
  { icon: Settings, title: 'Operations', tone: 'text-teal-300', desc: 'Automate workflows, approvals and reporting across every system.' },
  { icon: Users, title: 'HR', tone: 'text-violet-300', desc: 'Screen candidates, onboard hires and answer policy questions 24/7.' },
  { icon: Headset, title: 'Support', tone: 'text-rose-300', desc: 'Resolve tickets instantly, escalate when unsure and keep knowledge bases current.' },
  { icon: Code2, title: 'Development', tone: 'text-cyan-300', desc: 'AI engineers write, review and ship code with tests in your repo.' },
  { icon: Search, title: 'Research', tone: 'text-sky-300', desc: 'Scour the web and your data to deliver sourced briefs and market intel.' },
];

export function UseCaseGrid() {
  return (
    <div className="mx-auto grid max-w-7xl gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
      {USE_CASES.map((u, i) => (
        <motion.div
          key={u.title}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
          className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20 hover:bg-white/[.04]"
        >
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${u.tone}`}>
              <u.icon className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold text-white">{u.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{u.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── AI workforce examples ───────────────────────────────────────────────────
const WORKFORCE = [
  { name: 'Sales Team', agents: 'Lead Qualifier · Outreach Writer · Meeting Booker', tone: 'text-emerald-300', icon: TrendingUp, metric: '3.2× more qualified meetings' },
  { name: 'Marketing Team', agents: 'Campaign Builder · Social Scheduler · Copy Editor', tone: 'text-fuchsia-300', icon: Megaphone, metric: '5× content throughput' },
  { name: 'Finance Team', agents: 'Invoice Reconciler · Cashflow Forecaster · Anomaly Watch', tone: 'text-amber-300', icon: Wallet, metric: '80% less manual bookkeeping' },
  { name: 'Operations Team', agents: 'Workflow Runner · Approval Manager · Reporter', tone: 'text-teal-300', icon: Settings, metric: '65% faster approvals' },
  { name: 'Support Team', agents: 'Ticket Resolver · KB Maintainer · Escalation Router', tone: 'text-rose-300', icon: Headset, metric: '71% tickets auto-resolved' },
  { name: 'Engineering Team', agents: 'Pair Programmer · Reviewer · Test Writer', tone: 'text-cyan-300', icon: Code2, metric: '2.4× faster PR cycle' },
];

export function WorkforceExamples() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {WORKFORCE.map((w, i) => (
        <motion.article
          key={w.name}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-6 transition hover:border-white/20"
        >
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${w.tone}`}>
              <w.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-white">{w.name}</h3>
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                <Bot className="h-3 w-3" /> AI Workforce
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">{w.agents}</p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2">
            <span className={`h-1.5 w-1.5 rounded-full ${w.tone.replace('text', 'bg')}`} />
            <span className="text-sm font-medium text-white">{w.metric}</span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

// ── ROI metrics ─────────────────────────────────────────────────────────────
const ROI = [
  { value: '3.4×', label: 'Faster output per team', sub: 'Across sales, marketing and support' },
  { value: '68%', label: 'Reduction in manual tasks', sub: 'Automated by AI workforce' },
  { value: '12 hrs', label: 'Saved per employee / week', sub: 'Reclaimed for high-value work' },
  { value: '4.8×', label: 'ROI in first 90 days', sub: 'Average across customers' },
];

export function RoiMetrics() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
      {ROI.map((r, i) => (
        <motion.div
          key={r.label}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.05] to-transparent p-6 text-center"
        >
          <p className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-4xl font-semibold text-transparent">{r.value}</p>
          <p className="mt-2 text-sm font-medium text-white">{r.label}</p>
          <p className="mt-1 text-xs text-zinc-500">{r.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── CTAs ─────────────────────────────────────────────────────────────────────
export function BusinessCtas() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Build Your AI Workforce */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#0c0d14] to-cyan-500/15 p-10 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.3),transparent_60%)]" />
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }} className="relative mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_40px_rgba(139,92,246,.5)]">
          <Sparkles className="h-6 w-6 text-white" />
        </motion.div>
        <h3 className="relative text-2xl font-semibold text-white sm:text-3xl">Build Your AI Workforce</h3>
        <p className="relative mx-auto mt-3 max-w-md text-sm text-zinc-400">Start free for 14 days. Deploy your first agents in minutes.</p>
        <Link to="/register?returnTo=/workforce" className="group relative mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
          Build Your AI Workforce <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
      {/* Talk To Sales */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/20 via-[#0c0d14] to-violet-500/15 p-10 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,.25),transparent_60%)]" />
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0.5 }} className="relative mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_0_40px_rgba(245,158,11,.4)]">
          <Phone className="h-6 w-6 text-white" />
        </motion.div>
        <h3 className="relative text-2xl font-semibold text-white sm:text-3xl">Talk To Sales</h3>
        <p className="relative mx-auto mt-3 max-w-md text-sm text-zinc-400">Enterprise-grade security, SSO, custom models and dedicated support.</p>
        <Link to="/pricing" className="relative mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
          Talk To Sales <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
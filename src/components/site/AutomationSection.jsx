import { motion } from 'framer-motion';
import { Zap, Bot, GitBranch, Mail, FileText, ArrowRight } from 'lucide-react';

const nodes = [
  { icon: Zap, label: 'Trigger', sub: 'New GitHub issue', color: 'text-amber-400 bg-amber-400/10' },
  { icon: Bot, label: 'Agent', sub: 'Code Reviewer', color: 'text-violet-400 bg-violet-400/10' },
  { icon: GitBranch, label: 'Action', sub: 'Open PR + comment', color: 'text-cyan-400 bg-cyan-400/10' },
];
const flows = [
  ['New lead in CRM', 'Growth Writer', 'Drafts personalized follow-up', Mail],
  ['Weekly report due', 'Finance Scout', 'Builds spreadsheet & summary', FileText],
];

export default function AutomationSection() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
            <div className="flex items-center justify-between gap-3">
              {nodes.map((n, i) => (
                <div key={n.label} className="flex flex-1 items-center">
                  <div className="flex-1 text-center">
                    <div className={`mx-auto grid h-12 w-12 place-items-center rounded-xl ${n.color}`}><n.icon className="h-5 w-5" /></div>
                    <p className="mt-2 text-xs font-medium text-white">{n.label}</p>
                    <p className="text-[10px] text-zinc-500">{n.sub}</p>
                  </div>
                  {i < nodes.length - 1 && (
                    <svg className="flex-1" height="2" viewBox="0 0 100 2" preserveAspectRatio="none">
                      <motion.line x1="0" y1="1" x2="100" y2="1" stroke="rgba(139,92,246,.4)" strokeWidth="2" strokeDasharray="4 4"
                        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.3 }} />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {flows.map(([t, agent, out, I]) => (
                <div key={t} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs">
                  <I className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-300">{t}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
                  <span className="text-violet-300">{agent}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
                  <span className="text-zinc-400">{out}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Automation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Automate the busywork end-to-end</h2>
          <p className="mt-3 text-zinc-400">Chain triggers, agents, and actions into reliable workflows that run while you sleep. PalladiumAI handles orchestration, retries, and approvals — you set the rules.</p>
          <ul className="mt-6 space-y-3 text-sm text-zinc-300">
            {['Visual, no-code workflow builder', 'Conditional branching & loops', 'Human-in-the-loop approvals', 'Scheduled & event-driven triggers'].map(f => (
              <li key={f} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
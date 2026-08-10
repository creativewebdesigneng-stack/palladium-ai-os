import { motion } from 'framer-motion';
import { Plug, Brain, Github, Slack, CreditCard, HardDrive, Sparkles, Zap, ArrowRight } from 'lucide-react';

const ORBS = [
  { icon: Brain,      grad: 'from-violet-500 to-indigo-500',   x: 12, y: 20, delay: 0   },
  { icon: Github,     grad: 'from-zinc-500 to-slate-700',       x: 70, y: 15, delay: 0.3 },
  { icon: Slack,      grad: 'from-violet-500 to-fuchsia-500',  x: 80, y: 65, delay: 0.6 },
  { icon: CreditCard, grad: 'from-emerald-500 to-teal-500',    x: 20, y: 70, delay: 0.9 },
  { icon: HardDrive,  grad: 'from-amber-500 to-yellow-500',     x: 50, y: 80, delay: 0.15},
];

export default function IntegrationsEmptyState({ onConnect }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-10 h-56 w-80">
        {/* Central hub */}
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }}
          className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 shadow-2xl shadow-violet-900/50">
          <Plug className="h-10 w-10 text-white" />
        </motion.div>
        {/* Orbs */}
        {ORBS.map((o, i) => (
          <motion.div key={i} className="absolute" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
            <motion.div animate={{ y: [0, -8, 0], scale: [1, 1.06, 1] }} transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: o.delay }}
              className={`grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-gradient-to-br ${o.grad} shadow-2xl`}>
              <o.icon className="h-5 w-5 text-white" />
            </motion.div>
          </motion.div>
        ))}
        {/* Connection lines */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {ORBS.map((o, i) => (
            <motion.line key={i} x1="50" y1="50" x2={o.x} y2={o.y} stroke="rgba(139,92,246,.25)" strokeWidth="0.4" strokeDasharray="2 2"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: i * 0.15, duration: 0.6 }} />
          ))}
        </svg>
      </div>

      <h2 className="text-2xl font-semibold text-white">Connect Your AI Workforce To The World</h2>
      <p className="mt-2 max-w-lg text-sm text-zinc-500">Connect your favourite AI models, applications and services and give your agents the tools they need to get real work done.</p>
      <button onClick={onConnect} className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30">
        <Zap className="h-4 w-4" />Connect Your First Integration<ArrowRight className="h-4 w-4" />
      </button>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {['OAuth 2.0','API Keys','Webhooks','REST','GraphQL','MCP','WebSockets'].map(p => (
          <span key={p} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[10px] text-zinc-400">{p}</span>
        ))}
      </div>
    </motion.div>
  );
}
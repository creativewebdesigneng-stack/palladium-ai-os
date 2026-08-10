import { motion } from 'framer-motion';
import { Sparkles, Bot, Cpu, Workflow, Search, Code2, BarChart3, BookOpen, Globe, Plug, ArrowRight, CheckCircle2, Activity } from 'lucide-react';

// Premium animated representation of the PalladiumAI platform — a floating
// glassmorphic command surface with live agent activity, metrics, and orbiting
// capability nodes. Pure framer-motion, no external assets.

const ORBIT = [
  { Icon: Bot, label: 'Agents', tone: 'text-violet-300', from: '0s' },
  { Icon: Cpu, label: 'Models', tone: 'text-cyan-300', from: '0.4s' },
  { Icon: Workflow, label: 'Automation', tone: 'text-emerald-300', from: '0.8s' },
  { Icon: Search, label: 'Research', tone: 'text-pink-300', from: '1.2s' },
  { Icon: Code2, label: 'Builder', tone: 'text-amber-300', from: '1.6s' },
  { Icon: Globe, label: 'Web', tone: 'text-sky-300', from: '2.0s' },
];

const ACTIVITY = [
  { icon: Bot, text: 'Research Agent compiled market brief', tone: 'bg-violet-500/15 text-violet-300' },
  { icon: Workflow, text: 'Inbound workflow deployed to production', tone: 'bg-emerald-500/15 text-emerald-300' },
  { icon: Code2, text: 'AI App Builder generated inventory tool', tone: 'bg-amber-500/15 text-amber-300' },
  { icon: Search, text: 'Web search: competitor pricing scanned', tone: 'bg-pink-500/15 text-pink-300' },
];

export default function PlatformVisual() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -inset-10 -z-10">
        <div className="absolute left-1/4 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 h-72 w-72 translate-x-1/2 rounded-full bg-cyan-500/25 blur-[120px]" />
      </div>

      {/* Orbiting capability nodes */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="relative h-[460px] w-[460px]">
          {ORBIT.map((n, i) => {
            const angle = (i / ORBIT.length) * Math.PI * 2;
            const r = 220;
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            return (
              <motion.div
                key={n.label}
                className="absolute"
                style={{ left: '50%', top: '50%', x, y }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.05, 0.9] }}
                transition={{ duration: 4, repeat: Infinity, delay: parseFloat(n.from) }}
              >
                <div className="grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur">
                  <n.Icon className={`h-5 w-5 ${n.tone}`} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Main platform surface */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[.06] to-white/[.02] p-3 shadow-[0_30px_80px_-20px_rgba(139,92,246,.35)] backdrop-blur-xl"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <div className="ml-3 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Sparkles className="h-3 w-3 text-violet-400" /> palladium.ai / workspace
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
          </span>
        </div>

        <div className="grid gap-3 rounded-2xl bg-black/30 p-3 sm:grid-cols-3">
          {/* Left: command bar + agents */}
          <div className="space-y-3 sm:col-span-2">
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Command</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <motion.span
                  className="text-[12px] text-zinc-300"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  Deploy the research workforce and summarise Q3…
                </motion.span>
                <span className="ml-auto h-4 w-px animate-pulse bg-violet-400" />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Active agents</p>
                <span className="text-[10px] text-zinc-600">3 running</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {[['Atlas Research', 'bg-violet-500', 72], ['Nova Support', 'bg-cyan-500', 54], ['Orbit Coder', 'bg-emerald-500', 38]].map(([name, bar, pct]) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="h-6 w-6 shrink-0 rounded-lg bg-white/5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-300">{name}</span>
                        <span className="text-[10px] text-zinc-600">{pct}%</span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          className={`h-full ${bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: live activity */}
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-emerald-400" />
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Live activity</p>
            </div>
            <div className="mt-2 space-y-1.5">
              {ACTIVITY.map((a, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-black/20 p-2"
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 6, repeat: Infinity, delay: i * 1.5, times: [0, 0.1, 0.9, 1] }}
                >
                  <a.icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded p-0.5 ${a.tone}`} />
                  <p className="text-[10px] leading-snug text-zinc-400">{a.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom metric strip */}
        <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
          {[
            { label: 'Requests', value: '4,128', icon: Activity, tone: 'text-violet-300' },
            { label: 'Agents', value: '12', icon: Bot, tone: 'text-cyan-300' },
            { label: 'Workflows', value: '8', icon: Workflow, tone: 'text-emerald-300' },
            { label: 'Models', value: '7', icon: Cpu, tone: 'text-amber-300' },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <m.icon className={`mx-auto h-4 w-4 ${m.tone}`} />
              <p className="mt-1 text-[15px] font-semibold text-white">{m.value}</p>
              <p className="text-[9px] uppercase tracking-wide text-zinc-600">{m.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute -left-6 top-1/4 hidden rounded-2xl border border-white/10 bg-[#0c0d14]/90 px-3 py-2 shadow-xl backdrop-blur lg:block"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-[11px] font-medium text-white">Agent deployed</span>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        className="absolute -right-6 bottom-1/4 hidden rounded-2xl border border-white/10 bg-[#0c0d14]/90 px-3 py-2 shadow-xl backdrop-blur lg:block"
      >
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-cyan-400" />
          <span className="text-[11px] font-medium text-white">12 integrations live</span>
        </div>
      </motion.div>
    </div>
  );
}
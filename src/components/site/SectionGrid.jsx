import { motion } from 'framer-motion';
import {
  Users, WandSparkles, Store, Plug, Workflow, Code2,
  BarChart3, BookOpen, Globe, ArrowRight,
} from 'lucide-react';

// The nine platform capabilities, each rendered as a premium glassmorphic card.
const SECTIONS = [
  { icon: Users, title: 'AI Workforce', desc: 'Build intelligent AI agents capable of completing real tasks.', tone: 'from-violet-500/20 to-violet-500/0', ring: 'group-hover:border-violet-400/30', accent: 'text-violet-300' },
  { icon: WandSparkles, title: 'AI App Builder', desc: 'Describe an application and let AI build it.', tone: 'from-cyan-500/20 to-cyan-500/0', ring: 'group-hover:border-cyan-400/30', accent: 'text-cyan-300' },
  { icon: Store, title: 'AI Marketplace', desc: 'Discover agents, tools, models and workflows.', tone: 'from-emerald-500/20 to-emerald-500/0', ring: 'group-hover:border-emerald-400/30', accent: 'text-emerald-300' },
  { icon: Plug, title: 'Integrations', desc: 'Connect the services your business already uses.', tone: 'from-blue-500/20 to-blue-500/0', ring: 'group-hover:border-blue-400/30', accent: 'text-blue-300' },
  { icon: Workflow, title: 'Automation', desc: 'Turn repetitive work into autonomous workflows.', tone: 'from-amber-500/20 to-amber-500/0', ring: 'group-hover:border-amber-400/30', accent: 'text-amber-300' },
  { icon: Code2, title: 'Developer Platform', desc: 'Build applications with AI assistance.', tone: 'from-fuchsia-500/20 to-fuchsia-500/0', ring: 'group-hover:border-fuchsia-400/30', accent: 'text-fuchsia-300' },
  { icon: BarChart3, title: 'Business Intelligence', desc: 'Understand your organisation using AI.', tone: 'from-rose-500/20 to-rose-500/0', ring: 'group-hover:border-rose-400/30', accent: 'text-rose-300' },
  { icon: BookOpen, title: 'Knowledge', desc: 'Give your AI workforce access to your company knowledge.', tone: 'from-indigo-500/20 to-indigo-500/0', ring: 'group-hover:border-indigo-400/30', accent: 'text-indigo-300' },
  { icon: Globe, title: 'AI Web', desc: 'Search and research across the internet.', tone: 'from-sky-500/20 to-sky-500/0', ring: 'group-hover:border-sky-400/30', accent: 'text-sky-300' },
];

export default function SectionGrid() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {SECTIONS.map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: (i % 3) * 0.08 }}
          className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-6 transition ${s.ring}`}
        >
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.tone} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
          <div className="relative flex items-start gap-4">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04] ${s.accent}`}>
              <s.icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
            </div>
          </div>
          <div className="relative mt-4 flex items-center gap-1 text-[12px] font-medium text-zinc-500 transition group-hover:text-white">
            Explore <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
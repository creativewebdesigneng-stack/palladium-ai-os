import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Bot, Code2, Search, PenLine, ImageIcon, Video, AudioWaveform,
  Workflow, BriefcaseBusiness, Search as SearchIcon, Star, ArrowUpRight, Sparkles,
} from 'lucide-react';

export const CATEGORIES = [
  { key: 'all', label: 'All', icon: Sparkles, tone: 'text-violet-300' },
  { key: 'models', label: 'AI Models', icon: Cpu, tone: 'text-cyan-300' },
  { key: 'agents', label: 'AI Agents', icon: Bot, tone: 'text-violet-300' },
  { key: 'coding', label: 'AI Coding', icon: Code2, tone: 'text-amber-300' },
  { key: 'research', label: 'AI Research', icon: Search, tone: 'text-sky-300' },
  { key: 'writing', label: 'AI Writing', icon: PenLine, tone: 'text-fuchsia-300' },
  { key: 'images', label: 'AI Images', icon: ImageIcon, tone: 'text-rose-300' },
  { key: 'video', label: 'AI Video', icon: Video, tone: 'text-indigo-300' },
  { key: 'audio', label: 'AI Audio', icon: AudioWaveform, tone: 'text-emerald-300' },
  { key: 'automation', label: 'AI Automation', icon: Workflow, tone: 'text-teal-300' },
  { key: 'business', label: 'AI Business Tools', icon: BriefcaseBusiness, tone: 'text-blue-300' },
];

const TOOLS = [
  { name: 'GPT-Class Models', category: 'models', vendor: 'PalladiumAI', rating: 4.9, pricing: 'Pay per use', desc: 'Frontier reasoning models with tool use and vision.' },
  { name: 'Open Code Models', category: 'models', vendor: 'Community', rating: 4.7, pricing: 'Free', desc: 'Open-weight models you can self-host or run managed.' },
  { name: 'Vision Models', category: 'models', vendor: 'PalladiumAI', rating: 4.8, pricing: 'Pay per use', desc: 'Multimodal models that understand images and documents.' },
  { name: 'Research Agent', category: 'agents', vendor: 'PalladiumAI', rating: 4.9, pricing: 'Included', desc: 'Autonomous web research with cited briefs.' },
  { name: 'Sales Agent', category: 'agents', vendor: 'PalladiumAI', rating: 4.7, pricing: 'Included', desc: 'Qualifies leads, enriches CRM and books meetings.' },
  { name: 'Support Agent', category: 'agents', vendor: 'PalladiumAI', rating: 4.8, pricing: 'Included', desc: 'Answers tickets 24/7 and escalates when unsure.' },
  { name: 'AI Pair Programmer', category: 'coding', vendor: 'PalladiumAI', rating: 4.9, pricing: 'Included', desc: 'Writes, reviews and refactors code in your repo.' },
  { name: 'Code Explorer', category: 'coding', vendor: 'PalladiumAI', rating: 4.6, pricing: 'Included', desc: 'Navigate and query any codebase with natural language.' },
  { name: 'Test Generator', category: 'coding', vendor: 'Community', rating: 4.5, pricing: 'Free', desc: 'Generates and runs test suites from your code.' },
  { name: 'Market Scanner', category: 'research', vendor: 'PalladiumAI', rating: 4.8, pricing: 'Included', desc: 'Tracks competitors, news and market signals.' },
  { name: 'Literature Review', category: 'research', vendor: 'PalladiumAI', rating: 4.7, pricing: 'Included', desc: 'Summarises papers and builds citation graphs.' },
  { name: 'Web Research', category: 'research', vendor: 'PalladiumAI', rating: 4.9, pricing: 'Included', desc: 'Live web search with synthesised, sourced answers.' },
  { name: 'Copy Studio', category: 'writing', vendor: 'PalladiumAI', rating: 4.7, pricing: 'Included', desc: 'Brand-voice copy for landing pages, ads and email.' },
  { name: 'Docs Writer', category: 'writing', vendor: 'PalladiumAI', rating: 4.6, pricing: 'Included', desc: 'Drafts and maintains product and API docs.' },
  { name: 'Prompt Library', category: 'writing', vendor: 'Community', rating: 4.5, pricing: 'Free', desc: 'Curated, reusable prompt templates.' },
  { name: 'Image Generator', category: 'images', vendor: 'PalladiumAI', rating: 4.8, pricing: 'Pay per use', desc: 'High-fidelity image generation with style control.' },
  { name: 'Brand Assets', category: 'images', vendor: 'PalladiumAI', rating: 4.6, pricing: 'Included', desc: 'Logos, icons and visuals on brand.' },
  { name: 'Photo Editor', category: 'images', vendor: 'Community', rating: 4.4, pricing: 'Free', desc: 'AI retouch, background removal and upscaling.' },
  { name: 'Video Studio', category: 'video', vendor: 'PalladiumAI', rating: 4.7, pricing: 'Pay per use', desc: 'Generate short videos from a prompt.' },
  { name: 'Avatar Presenter', category: 'video', vendor: 'PalladiumAI', rating: 4.5, pricing: 'Pay per use', desc: 'AI presenters that narrate your script.' },
  { name: 'Voice Generator', category: 'audio', vendor: 'PalladiumAI', rating: 4.8, pricing: 'Pay per use', desc: 'Natural multilingual text-to-speech.' },
  { name: 'Meeting Notes', category: 'audio', vendor: 'PalladiumAI', rating: 4.7, pricing: 'Included', desc: 'Transcribe and summarise any meeting.' },
  { name: 'Workflow Builder', category: 'automation', vendor: 'PalladiumAI', rating: 4.9, pricing: 'Included', desc: 'Visual builder for autonomous, multi-step workflows.' },
  { name: 'Triggers & Schedules', category: 'automation', vendor: 'PalladiumAI', rating: 4.6, pricing: 'Included', desc: 'Run workflows on events, schedules or webhooks.' },
  { name: 'CRM Copilot', category: 'business', vendor: 'PalladiumAI', rating: 4.8, pricing: 'Included', desc: 'AI-powered CRM with enrichment and forecasting.' },
  { name: 'Finance Assistant', category: 'business', vendor: 'PalladiumAI', rating: 4.7, pricing: 'Included', desc: 'Invoices, cashflow and anomaly detection.' },
  { name: 'Marketing Suite', category: 'business', vendor: 'PalladiumAI', rating: 4.6, pricing: 'Included', desc: 'Campaigns, scheduling and analytics in one place.' },
];

const CAT_TONE = {
  models: 'text-cyan-300', agents: 'text-violet-300', coding: 'text-amber-300',
  research: 'text-sky-300', writing: 'text-fuchsia-300', images: 'text-rose-300',
  video: 'text-indigo-300', audio: 'text-emerald-300', automation: 'text-teal-300', business: 'text-blue-300',
};

function ToolCard({ tool }) {
  const cat = CATEGORIES.find((c) => c.key === tool.category);
  const tone = CAT_TONE[tool.category];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20 hover:bg-white/[.04]"
    >
      <div className="flex items-start justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${tone}`}>
          {cat && <cat.icon className="h-5 w-5" />}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/[.04] px-2 py-0.5 text-[11px] text-zinc-300">
          <Star className="h-3 w-3 text-amber-400" /> {tool.rating}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{tool.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{tool.desc}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="rounded-full border border-white/10 px-2 py-0.5">{tool.vendor}</span>
          <span>{tool.pricing}</span>
        </div>
        <span className="flex items-center gap-1 text-[12px] font-medium text-zinc-500 transition group-hover:text-white">
          Explore <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.div>
  );
}

export default function ToolsDirectory() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      const matchCat = active === 'all' || t.category === active;
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.vendor.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, active]);

  const count = (key) => (key === 'all' ? TOOLS.length : TOOLS.filter((t) => t.category === key).length);

  return (
    <div className="mx-auto max-w-7xl px-6">
      {/* Search */}
      <div className="relative mx-auto max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search AI tools, vendors and capabilities…"
          className="w-full rounded-xl border border-white/10 bg-white/[.03] py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none"
        />
      </div>

      {/* Category pills */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c) => {
          const isActive = active === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${
                isActive ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'
              }`}
            >
              <c.icon className={`h-3.5 w-3.5 ${isActive ? 'text-violet-300' : c.tone}`} />
              {c.label}
              <span className="text-[10px] text-zinc-600">{count(c.key)}</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p className="mt-6 text-center text-xs text-zinc-500">
        {filtered.length} tool{filtered.length === 1 ? '' : 's'} {active !== 'all' && `in ${CATEGORIES.find((c) => c.key === active)?.label}`}{query && ` matching "${query}"`}
      </p>

      {/* Grid */}
      <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((t) => <ToolCard key={t.name} tool={t} />)}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <div className="mt-10 text-center text-sm text-zinc-500">No tools found. Try a different search or category.</div>
      )}
    </div>
  );
}
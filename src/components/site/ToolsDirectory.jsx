import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AudioWaveform,
  Bot,
  BriefcaseBusiness,
  Code2,
  Cpu,
  ImageIcon,
  PenLine,
  Search,
  Search as SearchIcon,
  Sparkles,
  Video,
  Workflow,
  ArrowUpRight,
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
  { name: 'Model Hub', category: 'models', route: '/models', desc: 'Inspect and route supported model providers through Blackstar.' },
  { name: 'AI Model Hub', category: 'models', route: '/ai-model-hub', desc: 'Work with Blackstar model inventory and provider-backed model surfaces.' },
  { name: 'AI Agents', category: 'agents', route: '/agents', desc: 'Create and operate governed AI agents using the existing runtime.' },
  { name: 'Agent Builder', category: 'agents', route: '/agent-builder', desc: 'Configure agent objectives, capabilities and runtime settings.' },
  { name: 'Code Explorer', category: 'coding', route: '/code-explorer', desc: 'Inspect and reason across project code with Blackstar tooling.' },
  { name: 'Developer Workspace', category: 'coding', route: '/developer-workspace', desc: 'Use repository, developer and integration tooling in one workspace.' },
  { name: 'Research', category: 'research', route: '/research', desc: 'Run research workflows using connected web and knowledge capabilities.' },
  { name: 'News Research', category: 'research', route: '/news-research', desc: 'Review current research and news signals through the research surface.' },
  { name: 'Knowledge', category: 'writing', route: '/knowledge', desc: 'Work with saved knowledge and context used by Blackstar agents.' },
  { name: 'Prompts', category: 'writing', route: '/prompts', desc: 'Create and reuse prompt assets inside the governed workspace.' },
  { name: 'Media Studio', category: 'images', route: '/media-studio', desc: 'Use connected media-generation workflows and assets.' },
  { name: 'Cinema Studio', category: 'video', route: '/cinema-studio', desc: 'Plan and render long-form video through the Blackstar cinema pipeline.' },
  { name: 'Trusted Social Video', category: 'video', route: '/trusted-social-video', desc: 'Create social video through the existing trusted video workflow.' },
  { name: 'Voice Studio', category: 'audio', route: '/voice-studio', desc: 'Use Blackstar voice-generation and audio workflows.' },
  { name: 'Workflow Builder', category: 'automation', route: '/workflows', desc: 'Build durable multi-step workflows and inspect their run state.' },
  { name: 'Automation', category: 'automation', route: '/automation', desc: 'Create governed automations using existing workflow and approval rails.' },
  { name: 'CRM', category: 'business', route: '/crm', desc: 'Work with customer records and connected business operations.' },
  { name: 'Finance', category: 'business', route: '/finance', desc: 'Use Blackstar finance tools, research and planning surfaces.' },
  { name: 'Marketing', category: 'business', route: '/marketing', desc: 'Plan and operate marketing work through connected Blackstar tools.' },
  { name: 'Website Studio', category: 'business', route: '/website-studio', desc: 'Design and build websites inside the existing Blackstar builder.' },
];

const CAT_TONE = {
  models: 'text-cyan-300',
  agents: 'text-violet-300',
  coding: 'text-amber-300',
  research: 'text-sky-300',
  writing: 'text-fuchsia-300',
  images: 'text-rose-300',
  video: 'text-indigo-300',
  audio: 'text-emerald-300',
  automation: 'text-teal-300',
  business: 'text-blue-300',
};

function ToolCard({ tool }) {
  const cat = CATEGORIES.find((item) => item.key === tool.category);
  const tone = CAT_TONE[tool.category];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20 hover:bg-white/[.04]"
    >
      <span className={`grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${tone}`}>
        {cat && <cat.icon className="h-5 w-5" />}
      </span>
      <h3 className="mt-3 text-base font-semibold text-white">{tool.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{tool.desc}</p>
      <Link
        to={`/register?returnTo=${tool.route}`}
        className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-violet-200 transition hover:text-white"
      >
        Open in Blackstar <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </motion.article>
  );
}

export default function ToolsDirectory() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const matchesCategory = active === 'all' || tool.category === active;
      const matchesQuery = !q || tool.name.toLowerCase().includes(q) || tool.desc.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, active]);

  const count = (key) => (key === 'all' ? TOOLS.length : TOOLS.filter((tool) => tool.category === key).length);

  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="relative mx-auto max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Blackstar capabilities…"
          className="w-full rounded-xl border border-white/10 bg-white/[.03] py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none"
        />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((category) => {
          const isActive = active === category.key;
          return (
            <button
              key={category.key}
              onClick={() => setActive(category.key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${isActive ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'}`}
            >
              <category.icon className={`h-3.5 w-3.5 ${isActive ? 'text-violet-300' : category.tone}`} />
              {category.label}
              <span className="text-[10px] text-zinc-600">{count(category.key)}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-zinc-500">
        {filtered.length} capability{filtered.length === 1 ? '' : 'ies'}
        {active !== 'all' && ` in ${CATEGORIES.find((category) => category.key === active)?.label}`}
        {query && ` matching "${query}"`}
      </p>

      <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((tool) => <ToolCard key={tool.name} tool={tool} />)}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <div className="mt-10 text-center text-sm text-zinc-500">No capabilities found. Try a different search or category.</div>
      )}
    </div>
  );
}

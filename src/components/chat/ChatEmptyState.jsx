import { Sparkles, FileText, FolderKanban, Bot, ArrowRight } from 'lucide-react';
import { SUGGESTED_PROMPTS, RECENT_FILES, PROJECTS, AGENTS } from './chatData';

export default function ChatEmptyState({ onPrompt }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
      <div className="relative">
        <div className="absolute -inset-8 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_40px_rgba(139,92,246,.4)]">
          <Sparkles className="h-9 w-9 text-white" />
        </div>
      </div>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-white">Welcome to PalladiumAI</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">Your AI operating system. Ask anything, build agents, automate work, and ship faster — all from one workspace.</p>

      <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((p, i) => {
          const Icon = p.icon;
          return (
            <button key={i} onClick={() => onPrompt?.(p.title)} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.02] p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400/30">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{p.title}</p>
                <p className="text-xs text-zinc-500">{p.sub}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-left">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500"><FileText className="h-3 w-3" />Recent files</p>
          <div className="space-y-1.5">{RECENT_FILES.slice(0, 3).map(f => <p key={f.id} className="truncate text-xs text-zinc-300">{f.name}</p>)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-left">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500"><FolderKanban className="h-3 w-3" />Recent projects</p>
          <div className="space-y-1.5">{PROJECTS.map(p => <p key={p.id} className="truncate text-xs text-zinc-300">{p.name}</p>)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-left">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500"><Bot className="h-3 w-3" />Suggested agents</p>
          <div className="space-y-1.5">{AGENTS.map(a => <p key={a.id} className="truncate text-xs text-zinc-300">{a.name}</p>)}</div>
        </div>
      </div>
    </div>
  );
}
import { ArrowRight, Bot, ListChecks, Sparkles, Workflow } from 'lucide-react';

const STARTERS = [
  { icon: Bot, title: 'Help me plan an AI agent', sub: 'Turn a job to be done into an agent plan.' },
  { icon: Workflow, title: 'Design a workflow for my task', sub: 'Break a process into safe automation steps.' },
  { icon: ListChecks, title: 'Help me prioritise my work', sub: 'Create a practical next-action plan.' },
  { icon: Sparkles, title: 'What can PalladiumAI help me with?', sub: 'Explore the live workspace assistant.' },
];

export default function ChatEmptyState({ onPrompt }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
      <div className="relative">
        <div className="absolute -inset-8 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_40px_rgba(139,92,246,.4)]">
          <Sparkles className="h-9 w-9 text-white" />
        </div>
      </div>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-white">Live workspace assistant</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">
        Ask a question and PalladiumAI will call the server-configured AI provider. If no provider is configured or the provider fails, you’ll see an error instead of a simulated answer.
      </p>

      <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {STARTERS.map(({ icon: Icon, title, sub }) => (
          <button key={title} onClick={() => onPrompt?.(title)} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.02] p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400/30">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{title}</p>
              <p className="text-xs text-zinc-500">{sub}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
          </button>
        ))}
      </div>

      <p className="mt-7 max-w-xl text-[11px] leading-5 text-zinc-600">
        Conversation history on this screen is currently kept only for this browser session. Persistent chat history will not be implied until a real conversation store is connected.
      </p>
    </div>
  );
}

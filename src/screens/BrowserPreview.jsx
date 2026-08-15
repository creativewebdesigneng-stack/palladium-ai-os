import { useNavigate } from 'react-router-dom';
import { Camera, Code2, Globe2, Network, ShieldCheck, TerminalSquare } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const REQUIRED = [
  {
    icon: Globe2,
    title: 'Isolated browser sessions',
    text: 'Create a server-managed browser/session sandbox with explicit URL allowlists, timeouts and per-workspace ownership.',
  },
  {
    icon: Network,
    title: 'Live page telemetry',
    text: 'Collect console, network and page-error events from the real browser session instead of rendering fixture requests and logs.',
  },
  {
    icon: Camera,
    title: 'Persisted screenshots',
    text: 'Store screenshots through the authenticated Files backend and return the real document id rather than showing a success toast only.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe AI debugging',
    text: 'AI fixes must be generated against an explicitly connected repository and require a reviewed patch before any source mutation.',
  },
];

export default function BrowserPreview() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Browser Preview"
        description="Live browser sessions are not connected yet. Simulated navigation, console, network, screenshot and AI-debug actions have been removed."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]">
            <Globe2 className="h-5 w-5 text-violet-300" />
          </div>
          <h2 className="text-xl font-semibold text-white">Browser runtime required</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            The previous preview used a local sample URL history plus presentation-only console, network and error data. Its screenshot and AI-debug buttons also reported successful actions without storing a screenshot or creating a repository patch. Those controls are disabled until PalladiumAI has a real browser-session backend.
          </p>

          <div className="mt-6 space-y-3">
            {REQUIRED.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[.04] text-zinc-300"><Icon className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <h3 className="text-sm font-semibold text-white">Available foundations</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">These existing live areas will support the browser feature once the runtime is connected.</p>
          <div className="mt-5 space-y-2.5">
            <button onClick={() => navigate('/files')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><Camera className="h-4 w-4 text-violet-300" />Files</span>
              <span className="mt-1 block text-[11px] text-zinc-500">Authenticated private storage already exists for future screenshots and captured artifacts.</span>
            </button>
            <button onClick={() => navigate('/code-explorer')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><Code2 className="h-4 w-4 text-violet-300" />Code Explorer</span>
              <span className="mt-1 block text-[11px] text-zinc-500">Repository access is intentionally disabled until a real source-control provider is connected.</span>
            </button>
            <button onClick={() => navigate('/terminal')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><TerminalSquare className="h-4 w-4 text-violet-300" />Terminal</span>
              <span className="mt-1 block text-[11px] text-zinc-500">Command execution remains disabled until an isolated audited runner is available.</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

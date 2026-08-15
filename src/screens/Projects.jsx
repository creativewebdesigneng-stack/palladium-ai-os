import { useNavigate } from 'react-router-dom';
import { Bot, Database, GitBranch, Layers3, Workflow } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const REQUIREMENTS = [
  'Persist projects, ownership, membership and lifecycle state in the database.',
  'Link agents, workflows, files and missions to a project with owner-scoped policies.',
  'Record project activity/version events from real backend actions instead of UI fixtures.',
  'Connect deployment status only after a deployment provider/webhook integration exists.',
];

export default function Projects() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Project tracking is not connected to a persistent backend yet. No simulated projects are shown."
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]">
            <Layers3 className="h-5 w-5 text-violet-300" />
          </div>
          <h2 className="text-xl font-semibold text-white">Project persistence is not connected</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            The previous project cards, folders, kanban board, timeline, activity, collaboration, version history and deployment records were presentation-only fixtures. They have been removed so this workspace does not present invented operational state as live data.
          </p>

          <div className="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[.05] p-4">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-medium text-amber-100">Backend work required before this can be enabled</p>
                <div className="mt-3 space-y-2">
                  {REQUIREMENTS.map((item) => (
                    <div key={item} className="flex gap-2 text-xs leading-5 text-amber-100/70">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-300/70" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <h3 className="text-sm font-semibold text-white">Use live workspaces instead</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">These areas are already backed by persisted application data.</p>

          <div className="mt-5 space-y-2.5">
            <button onClick={() => navigate('/workflows')} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:bg-white/[.04]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-400/[.08] text-violet-300"><Workflow className="h-4 w-4" /></span>
              <span><span className="block text-sm font-medium text-white">Workflows</span><span className="text-[11px] text-zinc-500">Build and run persisted automations.</span></span>
            </button>
            <button onClick={() => navigate('/agents')} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:bg-white/[.04]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/[.08] text-sky-300"><Bot className="h-4 w-4" /></span>
              <span><span className="block text-sm font-medium text-white">AI Agents</span><span className="text-[11px] text-zinc-500">Manage real personal agents and runtime state.</span></span>
            </button>
            <button onClick={() => navigate('/version-control')} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:bg-white/[.04]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/[.08] text-emerald-300"><GitBranch className="h-4 w-4" /></span>
              <span><span className="block text-sm font-medium text-white">Version Control</span><span className="text-[11px] text-zinc-500">Use the existing source-control workspace.</span></span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

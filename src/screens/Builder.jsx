import { Bot, Code2, Database, GitBranch, LockKeyhole, Rocket, Workflow } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';

export default function Builder() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-30"><NeuralNetworkBackground intensity="low" /></div>
      <PageHeader
        eyebrow="Build"
        title="AI App Builder"
        description="App generation is not enabled until PalladiumAI has a real repository, sandbox and deployment pipeline behind this workspace."
      />

      <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-amber-100">Builder backend not configured</p>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-amber-100/70">
              The previous builder showed sample source files, build stages, logs, previews, database/API designs and deployment actions without creating an application. Those simulations are disabled. PalladiumAI will only show build progress when a real job and repository state exist.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StateCard icon={Bot} title="AI planning" value="Not wired" text="No build plan is generated or persisted yet." />
        <StateCard icon={Code2} title="Source generation" value="Unavailable" text="No repository is created or modified by Builder." />
        <StateCard icon={Workflow} title="Build pipeline" value="Unavailable" text="No fake stages, activity or build logs are shown." />
        <StateCard icon={Rocket} title="Deployment" value="Unavailable" text="Deploy is disabled until a real deployment provider exists." />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Production builder flow" icon={Workflow}>
          <ol className="space-y-2 text-xs leading-5 text-zinc-400">
            <li>1. Save a build request and plan as a durable workspace job.</li>
            <li>2. Create or select an authenticated repository and protected working branch.</li>
            <li>3. Run generation and tests inside an isolated execution environment.</li>
            <li>4. Persist exact source changes and display a reviewable diff.</li>
            <li>5. Require approval before commit, pull request or deployment where policy demands it.</li>
          </ol>
        </Panel>
        <Panel title="Backend capabilities still required" icon={GitBranch}>
          <div className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
            <Requirement icon={GitBranch} text="Git provider connection" />
            <Requirement icon={Code2} text="Sandboxed code runner" />
            <Requirement icon={Database} text="Migration/schema execution" />
            <Requirement icon={Rocket} text="Deployment provider" />
            <Requirement icon={Workflow} text="Durable build queue" />
            <Requirement icon={LockKeyhole} text="Approval & audit policy" />
          </div>
        </Panel>
      </div>
    </>
  );
}

function StateCard({ icon: Icon, title, value, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-zinc-600">{title}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">{title}</h2></div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Requirement({ icon: Icon, text }) {
  return <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><Icon className="h-3.5 w-3.5 shrink-0 text-violet-300" /><span>{text}</span></div>;
}

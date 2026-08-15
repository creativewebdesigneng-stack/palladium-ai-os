import { ExternalLink, GitBranch, Globe2, Rocket, ShieldCheck, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function Deployments() {
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Deployments" description="Deployment management will appear here once a real deployment provider is connected." />

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.05] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Rocket className="h-5 w-5" /></span>
          <div>
            <h2 className="text-sm font-semibold text-white">Deployment tracking is not connected yet</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">PalladiumAI does not currently have a persisted deployment/build/domain backend or a deployment-provider webhook feeding this screen. The previous cards were presentation-only data, so they have been removed rather than presented as real infrastructure state.</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StateCard icon={GitBranch} title="Source repository" status="External" text="Application source is managed outside this screen. No repository status is invented here." />
        <StateCard icon={ShieldCheck} title="Build verification" status="CI only" text="Production build/type/test gates run in repository CI, but this page has no runtime CI API connection yet." />
        <StateCard icon={Globe2} title="Custom domains" status="Not connected" text="Domain records and DNS verification need a real deployment-provider integration before they can be managed here." />
        <StateCard icon={Wrench} title="Rollback / promote" status="Not connected" text="Rollback and environment promotion actions stay disabled until they can call a real provider API safely." />
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-sm font-semibold text-white">What will make this page live</h2>
        <p className="mt-1 text-xs text-zinc-500">A production deployment integration should write signed provider events into PalladiumAI instead of relying on browser-side samples.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <Step title="1. Deployment provider connection" text="Store provider credentials server-side and scope them to the organisation/project." />
          <Step title="2. Signed webhook ingestion" text="Persist real deployment, build, environment and domain events after signature verification." />
          <Step title="3. Safe deployment actions" text="Add explicit permission/approval gates for promote, rollback, redeploy and domain mutations." />
          <Step title="4. Operational history" text="Render this screen from those persisted rows with honest empty/error states and audit logs." />
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-600"><ExternalLink className="h-3.5 w-3.5" />Until that integration exists, use your deployment provider directly for live infrastructure state.</p>
      </section>
    </>
  );
}

function StateCard({ icon: Icon, title, status, text }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><p className="text-sm font-medium text-white">{title}</p></div><span className="mt-3 inline-flex rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] text-zinc-400">{status}</span><p className="mt-2 text-[11px] leading-5 text-zinc-500">{text}</p></div>;
}

function Step({ title, text }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs font-medium text-zinc-200">{title}</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">{text}</p></div>;
}

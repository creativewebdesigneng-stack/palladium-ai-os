import { AppWindow, Bot, Boxes, Cpu, Network, Workflow } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { createPalladiumAiHubRegistry } from '@/lib/ai-hub';

const icons = {
  'model-gateway': Cpu,
  'agent-runtime': Bot,
  mcp: Network,
  skills: Boxes,
  workflows: Workflow,
  'app-studio': AppWindow,
};

export default function AIHub() {
  const providers = createPalladiumAiHubRegistry().listProviders();

  return (
    <>
      <PageHeader
        eyebrow="Universal AI Hub"
        title="Palladium AI Hub"
        description="One control surface for the AI capabilities Palladium can discover, route, govern and execute through its existing runtime systems."
      />
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Native providers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providers.length}</p>
            <p className="mt-2 text-sm text-zinc-400">Existing Palladium subsystems registered behind one Hub contract.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Policy boundary</p>
            <p className="mt-2 text-lg font-semibold text-white">Tenant + actor scoped</p>
            <p className="mt-2 text-sm text-zinc-400">Execution stays behind Palladium approvals, identity and runtime policy.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Routing</p>
            <p className="mt-2 text-lg font-semibold text-white">Capability-aware</p>
            <p className="mt-2 text-sm text-zinc-400">Workloads can be matched by capability, deployment target and region.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Connected Palladium systems</h2>
            <p className="mt-1 text-sm text-zinc-400">This is the canonical Hub registry, not a duplicate model, agent, MCP, workflow or app catalogue.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => {
              const Icon = icons[provider.adapter] ?? Boxes;
              return (
                <div key={provider.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]">
                      <Icon className="h-4 w-4 text-violet-300" />
                    </div>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-2 py-1 text-[11px] font-medium text-emerald-300">
                      {provider.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">{provider.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500">Adapter: {provider.adapter}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {provider.capabilityKinds.map((kind) => (
                      <span key={kind} className="rounded-md border border-white/10 bg-white/[.03] px-2 py-1 text-[11px] text-zinc-300">{kind}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">Deploy: {provider.deploymentTargets.join(', ')}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

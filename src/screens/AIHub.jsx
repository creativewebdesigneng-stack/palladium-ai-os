import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AppWindow, Bot, Boxes, Cpu, Network, Search, Workflow, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { Failed, Loading } from '@/components/business/live';
import { friendlyMessage } from '@/lib/errors';
import { createPalladiumAiHubRegistry } from '@/lib/ai-hub';
import { listAiHubResources } from '@/lib/ai-hub/resources.functions';
import { useSessionReady } from '@/lib/useSessionReady';

const icons = {
  'model-gateway': Cpu,
  'agent-runtime': Bot,
  mcp: Network,
  skills: Boxes,
  workflows: Workflow,
  'app-studio': AppWindow,
};

const resourceIcons = {
  model: Cpu,
  agent: Bot,
  tool: Wrench,
  mcp: Network,
  workflow: Workflow,
};

const FILTERS = [
  ['all', 'All resources'],
  ['model', 'Models'],
  ['agent', 'Agents'],
  ['tool', 'Tools'],
  ['mcp', 'MCP'],
  ['workflow', 'Workflows'],
];

function statusClasses(status) {
  if (status === 'available' || status === 'active' || status === 'enabled') {
    return 'border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300';
  }
  if (status === 'unconfigured' || status === 'paused' || status === 'disabled') {
    return 'border-amber-400/20 bg-amber-400/[.08] text-amber-300';
  }
  return 'border-white/10 bg-white/[.04] text-zinc-400';
}

function ResourceCard({ resource }) {
  const Icon = resourceIcons[resource.kind] ?? Boxes;
  const model = resource.metadata?.model;
  const modelProvider = resource.metadata?.modelProvider;
  const access = resource.metadata?.access;
  const area = resource.metadata?.area;
  const version = resource.metadata?.version;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[.08]">
            <Icon className="h-4 w-4 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{resource.name}</h3>
            <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.12em] text-zinc-500">{resource.kind}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${statusClasses(resource.status)}`}>
          {resource.status}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-xs text-zinc-400">
        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-500">Hub provider</span>
          <span className="truncate text-right text-zinc-300">{resource.providerId}</span>
        </div>
        {(model || modelProvider) && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Model</span>
            <span className="truncate text-right text-zinc-300">
              {[modelProvider, model].filter(Boolean).join(' / ')}
            </span>
          </div>
        )}
        {(area || access) && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">MCP access</span>
            <span className="truncate text-right text-zinc-300">{[area, access].filter(Boolean).join(' / ')}</span>
          </div>
        )}
        {version && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Version</span>
            <span className="truncate text-right text-zinc-300">{version}</span>
          </div>
        )}
      </div>

      {resource.capabilities?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {resource.capabilities.slice(0, 6).map((capability) => (
            <span key={capability} className="rounded-md border border-white/10 bg-white/[.03] px-2 py-1 text-[11px] text-zinc-300">
              {capability}
            </span>
          ))}
          {resource.capabilities.length > 6 && (
            <span className="rounded-md border border-white/10 bg-white/[.03] px-2 py-1 text-[11px] text-zinc-500">
              +{resource.capabilities.length - 6}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIHub() {
  const providers = createPalladiumAiHubRegistry().listProviders();
  const session = useSessionReady();
  const listResources = useServerFn(listAiHubResources);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');

  const inventory = useQuery({
    queryKey: ['ai-hub-live-resources'],
    queryFn: () => listResources({ data: { limit: 100 } }),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 15000,
  });

  const filteredResources = useMemo(() => {
    const resources = inventory.data?.resources ?? [];
    const needle = query.trim().toLowerCase();

    return resources.filter((resource) => {
      if (kind !== 'all' && resource.kind !== kind) return false;
      if (!needle) return true;

      const searchable = [
        resource.name,
        resource.kind,
        resource.status,
        resource.providerId,
        resource.metadata?.model,
        resource.metadata?.modelProvider,
        resource.metadata?.integrations,
        resource.metadata?.area,
        resource.metadata?.access,
        resource.metadata?.description,
        resource.metadata?.auth,
        resource.metadata?.server,
        resource.metadata?.slug,
        ...(resource.capabilities ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(needle);
    });
  }, [inventory.data?.resources, kind, query]);

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
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Live resources</p>
            <p className="mt-2 text-3xl font-semibold text-white">{inventory.data?.counts.total ?? '—'}</p>
            <p className="mt-2 text-sm text-zinc-400">Runtime models, native and connected MCP capabilities, tenant-visible agents and workflows from their authoritative systems.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Routing + policy</p>
            <p className="mt-2 text-lg font-semibold text-white">Capability-aware</p>
            <p className="mt-2 text-sm text-zinc-400">Discovery remains actor scoped and execution stays behind Palladium approvals and runtime policy.</p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Live Hub inventory</h2>
              <p className="mt-1 text-sm text-zinc-400">Authenticated resources discovered through the canonical Hub boundary. Model Gateway, Agent Runtime, MCP Runtime and Workflows remain the systems of record.</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search resources, models or tools…"
                className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  kind === value
                    ? 'border-violet-400/30 bg-violet-400/10 text-violet-200'
                    : 'border-white/10 bg-white/[.025] text-zinc-400 hover:bg-white/[.05] hover:text-zinc-200'
                }`}
              >
                {label}
                {value === 'model' && inventory.data ? ` (${inventory.data.counts.models})` : ''}
                {value === 'agent' && inventory.data ? ` (${inventory.data.counts.agents})` : ''}
                {value === 'tool' && inventory.data ? ` (${inventory.data.counts.tools})` : ''}
                {value === 'mcp' && inventory.data ? ` (${inventory.data.counts.mcp})` : ''}
                {value === 'workflow' && inventory.data ? ` (${inventory.data.counts.workflows})` : ''}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {session === 'no' && <Failed message="Sign in to inspect your live AI Hub resources." />}
            {session === 'yes' && inventory.isLoading && <Loading label="Loading Hub resources…" />}
            {inventory.isError && <Failed message={friendlyMessage(inventory.error)} onRetry={() => inventory.refetch()} />}
            {inventory.isSuccess && filteredResources.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredResources.map((resource) => <ResourceCard key={`${resource.kind}:${resource.id}`} resource={resource} />)}
              </div>
            )}
            {inventory.isSuccess && filteredResources.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-zinc-500">
                {inventory.data.resources.length === 0
                  ? 'No Hub resources are available yet.'
                  : 'No resources match the current search and filter.'}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
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
                    {provider.capabilityKinds.map((capabilityKind) => (
                      <span key={capabilityKind} className="rounded-md border border-white/10 bg-white/[.03] px-2 py-1 text-[11px] text-zinc-300">{capabilityKind}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">Deploy: {provider.deploymentTargets.join(', ')}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, Cpu, KeyRound, Loader2, Search, Server, ShieldCheck, XCircle } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import BlackstarAstraActivationPanel from '@/components/models/BlackstarAstraActivationPanel';
import DeepSeekRuntimePanel from '@/components/models/DeepSeekRuntimePanel';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { getModelRuntimeOverview } from '@/lib/runtime/model-management.functions';

function moneyFromPence(value) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value ?? 0) / 100);
}

export default function Models() {
  const { session } = useWorkspace();
  const overviewFn = useServerFn(getModelRuntimeOverview);
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');

  const q = useQuery({
    queryKey: ['model-runtime-overview'],
    queryFn: () => overviewFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 30_000,
  });

  const providers = q.data?.providers ?? [];
  const assignments = q.data?.assignments ?? [];
  const usage = q.data?.usage ?? [];
  const astra = q.data?.astra ?? null;
  const totals = q.data?.totals ?? { agents: 0, activeAgents: 0, recentRuns: 0, recentCostPence: 0, configuredProviders: 0 };
  const providerById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);

  const filteredAssignments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assignments.filter((agent) => {
      if (providerFilter !== 'all' && agent.provider !== providerFilter) return false;
      if (!needle) return true;
      return [agent.name, agent.provider, agent.model].some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [assignments, providerFilter, query]);

  const headerAction = (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" />Credentials stay server-side</span>
      <Link to="/agents/new" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white"><Bot className="h-4 w-4" />Create agent</Link>
    </div>
  );

  if (session !== 'yes' || q.isLoading) {
    return (<><PageHeader eyebrow="AI" title="Runtime Models" description="Providers and models actually used by your Blackstar agents." action={headerAction} />
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading runtime model state…</div></>);
  }

  if (q.error) {
    return (<><PageHeader eyebrow="AI" title="Runtime Models" description="Providers and models actually used by your Blackstar agents." action={headerAction} />
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.05] p-6 text-sm text-rose-200">{friendlyMessage(q.error)}</div></>);
  }

  return (
    <>
      <PageHeader eyebrow="AI" title="Runtime Models" description="Live provider configuration, agent model assignments and recent execution telemetry. No demo catalogue or synthetic benchmarks." action={headerAction} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Server} label="Configured providers" value={`${totals.configuredProviders}/${providers.length}`} />
        <Metric icon={Bot} label="Assigned agents" value={totals.agents} />
        <Metric icon={Cpu} label="Recent runs" value={totals.recentRuns} />
        <Metric icon={KeyRound} label="Recent model cost" value={moneyFromPence(totals.recentCostPence)} />
      </div>

      <BlackstarAstraActivationPanel readiness={astra} />
      <DeepSeekRuntimePanel configured={Boolean(providerById.get('deepseek')?.configured)} />

      <section className="mb-6">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-white">Server providers</h2>
          <p className="mt-1 text-[11px] text-zinc-500">Configuration status comes from server environment variables. Secret values are never returned to the browser.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {providers.map((provider) => (
            <article key={provider.id} className={`rounded-2xl border p-4 ${provider.configured ? 'border-emerald-400/20 bg-emerald-400/[.04]' : 'border-white/10 bg-white/[.03]'}`}>
              <div className="flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-xl ${provider.configured ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-zinc-500'}`}><Server className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{provider.name}</p><p className="text-[10px] text-zinc-500">{provider.id}</p></div>
                {provider.configured ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-zinc-600" />}
              </div>
              <p className="mt-3 text-[11px] text-zinc-400">Runtime default</p>
              <code className="mt-1 block truncate rounded-lg bg-black/30 px-2 py-1.5 text-[11px] text-violet-200">{provider.defaultModel}</code>
              {provider.integrations?.length ? <p className="mt-2 text-[10px] text-zinc-400">Compatible integrations: <span className="text-violet-200">{provider.integrations.join(' · ')}</span></p> : null}
              {provider.routingNote ? <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">{provider.routingNote}</p> : null}
              <p className={`mt-2 text-[10px] font-medium ${provider.configured ? 'text-emerald-300' : 'text-zinc-500'}`}>{provider.configured ? 'Configured for runtime' : 'Not configured on this deployment'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div><h2 className="text-sm font-semibold text-white">Agent assignments</h2><p className="mt-1 text-[11px] text-zinc-500">Model/provider values persisted on your real agent records.</p></div>
          <div className="ml-auto flex flex-wrap gap-2">
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 outline-none">
              <option value="all">All providers</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents or models" className="rounded-xl border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-xs text-white outline-none placeholder:text-zinc-600" />
            </div>
          </div>
        </div>

        {filteredAssignments.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-zinc-600"><tr><th className="pb-2 font-medium">Agent</th><th className="pb-2 font-medium">Provider</th><th className="pb-2 font-medium">Model</th><th className="pb-2 font-medium">Runtime</th><th className="pb-2 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {filteredAssignments.map((agent) => {
                  const provider = providerById.get(agent.provider);
                  return <tr key={agent.id}><td className="py-2.5 pr-3 font-medium text-white">{agent.name}</td><td className="py-2.5 pr-3 text-zinc-300">{provider?.name ?? agent.provider}</td><td className="py-2.5 pr-3"><code className="text-violet-200">{agent.model || provider?.defaultModel || 'Runtime default'}</code></td><td className="py-2.5 pr-3">{provider?.configured ? <span className="text-emerald-300">Ready</span> : <span className="text-amber-300">Provider not configured</span>}</td><td className="py-2.5 text-zinc-400">{agent.status}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No agent model assignments match this filter.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-sm font-semibold text-white">Recent model usage</h2>
        <p className="mt-1 text-[11px] text-zinc-500">Aggregated from up to the 500 most recent persisted agent task rows.</p>
        {usage.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-zinc-600"><tr><th className="pb-2 font-medium">Provider / model</th><th className="pb-2 font-medium">Runs</th><th className="pb-2 font-medium">Succeeded</th><th className="pb-2 font-medium">Failed</th><th className="pb-2 font-medium">Tokens</th><th className="pb-2 font-medium">Cost</th><th className="pb-2 font-medium">Last used</th></tr></thead>
              <tbody className="divide-y divide-white/5">{usage.map((row) => <tr key={`${row.provider}:${row.model}`}><td className="py-2.5 pr-3"><p className="text-zinc-300">{row.provider}</p><code className="text-[11px] text-violet-200">{row.model}</code></td><td className="py-2.5 pr-3 text-zinc-200">{row.runs}</td><td className="py-2.5 pr-3 text-emerald-300">{row.succeeded}</td><td className="py-2.5 pr-3 text-rose-300">{row.failed}</td><td className="py-2.5 pr-3 text-zinc-400">{(row.tokensIn + row.tokensOut).toLocaleString()}</td><td className="py-2.5 pr-3 text-zinc-300">{moneyFromPence(row.costPence)}</td><td className="py-2.5 text-zinc-500">{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString('en-GB') : '—'}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No model execution telemetry yet. Run an agent and its real provider/model usage will appear here.</p>}
      </section>
    </>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-1.5 text-zinc-500"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wide">{label}</span></div><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>;
}

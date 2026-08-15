import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Github,
  LockKeyhole,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  Unplug,
  Wrench,
} from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import {
  disconnectIntegration,
  listIntegrations,
  startIntegrationOAuth,
} from '@/lib/integrations/integrations.functions';
import {
  getGitHubConnection,
  startGitHubConnection,
} from '@/lib/integrations/github.functions';

const CATEGORY_LABELS = {
  productivity: 'Productivity',
  communication: 'Communication',
  crm: 'CRM',
  project_management: 'Project management',
  developer: 'Developer tools',
};

function connectionHealthy(provider) {
  if (provider.nativeGitHub) return provider.connection?.status === 'connected';
  if (provider.connection?.health) return provider.connection.health.healthy === true;
  return provider.connection?.status === 'connected';
}

export default function Integrations() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [catalogue, setCatalogue] = useState([]);
  const [github, setGithub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [integrationResult, githubResult] = await Promise.all([
        listIntegrations(),
        getGitHubConnection(),
      ]);
      setCatalogue(integrationResult.catalogue ?? []);
      setGithub(githubResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load integration state.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const providers = useMemo(() => {
    const githubProvider = {
      id: 'github',
      name: 'GitHub',
      category: 'developer',
      summary: 'Read selected repositories, branches, commits and bounded source files through a scoped GitHub App installation.',
      scopes: ['Metadata: read', 'Contents: read'],
      tools: ['Code Explorer', 'Version Control'],
      configured: Boolean(github?.configured),
      nativeGitHub: true,
      connection: github?.connected ? {
        status: 'connected',
        account_label: github.accountLabel,
        connected_at: github.connectedAt,
        last_error: github.lastError,
      } : github?.lastError ? {
        status: 'error',
        account_label: github.accountLabel,
        connected_at: github.connectedAt,
        last_error: github.lastError,
      } : null,
    };
    return [...catalogue, githubProvider];
  }, [catalogue, github]);

  const categories = useMemo(
    () => Array.from(new Set(providers.map((provider) => provider.category))).sort(),
    [providers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((provider) => {
      if (category !== 'all' && provider.category !== category) return false;
      if (!q) return true;
      return [provider.name, provider.summary, ...(provider.tools ?? []), ...(provider.scopes ?? [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [providers, query, category]);

  const connectedCount = providers.filter(connectionHealthy).length;
  const configuredCount = providers.filter((provider) => provider.configured).length;

  async function connect(provider) {
    setBusyProvider(provider.id);
    setError('');
    try {
      if (provider.nativeGitHub) {
        const result = await startGitHubConnection({ data: { origin: window.location.origin } });
        window.location.assign(result.installUrl);
        return;
      }
      const result = await startIntegrationOAuth({
        data: { provider: provider.id, origin: window.location.origin },
      });
      window.location.assign(result.authorizeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not connect ${provider.name}.`);
      setBusyProvider('');
    }
  }

  async function disconnect(provider) {
    setBusyProvider(provider.id);
    setError('');
    try {
      await disconnectIntegration({ data: { provider: provider.id } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not disconnect ${provider.name}.`);
    } finally {
      setBusyProvider('');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Integrations"
        description="Manage live, server-backed provider connections. Credentials and provider tokens remain server-side and connection health is calculated from persisted OAuth state."
        action={(
          <div className="flex gap-2">
            <button onClick={refresh} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5">
              <RefreshCw className="h-4 w-4" />Refresh
            </button>
            <button onClick={() => navigate('/developer-portal')} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5">
              <BookOpen className="h-4 w-4" />API documentation
            </button>
          </div>
        )}
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/[.06] p-4 text-sm text-red-200">{error}</div>
      )}

      <div className="mb-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.045] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-semibold text-emerald-100">Live connection backend</p>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-zinc-400">
              PalladiumAI checks persisted connection status, granted OAuth permissions and refresh capability. If a provider needs a newly-added permission or can no longer refresh access, the card will ask you to reconnect instead of pretending the connection is healthy.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Live provider adapters" value={providers.length} icon={Wrench} />
        <Metric label="Configured adapters" value={configuredCount} icon={CheckCircle2} />
        <Metric label="Healthy connections" value={connectedCount} icon={Plug} />
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search live integration adapters…"
            className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
          />
        </div>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-xl border border-white/10 bg-[#0b0c12] px-3 py-2.5 text-sm text-zinc-300 outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item] || item}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-zinc-500">Loading persisted integration state…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-zinc-500">No integration adapters match this search.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              busy={busyProvider === provider.id}
              onConnect={() => connect(provider)}
              onDisconnect={() => disconnect(provider)}
              onOpenGitHub={() => navigate('/code-explorer')}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ProviderCard({ provider, busy, onConnect, onDisconnect, onOpenGitHub }) {
  const status = provider.connection?.status ?? 'disconnected';
  const reconnectRequired = provider.connection?.health?.reconnectRequired === true;
  const connected = connectionHealthy(provider);
  const errored = status === 'error';
  const rawConnected = status === 'connected';
  const Icon = provider.nativeGitHub ? Github : Plug;
  const healthReason = provider.connection?.health?.reason;
  const missingScopes = provider.connection?.health?.missingScopes ?? [];

  return (
    <article className="flex min-h-[19rem] flex-col rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-5 w-5" /></span>
        <StatusBadge connected={connected} errored={errored} reconnectRequired={reconnectRequired} configured={provider.configured} />
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">{CATEGORY_LABELS[provider.category] || provider.category}</p>
        <h2 className="mt-1 text-base font-semibold text-white">{provider.name}</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{provider.summary}</p>
      </div>

      {(provider.tools ?? []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {provider.tools.slice(0, 4).map((tool) => <span key={tool} className="rounded-lg bg-white/[.04] px-2 py-1 text-[10px] text-zinc-500">{tool}</span>)}
        </div>
      )}

      <div className="mt-auto pt-5">
        {rawConnected && provider.connection?.account_label && (
          <p className="mb-2 truncate text-[11px] text-emerald-300">Connected as {provider.connection.account_label}</p>
        )}
        {healthReason && reconnectRequired && (
          <p className="mb-2 text-[11px] leading-4 text-amber-300">{healthReason}</p>
        )}
        {missingScopes.length > 0 && (
          <p className="mb-2 text-[10px] leading-4 text-zinc-500">Missing permissions: {missingScopes.join(', ')}</p>
        )}
        {!reconnectRequired && provider.connection?.last_error && (
          <p className="mb-2 line-clamp-2 text-[11px] leading-4 text-red-300">{provider.connection.last_error}</p>
        )}

        {!provider.configured ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[.05] px-3 py-2.5 text-xs text-amber-200/80">
            <LockKeyhole className="h-4 w-4 shrink-0" />Server setup required
          </div>
        ) : connected ? (
          <div className="flex gap-2">
            {provider.nativeGitHub && (
              <button onClick={onOpenGitHub} className="flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5">Open repositories</button>
            )}
            <button disabled={busy} onClick={onDisconnect} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-400/15 px-3 py-2.5 text-xs font-medium text-red-300 hover:bg-red-500/[.06] disabled:opacity-50">
              <Unplug className="h-3.5 w-3.5" />{busy ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        ) : reconnectRequired ? (
          <div className="flex gap-2">
            <button disabled={busy} onClick={onConnect} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50">
              <RefreshCw className="h-3.5 w-3.5" />{busy ? 'Opening provider…' : `Reconnect ${provider.name}`}
            </button>
            {rawConnected && (
              <button disabled={busy} onClick={onDisconnect} className="rounded-xl border border-red-400/15 px-3 py-2.5 text-xs font-medium text-red-300 hover:bg-red-500/[.06] disabled:opacity-50">
                <Unplug className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button disabled={busy} onClick={onConnect} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50">
            <Plug className="h-3.5 w-3.5" />{busy ? 'Opening provider…' : `Connect ${provider.name}`}
          </button>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ connected, errored, reconnectRequired, configured }) {
  if (!configured) return <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300">Setup required</span>;
  if (reconnectRequired) return <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300">Reconnect required</span>;
  if (connected) return <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">Connected</span>;
  if (errored) return <span className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-300">Needs attention</span>;
  return <span className="rounded-lg bg-zinc-500/10 px-2 py-1 text-[10px] font-medium text-zinc-400">Disconnected</span>;
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
      <div><p className="text-lg font-semibold text-white">{value}</p><p className="text-[10px] text-zinc-500">{label}</p></div>
    </div>
  );
}

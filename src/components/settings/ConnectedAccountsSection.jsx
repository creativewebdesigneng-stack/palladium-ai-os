import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link2, Loader2, RefreshCw, Unplug, ExternalLink } from 'lucide-react';
import { Panel } from './shared';
import { useSessionReady } from '@/lib/useSessionReady';
import { listIntegrations, startIntegrationOAuth, disconnectIntegration } from '@/lib/integrations/integrations.functions';
import { friendlyMessage } from '@/lib/errors';

function withConnectionsTimeout(promise, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connected accounts did not respond within 15 seconds.')), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export default function ConnectedAccountsSection() {
  const session = useSessionReady();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listIntegrations);
  const connectFn = useServerFn(startIntegrationOAuth);
  const disconnectFn = useServerFn(disconnectIntegration);

  const query = useQuery({
    queryKey: ['settings-connected-accounts'],
    queryFn: () => withConnectionsTimeout(listFn({ data: {} })),
    enabled: session === 'yes',
    retry: false,
  });

  const connect = useMutation({
    mutationFn: async (provider) => connectFn({ data: { provider, origin: window.location.origin } }),
    onSuccess: (result) => { if (result?.authorizeUrl) window.location.assign(result.authorizeUrl); },
  });
  const disconnect = useMutation({
    mutationFn: (provider) => disconnectFn({ data: { provider } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-connected-accounts'] }),
  });

  const catalogue = query.data?.catalogue ?? [];

  return (
    <Panel icon={Link2} title="Connected Accounts" grad="from-indigo-500 to-violet-500" desc="Connect external services through scoped OAuth authorisation.">
      {session === 'no' ? <p className="text-xs text-zinc-500">Sign in to manage connected accounts.</p> :
        session === 'unknown' || query.isLoading ? <p role="status" className="text-xs text-zinc-500">Loading connected accounts…</p> :
        query.error ? <div role="alert" className="text-xs text-rose-300">{friendlyMessage(query.error)} <button onClick={() => query.refetch()} className="ml-2 underline">Retry</button></div> : (
          <>
            <p className="mb-3 text-[10px] text-zinc-600">Credentials and refresh tokens remain server-side and are never displayed here. Providers without owner-configured OAuth credentials remain unavailable.</p>
            <div className="space-y-2">
              {catalogue.map((provider) => {
                const connection = provider.connection;
                const connected = connection?.status === 'connected' && connection?.health?.status !== 'needs_reauth';
                const needsAuth = connection?.status === 'connected' && connection?.health?.status === 'needs_reauth';
                const busy = connect.isPending || disconnect.isPending;
                return (
                  <div key={provider.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-white">{provider.name}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] ${connected ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : needsAuth ? 'border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border-white/10 bg-white/[.03] text-zinc-500'}`}>{connected ? 'Connected' : needsAuth ? 'Re-authorisation required' : provider.configured ? 'Not connected' : 'Owner setup required'}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-zinc-500">{provider.summary}</p>
                      {connection?.account_label && <p className="mt-1 text-[10px] text-zinc-400">Account: {connection.account_label}</p>}
                      {connection?.last_error && <p className="mt-1 text-[10px] text-amber-200">{connection.last_error}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {connected ? (
                        <button onClick={() => disconnect.mutate(provider.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] text-zinc-300 disabled:opacity-40"><Unplug className="h-3.5 w-3.5" />Disconnect</button>
                      ) : (
                        <button onClick={() => connect.mutate(provider.id)} disabled={!provider.configured || busy} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/20 bg-violet-400/[.08] px-3 py-2 text-[11px] text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"><ExternalLink className="h-3.5 w-3.5" />{needsAuth ? 'Reconnect' : 'Connect'}</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {catalogue.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">No OAuth providers are currently available.</p>}
            </div>
            {(connect.error || disconnect.error) && <p role="alert" className="mt-3 text-xs text-rose-300">{friendlyMessage(connect.error || disconnect.error)}</p>}
            <button onClick={() => query.refetch()} className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white"><RefreshCw className="h-3 w-3" />Refresh connections</button>
          </>
        )}
    </Panel>
  );
}

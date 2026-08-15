import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, Lock, Plug, ServerCog, ShieldOff } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { listAdminIntegrationOverview } from '@/lib/admin/admin-integrations.functions';
import { friendlyMessage } from '@/lib/errors';

const STATUS_TONE = {
  connected: 'bg-emerald-500/10 text-emerald-300',
  error: 'bg-rose-500/10 text-rose-300',
  pending: 'bg-amber-500/10 text-amber-300',
  disconnected: 'bg-zinc-500/10 text-zinc-400',
};

function ago(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminIntegrations() {
  const { session } = useWorkspace();
  const fn = useServerFn(listAdminIntegrationOverview);
  const q = useQuery({
    queryKey: ['admin-integration-overview'],
    queryFn: () => fn(),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 60000,
  });

  const headerAction = <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>;

  if (session !== 'yes' || q.isLoading) {
    return <><PageHeader eyebrow="Admin" title="Integration Management" description="Platform-wide integration health and connection activity." action={headerAction} /><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading integration state…</div></>;
  }

  if (q.data?.forbidden || q.error) {
    if (q.error) console.error('[AdminIntegrations]', q.error);
    return <><PageHeader eyebrow="Admin" title="Integration Management" description="Platform-wide integration health and connection activity." action={headerAction} /><div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center"><ShieldOff className="h-8 w-8 text-rose-300" /><p className="text-sm font-medium text-rose-200">{q.data?.forbidden ? "You don't have permission to view this page." : friendlyMessage(q.error)}</p><p className="text-xs text-rose-200/70">Admin access is re-verified server-side for every load.</p></div></>;
  }

  const data = q.data;
  const summary = data.summary;
  const providers = data.providers ?? [];
  const recent = data.recent ?? [];

  return (
    <>
      <PageHeader eyebrow="Admin" title="Integration Management" description="Live platform-wide provider configuration, connection state and recent integration activity." action={headerAction} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Plug} label="Connections" value={summary.totalConnections} detail={`${summary.connected} connected`} />
        <Metric icon={AlertTriangle} label="Needs attention" value={summary.errors} detail="connections in error state" />
        <Metric icon={ServerCog} label="Configured providers" value={`${summary.configuredProviders}/${summary.providerCount}`} detail="deployment credentials ready" />
        <Metric icon={CheckCircle2} label="Healthy share" value={summary.totalConnections ? `${Math.round((summary.connected / summary.totalConnections) * 100)}%` : '—'} detail="currently connected" />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="mb-3"><h2 className="text-sm font-semibold text-white">Provider overview</h2><p className="mt-1 text-xs text-zinc-500">Deployment readiness and persisted connection counts. OAuth credentials are never returned to this page.</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{provider.name}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-600">{provider.category}</p></div><span className={`rounded-lg px-2 py-1 text-[10px] font-medium ${provider.configured ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{provider.configured ? 'Configured' : 'Setup required'}</span></div>
              <div className="mt-3 grid grid-cols-4 gap-1 text-center"><Mini label="Total" value={provider.total} /><Mini label="Live" value={provider.connected} /><Mini label="Error" value={provider.errors} /><Mini label="Pending" value={provider.pending} /></div>
              <p className="mt-3 truncate text-[10px] text-zinc-600">Tools: {(provider.tools ?? []).join(', ') || 'none'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
        <div className="border-b border-white/10 p-4"><h2 className="text-sm font-semibold text-white">Recent connection activity</h2><p className="mt-1 text-xs text-zinc-500">Latest persisted integration rows across the platform.</p></div>
        {recent.length === 0 ? <div className="p-10 text-center text-sm text-zinc-500">No integration connections have been created yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-black/20 text-[10px] uppercase tracking-wide text-zinc-600"><tr><th className="px-4 py-2">Provider</th><th className="px-4 py-2">Account</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">User</th><th className="px-4 py-2">Last activity</th><th className="px-4 py-2">Error</th></tr></thead><tbody className="divide-y divide-white/5">{recent.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium text-white">{row.provider}</td><td className="px-4 py-3 text-zinc-400">{row.accountLabel || '—'}</td><td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-[10px] font-medium ${STATUS_TONE[row.status] ?? STATUS_TONE.disconnected}`}>{row.status}</span></td><td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{row.userId.slice(0, 8)}…</td><td className="px-4 py-3 text-zinc-500">{ago(row.lastSyncAt || row.connectedAt || row.createdAt)}</td><td className="max-w-xs px-4 py-3 text-[11px] text-rose-300">{row.lastError || '—'}</td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}

function Metric({ icon: Icon, label, value, detail }) { return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2 text-zinc-500"><Icon className="h-4 w-4 text-violet-400" /><span className="text-[10px] font-medium uppercase tracking-wide">{label}</span></div><p className="mt-2 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-[11px] text-zinc-600">{detail}</p></div>; }
function Mini({ label, value }) { return <div className="rounded-lg bg-white/[.03] px-2 py-2"><p className="text-sm font-semibold text-zinc-200">{value}</p><p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p></div>; }

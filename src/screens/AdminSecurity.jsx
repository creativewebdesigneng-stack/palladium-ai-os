import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Lock, Info, Loader2, ShieldOff, ShieldAlert, KeyRound, Globe, Ban } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { getSecurityOverview } from '@/lib/admin/admin.functions';
import { friendlyMessage } from '@/lib/errors';

const headerAction = <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>;

function Card({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-2 text-zinc-500"><Icon className="h-4 w-4 text-violet-400" /><span className="text-[11px] font-medium uppercase tracking-wide">{label}</span></div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function AdminSecurity() {
  const { session } = useWorkspace();
  const fn = useServerFn(getSecurityOverview);
  const q = useQuery({ queryKey: ['admin-security'], queryFn: () => fn(), enabled: session === 'yes', retry: false });

  if (session !== 'yes' || q.isLoading) {
    return (<>
      <PageHeader eyebrow="Admin" title="Security Dashboard" description="Platform-wide security posture — restricted to administrators." action={headerAction} />
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading security overview…</div>
    </>);
  }

  const forbidden = q.data?.forbidden;
  if (forbidden || q.error) {
    if (q.error) console.error('[AdminSecurity]', q.error);
    return (<>
      <PageHeader eyebrow="Admin" title="Security Dashboard" description="Platform-wide security posture — restricted to administrators." action={headerAction} />
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center">
        <ShieldOff className="h-8 w-8 text-rose-300" />
        <p className="text-sm font-medium text-rose-200">{forbidden ? "You don't have permission to view this page." : friendlyMessage(q.error)}</p>
        <p className="text-xs text-rose-200/70">Admin access is required. Contact a platform administrator if you believe this is a mistake.</p>
      </div>
    </>);
  }

  const d = q.data;
  return (
    <>
      <PageHeader eyebrow="Admin" title="Security Dashboard" description="Platform-wide security posture, threats, and audit activity — restricted to administrators." action={headerAction} />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. Figures are read live from audit logs, API keys and request logs, last 7 days.</p></div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card icon={ShieldAlert} label="Permission denials (7d)" value={d.permission_denied_7d} />
        <Card icon={KeyRound} label="Auth failures (7d)" value={d.auth_failures_7d} />
        <Card icon={Ban} label="Error requests (7d)" value={d.error_requests_7d} />
        <Card icon={KeyRound} label="Active API keys" value={d.active_api_keys} />
        <Card icon={KeyRound} label="Revoked API keys" value={d.revoked_api_keys} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-cyan-300" /><p className="text-sm font-semibold text-white">Top error-generating IPs</p></div>
          {d.top_error_ips.length ? (
            <div className="mt-3 space-y-1.5">
              {d.top_error_ips.map((r) => (
                <div key={r.ip} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[12px]">
                  <span className="font-mono text-zinc-300">{r.ip}</span>
                  <span className="text-zinc-500">{r.count} errors</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-xs text-zinc-500">No error traffic recorded in the last 7 days.</p>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-300" /><p className="text-sm font-semibold text-white">Recent permission-denied events</p></div>
          {d.recent_denied_events.length ? (
            <div className="mt-3 space-y-1.5">
              {d.recent_denied_events.map((e) => (
                <div key={e.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[12px]">
                  <p className="text-zinc-200">{e.action}</p>
                  <p className="text-[10px] text-zinc-500">{e.user_id ? `user ${e.user_id.slice(0, 8)}` : 'unknown user'} · {e.ip_address || '—'} · {new Date(e.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-xs text-zinc-500">No permission-denied events in the last 7 days — good news.</p>}
        </div>
      </div>
    </>
  );
}

import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Lock, Info, Loader2, ShieldOff, ShieldCheck, Server, Bot } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { listSystemHealth } from '@/lib/admin/admin.functions';
import { friendlyMessage } from '@/lib/errors';

const headerAction = <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>;

const STATUS_TONE = {
  operational: { tone: 'bg-emerald-500/15 text-emerald-300', label: 'All systems operational' },
  degraded: { tone: 'bg-amber-500/15 text-amber-300', label: 'Partial degradation' },
  no_data: { tone: 'bg-zinc-500/15 text-zinc-300', label: 'No recent traffic' },
};

export default function SystemMonitoring() {
  const { session } = useWorkspace();
  const fn = useServerFn(listSystemHealth);
  const q = useQuery({ queryKey: ['admin-system-health'], queryFn: () => fn(), enabled: session === 'yes', retry: false, refetchInterval: 30000 });

  if (session !== 'yes' || q.isLoading) {
    return (<>
      <PageHeader eyebrow="Admin" title="System Monitoring" description="Real-time health of platform infrastructure and services." action={headerAction} />
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading system health…</div>
    </>);
  }

  const forbidden = q.data?.forbidden;
  if (forbidden || q.error) {
    if (q.error) console.error('[SystemMonitoring]', q.error);
    return (<>
      <PageHeader eyebrow="Admin" title="System Monitoring" description="Real-time health of platform infrastructure and services." action={headerAction} />
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center">
        <ShieldOff className="h-8 w-8 text-rose-300" />
        <p className="text-sm font-medium text-rose-200">{forbidden ? "You don't have permission to view this page." : friendlyMessage(q.error)}</p>
        <p className="text-xs text-rose-200/70">Admin access is required. Contact a platform administrator if you believe this is a mistake.</p>
      </div>
    </>);
  }

  const d = q.data;
  const overall = STATUS_TONE[d.overall] || STATUS_TONE.no_data;

  return (
    <>
      <PageHeader eyebrow="Admin" title="System Monitoring" description="Real-time health of platform infrastructure and services." action={headerAction} />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Signals are computed live from API request logs and agent task runs, {d.window}.</p></div>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="flex items-center gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-2xl ${overall.tone}`}><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Platform status</p>
            <p className="text-[15px] font-semibold text-white">{overall.label}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2 text-zinc-500"><Server className="h-4 w-4 text-violet-400" /><span className="text-[11px] font-medium uppercase tracking-wide">API requests</span></div>
          <p className="mt-2 text-2xl font-semibold text-white">{d.api.total_requests.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2 text-zinc-500"><Server className="h-4 w-4 text-rose-400" /><span className="text-[11px] font-medium uppercase tracking-wide">Server errors</span></div>
          <p className="mt-2 text-2xl font-semibold text-white">{d.api.server_errors.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2 text-zinc-500"><Server className="h-4 w-4 text-cyan-400" /><span className="text-[11px] font-medium uppercase tracking-wide">Avg latency</span></div>
          <p className="mt-2 text-2xl font-semibold text-white">{d.api.avg_latency_ms != null ? `${d.api.avg_latency_ms}ms` : '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2 text-zinc-500"><Bot className="h-4 w-4 text-emerald-400" /><span className="text-[11px] font-medium uppercase tracking-wide">Agent runs</span></div>
          <p className="mt-2 text-2xl font-semibold text-white">{d.agents.total_runs.toLocaleString()}</p>
          <p className="text-[11px] text-zinc-500">{d.agents.failed_runs} failed</p>
        </div>
      </div>

      {d.api.total_requests === 0 && d.agents.total_runs === 0 && (
        <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">No traffic in the last hour to report on.</div>
      )}
    </>
  );
}

import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Lock, Info, Loader2, ShieldOff } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import AnalyticsMetricCards from '@/components/admin-analytics/AnalyticsMetricCards';
import AnalyticsChart from '@/components/admin-analytics/AnalyticsChart';
import { useWorkspace } from '@/hooks/use-workspace';
import { getPlatformAnalytics } from '@/lib/admin/admin.functions';
import { friendlyMessage } from '@/lib/errors';

const RANGES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
const headerAction = <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>;

export default function AdminPlatformAnalytics() {
  const { session } = useWorkspace();
  const [range, setRange] = useState('Monthly');
  const analyticsFn = useServerFn(getPlatformAnalytics);
  const q = useQuery({ queryKey: ['admin-platform-analytics', range], queryFn: () => analyticsFn({ data: { range } }), enabled: session === 'yes', retry: false });

  if (session !== 'yes' || q.isLoading) {
    return (<>
      <PageHeader eyebrow="Admin" title="Platform Analytics" description="Platform-wide telemetry — access is restricted to administrators." action={headerAction} />
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading analytics…</div>
    </>);
  }

  const forbidden = q.data?.forbidden;
  if (forbidden || q.error) {
    if (q.error) console.error('[AdminPlatformAnalytics]', q.error);
    return (<>
      <PageHeader eyebrow="Admin" title="Platform Analytics" description="Platform-wide telemetry — access is restricted to administrators." action={headerAction} />
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center">
        <ShieldOff className="h-8 w-8 text-rose-300" />
        <p className="text-sm font-medium text-rose-200">{forbidden ? "You don't have permission to view this page." : friendlyMessage(q.error)}</p>
        <p className="text-xs text-rose-200/70">Admin access is required. Contact a platform administrator if you believe this is a mistake.</p>
      </div>
    </>);
  }

  const d = q.data;
  const metrics = [
    { label: 'New Users', value: d.new_users.toLocaleString(), change: `over ${d.range.toLowerCase()}`, icon: 'users' },
    { label: 'Total Requests', value: d.total_requests.toLocaleString(), change: `over ${d.range.toLowerCase()}`, icon: 'git' },
    { label: 'Errors', value: d.total_errors.toLocaleString(), change: `over ${d.range.toLowerCase()}`, icon: 'alert' },
    { label: 'Revenue', value: `£${d.total_revenue.toLocaleString()}`, change: `over ${d.range.toLowerCase()}`, icon: 'dollar' },
  ];
  const toSeries = (key) => ({ labels: d.series.map((s) => s.date.slice(5)), values: d.series.map((s) => s[key]) });

  return (
    <>
      <PageHeader eyebrow="Admin" title="Platform Analytics" description="Platform-wide telemetry — access is restricted to administrators." action={headerAction} />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. Figures are computed live from agent tasks and API request logs.</p></div>

      <AnalyticsMetricCards metrics={metrics} />

      <div className="mt-4 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1">
        {RANGES.map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${range === r ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:text-white'}`}>{r}</button>
        ))}
      </div>

      {d.series.length ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <AnalyticsChart title="Requests" subtitle={`Volume — ${d.range.toLowerCase()}`} data={toSeries('requests')} color="cyan" />
          <AnalyticsChart title="Errors" subtitle={`Failures — ${d.range.toLowerCase()}`} data={toSeries('errors')} color="rose" />
          <AnalyticsChart title="Revenue" subtitle={`Estimated — ${d.range.toLowerCase()}`} data={toSeries('revenue')} color="violet" />
        </div>
      ) : (
        <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No activity recorded for this range yet.</div>
      )}
    </>
  );
}

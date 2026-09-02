import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Lock, Info, Loader2, ShieldOff } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import AdminMetricCards from '@/components/admin/AdminMetricCards';
import QuickActions from '@/components/admin/QuickActions';
import SystemHealth from '@/components/admin/SystemHealth';
import ProductionCapabilities from '@/components/admin/ProductionCapabilities';
import AuditLog from '@/components/admin/AuditLog';
import { RevenueChart, AIUsageChart, ErrorsChart } from '@/components/admin/AdminCharts';
import { QUICK_ACTIONS } from '@/components/admin/adminData';
import { useWorkspace } from '@/hooks/use-workspace';
import { getAdminOverview, getPlatformAnalytics, listSystemHealth } from '@/lib/admin/admin.functions';
import { getProductionCapabilities } from '@/lib/admin/production-health.functions';
import { listAuditLogs } from '@/lib/platform/audit.functions';

function timeAgo(iso) {
  if (!iso) return '—';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Admin() {
  const { session } = useWorkspace();
  const overviewFn = useServerFn(getAdminOverview);
  const analyticsFn = useServerFn(getPlatformAnalytics);
  const healthFn = useServerFn(listSystemHealth);
  const capabilitiesFn = useServerFn(getProductionCapabilities);
  const auditFn = useServerFn(listAuditLogs);

  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: () => overviewFn(), enabled: session === 'yes', retry: false });
  const analytics = useQuery({ queryKey: ['admin-analytics', 'Monthly'], queryFn: () => analyticsFn({ data: { range: 'Monthly' } }), enabled: session === 'yes', retry: false });
  const health = useQuery({ queryKey: ['admin-health'], queryFn: () => healthFn(), enabled: session === 'yes', retry: false });
  const capabilities = useQuery({ queryKey: ['admin-production-capabilities'], queryFn: () => capabilitiesFn(), enabled: session === 'yes', retry: false, refetchInterval: 60_000 });
  const audit = useQuery({ queryKey: ['admin-audit'], queryFn: () => auditFn({ data: { limit: 8 } }), enabled: session === 'yes', retry: false });
  const forbidden = overview.data?.forbidden;

  if (session !== 'yes' || overview.isLoading) return <><PageHeader eyebrow="Blackstar Control Plane" title="Administration" description="Restricted platform intelligence and infrastructure administration." /><div className="flex items-center gap-2 rounded-2xl border border-violet-300/10 bg-black/30 p-6 text-sm text-zinc-400 backdrop-blur-xl"><Loader2 className="h-4 w-4 animate-spin text-violet-300" />Loading administrative telemetry…</div></>;
  if (forbidden || overview.error) return <><PageHeader eyebrow="Blackstar Control Plane" title="Administration" description="Restricted platform intelligence and infrastructure administration." /><div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center"><ShieldOff className="h-8 w-8 text-rose-300" /><p className="text-sm font-medium text-rose-200">You don't have permission to view this control plane.</p><p className="text-xs text-rose-200/70">Administrative access is required and re-verified server-side.</p></div></>;

  const o = overview.data;
  const metrics = [
    { id: 'users', label: 'Total Users', value: o.total_users.toLocaleString(), detail: 'registered profiles', icon: 'Users', tone: 'violet' },
    { id: 'orgs', label: 'Organisations', value: o.total_organisations.toLocaleString(), detail: 'workspaces on platform', icon: 'FolderKanban', tone: 'blue' },
    { id: 'subs', label: 'Active Subscriptions', value: o.active_subscriptions.toLocaleString(), detail: 'billed accounts', icon: 'CreditCard', tone: 'amber' },
    { id: 'agents', label: 'Intelligence Nodes', value: o.total_agents.toLocaleString(), detail: 'agents across all users', icon: 'Bot', tone: 'fuchsia' },
    { id: 'runs', label: 'Executions (24h)', value: o.tasks_last_24h.toLocaleString(), detail: 'last 24 hours', icon: 'Activity', tone: 'emerald' },
    { id: 'errors', label: 'Exceptions (24h)', value: o.errors_last_24h.toLocaleString(), detail: 'runtime and API errors', icon: 'AlertTriangle', tone: 'rose' },
  ];
  const series = analytics.data?.forbidden ? [] : analytics.data?.series ?? [];
  const revenueSeries = series.map((s) => ({ m: s.date.slice(5), mrr: s.revenue }));
  const requestSeries = series.map((s) => ({ d: s.date.slice(5), requests: s.requests }));
  const errorSeries = series.map((s) => ({ d: s.date.slice(5), errors: s.errors }));
  const healthData = health.data?.forbidden ? null : health.data;
  const services = healthData ? [{ name: 'API', status: healthData.api.total_requests === 0 ? 'operational' : healthData.api.error_rate > 0.1 ? 'degraded' : 'operational', latency: healthData.api.avg_latency_ms != null ? `${healthData.api.avg_latency_ms}ms` : '—' }, { name: 'Agent runtime', status: healthData.agents.total_runs > 0 && healthData.agents.failed_runs / healthData.agents.total_runs > 0.2 ? 'degraded' : 'operational', latency: `${healthData.agents.total_runs} runs/1h` }] : [];
  const auditLogs = (audit.data?.logs ?? []).map((l) => ({ icon: 'ScrollText', action: `${l.action}${l.resource_type ? ` · ${l.resource_type}` : ''}`, actor: l.actor_id?.slice(0, 8) ?? 'system', t: timeAgo(l.created_date) }));

  return <>
    <PageHeader eyebrow="Blackstar Control Plane" title="Administration" description="Authorised command surface for platform health, revenue, usage, capability readiness and audit telemetry." action={<span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Administrative trust verified</span>} />
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-violet-300/10 bg-violet-400/[.035] px-3 py-2 text-[11px] text-violet-100/80"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" /><p>Restricted control plane. Every administrative read is re-verified server-side against the authenticated platform role.</p></div>
    <AdminMetricCards metrics={metrics} />
    <div className="mt-4 grid gap-4 xl:grid-cols-2"><Panel title="Revenue" subtitle="Estimated from agent task cost, last 30 days">{revenueSeries.length ? <RevenueChart data={revenueSeries} /> : <EmptyChart label="No billed usage recorded yet." />}</Panel><Panel title="Intelligence Requests" subtitle="Agent tasks + API calls, last 30 days">{requestSeries.length ? <AIUsageChart data={requestSeries} /> : <EmptyChart label="No request activity recorded yet." />}</Panel><Panel title="Runtime Exceptions" subtitle="Failed tasks + API errors, last 30 days">{errorSeries.length ? <ErrorsChart data={errorSeries} /> : <EmptyChart label="No runtime exceptions recorded." />}</Panel><Panel title="System Health" subtitle="Live infrastructure signals from the last hour">{services.length ? <SystemHealth services={services} /> : <EmptyChart label="Not enough traffic in the last hour to report health." />}</Panel><Panel title="Production Capability Matrix" subtitle="Server-side readiness — no secrets exposed" className="xl:col-span-2"><ProductionCapabilities data={capabilities.data} loading={capabilities.isLoading} /></Panel></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-3"><Panel title="Control Actions" subtitle="Administrative shortcuts" className="lg:col-span-2"><QuickActions actions={QUICK_ACTIONS} /></Panel><Panel title="Audit Ledger" subtitle="Latest privileged activity">{audit.isLoading ? <p className="text-xs text-zinc-500">Loading…</p> : auditLogs.length ? <AuditLog logs={auditLogs} /> : <EmptyChart label="No audit events yet." />}</Panel></div>
  </>;
}
function EmptyChart({ label }) { return <div className="grid h-[200px] place-items-center rounded-xl border border-dashed border-violet-300/10 bg-black/10 text-xs text-zinc-500">{label}</div>; }

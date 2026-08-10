import { Lock, ShieldCheck, Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import AdminMetricCards from '@/components/admin/AdminMetricCards';
import QuickActions from '@/components/admin/QuickActions';
import SystemHealth from '@/components/admin/SystemHealth';
import AuditLog from '@/components/admin/AuditLog';
import { UserGrowthChart, RevenueChart, AIUsageChart, AgentUsageChart, ErrorsChart } from '@/components/admin/AdminCharts';
import { METRICS, QUICK_ACTIONS, USER_GROWTH, REVENUE, AI_USAGE, AGENT_USAGE, ERRORS, AUDIT_LOGS, SYSTEM_SERVICES } from '@/components/admin/adminData';

export default function Admin() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="PalladiumAI Admin Dashboard" description="Platform administration for authorised PalladiumAI administrators only." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. All actions are audited. Data shown is illustrative mock data — backend-ready for live admin APIs.</p></div>

      <AdminMetricCards metrics={METRICS} />

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="User Growth" subtitle="Total users over the last 12 months"><UserGrowthChart data={USER_GROWTH} /></Panel>
        <Panel title="Revenue (MRR)" subtitle="Monthly recurring revenue"><RevenueChart data={REVENUE} /></Panel>
        <Panel title="AI Usage" subtitle="Requests this week"><AIUsageChart data={AI_USAGE} /></Panel>
        <Panel title="Agent Usage" subtitle="Runs by top agents"><AgentUsageChart data={AGENT_USAGE} /></Panel>
        <Panel title="Errors" subtitle="Errors over the last 7 days"><ErrorsChart data={ERRORS} /></Panel>
        <Panel title="System Health" subtitle="Live service status"><SystemHealth services={SYSTEM_SERVICES} /></Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Quick Actions" subtitle="Administrative shortcuts" className="lg:col-span-2"><QuickActions actions={QUICK_ACTIONS} /></Panel>
        <Panel title="Recent Audit Logs" subtitle="Latest admin activity"><AuditLog logs={AUDIT_LOGS} /></Panel>
      </div>
    </>
  );
}
import { useState, useMemo } from 'react';
import { Lock, Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import AnalyticsMetricCards from '@/components/admin-analytics/AnalyticsMetricCards';
import AnalyticsChart from '@/components/admin-analytics/AnalyticsChart';
import AnalyticsFilters from '@/components/admin-analytics/AnalyticsFilters';
import AIInsights from '@/components/admin-analytics/AIInsights';
import { METRICS, RANGES, SERIES } from '@/components/admin-analytics/analyticsData';

export default function AdminPlatformAnalytics() {
  const [range, setRange] = useState('Monthly');
  const [filters, setFilters] = useState({ region: 'All', plan: 'All', org: 'All', agent: 'All', model: 'All' });

  const charts = useMemo(() => [
    { title: 'Users', subtitle: `Growth — ${range.toLowerCase()}`, data: SERIES.users[range], color: 'violet' },
    { title: 'Revenue', subtitle: `$ over time — ${range.toLowerCase()}`, data: SERIES.revenue[range], color: 'violet' },
    { title: 'AI Requests', subtitle: `Volume — ${range.toLowerCase()}`, data: SERIES.requests[range], color: 'cyan' },
    { title: 'Errors', subtitle: `Declining — ${range.toLowerCase()}`, data: SERIES.errors[range], color: 'rose' },
  ], [range]);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Platform Analytics" description="Platform-wide telemetry and AI insights — access is restricted to administrators." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. All actions are audited. Data shown is illustrative mock data — backend-ready for live analytics APIs.</p></div>

      <AnalyticsMetricCards metrics={METRICS} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${range === r ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:text-white'}`}>{r}</button>
          ))}
        </div>
        <AnalyticsFilters filters={filters} setFilters={setFilters} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {charts.map(c => <AnalyticsChart key={c.title} {...c} />)}
      </div>

      <div className="mt-4">
        <AIInsights />
      </div>
    </>
  );
}
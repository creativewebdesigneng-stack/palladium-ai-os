import { useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import AnalyticsFilters from '@/components/analytics/AnalyticsFilters';
import AnalyticsMetricCards from '@/components/analytics/AnalyticsMetricCards';
import ActivityChart from '@/components/analytics/ActivityChart';
import AgentAnalytics from '@/components/analytics/AgentAnalytics';
import ProjectAnalytics from '@/components/analytics/ProjectAnalytics';
import TeamAnalytics from '@/components/analytics/TeamAnalytics';
import IntegrationAnalytics from '@/components/analytics/IntegrationAnalytics';
import ModelAnalytics from '@/components/analytics/ModelAnalytics';
import { METRICS, AGENT_ANALYTICS, PROJECT_ANALYTICS, TEAM_ANALYTICS, MODEL_ANALYTICS } from '@/components/analytics/analyticsData';

const buildCsv = () => {
  const rows = [
    ['Section', 'Item', 'Metric', 'Value'],
    ...METRICS.map((m) => ['Metric', m.label, 'value', m.value]),
    ...AGENT_ANALYTICS.map((a) => ['Agent', a.agent, 'requests', a.requests]),
    ...PROJECT_ANALYTICS.map((p) => ['Project', p.project, 'completion', `${p.completion}%`]),
    ...TEAM_ANALYTICS.map((t) => ['Team', t.team, 'requests', t.requests]),
    ...MODEL_ANALYTICS.map((m) => ['Model', m.model, 'requests', m.requests]),
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
};

export default function Analytics() {
  const [filters, setFilters] = useState({ date: 'Last 7 days', user: 'All users', team: 'All teams', agent: 'All agents', project: 'All projects', model: 'All models' });
  const [range, setRange] = useState('daily');
  const [toast, setToast] = useState(null);

  const exportCsv = () => {
    const csv = buildCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'palladium-analytics.csv'; a.click();
    URL.revokeObjectURL(url);
    setToast('Exported palladium-analytics.csv'); setTimeout(() => setToast(null), 1600);
  };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Analytics" description="Track users, sessions, agents, tasks, costs, and AI usage across the organisation." />
      <AnalyticsFilters filters={filters} setFilters={setFilters} onExport={exportCsv} />
      <div className="mt-4"><AnalyticsMetricCards /></div>
      <div className="mt-4"><ActivityChart range={range} setRange={setRange} /></div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AgentAnalytics />
        <ProjectAnalytics />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TeamAnalytics />
        <IntegrationAnalytics />
      </div>
      <div className="mt-4"><ModelAnalytics /></div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}
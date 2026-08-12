import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import AnalyticsFilters from '@/components/analytics/AnalyticsFilters';
import AnalyticsMetricCards from '@/components/analytics/AnalyticsMetricCards';
import ActivityChart from '@/components/analytics/ActivityChart';
import AgentAnalytics from '@/components/analytics/AgentAnalytics';
import TeamAnalytics from '@/components/analytics/TeamAnalytics';
import ModelAnalytics from '@/components/analytics/ModelAnalytics';
import { friendlyMessage } from '@/lib/errors';
import { getAnalyticsSummary } from '@/lib/dashboard/dashboard.functions';

const buildCsv = (data) => {
  const rows = [
    ['Section', 'Item', 'Metric', 'Value'],
    ...(data.metrics ?? []).map((m) => ['Metric', m.label, 'value', m.value]),
    ...(data.agentAnalytics ?? []).map((a) => ['Agent', a.agent, 'tasks', a.tasks]),
    ...(data.teamAnalytics ?? []).map((t) => ['Team', t.team, 'tasks', t.tasks]),
    ...(data.modelAnalytics ?? []).map((m) => ['Model', m.model, 'requests', m.requests]),
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
};

export default function Analytics() {
  const [filters, setFilters] = useState({ date: 'Last 7 days', user: 'All users', team: 'All teams', agent: 'All agents', project: 'All projects', model: 'All models' });
  const [range, setRange] = useState('weekly');
  const [toast, setToast] = useState(null);

  const summaryFn = useServerFn(getAnalyticsSummary);
  const [session, setSession] = useState('unknown');
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ? 'yes' : 'no'); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'yes' : 'no'));
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-summary', range],
    queryFn: () => summaryFn({ data: { range } }),
    enabled: session === 'yes',
    retry: false,
  });

  const exportCsv = () => {
    if (!data) return;
    const csv = buildCsv(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'palladium-analytics.csv'; a.click();
    URL.revokeObjectURL(url);
    setToast('Exported palladium-analytics.csv'); setTimeout(() => setToast(null), 1600);
  };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Analytics" description="Track agents, tasks, costs, and AI usage across your workspace." />

      {session === 'no' && (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/[.06] p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-100"><ShieldAlert className="h-4 w-4" />Sign in to see your analytics</p>
        </div>
      )}

      {session === 'yes' && error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[.06] p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-100"><ShieldAlert className="h-4 w-4" />Analytics could not load</p>
            <p className="mt-1 text-[11px] text-rose-200/80">{friendlyMessage(error)}</p>
          </div>
          <button onClick={() => refetch()} className="ml-auto rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/10">Try again</button>
        </div>
      )}

      <AnalyticsFilters filters={filters} setFilters={setFilters} onExport={exportCsv} />

      {session === 'yes' && isLoading ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />)}</div>
          <div className="mt-4 h-72 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />
            <div className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />
          </div>
        </>
      ) : (
        <>
          <div className="mt-4"><AnalyticsMetricCards metrics={data?.metrics ?? []} /></div>
          <div className="mt-4"><ActivityChart range={range} setRange={setRange} data={data?.activity ?? []} /></div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <AgentAnalytics data={data?.agentAnalytics ?? []} />
            <TeamAnalytics data={data?.teamAnalytics ?? []} />
          </div>
          <div className="mt-4"><ModelAnalytics data={data?.modelAnalytics ?? []} /></div>
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}

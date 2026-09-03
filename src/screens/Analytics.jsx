import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BarChart3 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageHeader from '@/components/palladium/PageHeader';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { getAnalytics } from '@/lib/analytics/analytics.functions';
import {
  Stat, Tabs, Empty, Loading, Failed, Table,
  formatNumber, formatPercent,
} from '@/components/business/live';

const RANGES = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

export default function Analytics() {
  const session = useSessionReady();
  const [range, setRange] = useState('30d');
  const analyticsFn = useServerFn(getAnalytics);

  const analytics = useQuery({
    queryKey: ['analytics', range],
    queryFn: () => analyticsFn({ data: { range } }),
    enabled: session === 'yes',
    retry: false,
  });

  const totals = analytics.data?.totals;
  const series = analytics.data?.series ?? [];
  const models = analytics.data?.models ?? [];
  const agents = analytics.data?.agents ?? [];
  const hasActivity = (totals?.tasks ?? 0) > 0;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Analytics"
        description="Computed live from your agent runs, workflow executions and metered usage. Empty means no events recorded yet."
        action={<Tabs tabs={RANGES} active={range} onChange={setRange} />}
      />

      {session === 'no' && <Failed message="Sign in to view your analytics." />}
      {session === 'yes' && analytics.isLoading && <Loading label="Aggregating your events…" />}
      {analytics.isError && <Failed message={friendlyMessage(analytics.error)} onRetry={() => analytics.refetch()} />}

      {analytics.isSuccess && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Stat label="Agent runs" value={formatNumber(totals.tasks)} />
            <Stat label="Completed" value={formatNumber(totals.completed)} tone="text-emerald-300" />
            <Stat label="Failed" value={formatNumber(totals.failed)} tone="text-rose-300" />
            <Stat label="Success rate" value={totals.successRate == null ? null : formatPercent(totals.successRate)} />
            <Stat
              label="Avg duration"
              value={totals.avgDurationSeconds == null ? null : `${totals.avgDurationSeconds}s`}
            />
            <Stat label="Tokens" value={totals.tokens ? formatNumber(totals.tokens) : null} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.02] p-4">
            <h3 className="text-sm font-medium text-white">Execution volume</h3>
            {!hasActivity ? (
              <Empty
                icon={BarChart3}
                title="No data yet"
                desc="Run an agent or a workflow and the execution timeline appears here."
              />
            ) : (
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0c0d13', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="completed" stroke="#34d399" fill="rgba(52,211,153,0.15)" />
                    <Area type="monotone" dataKey="failed" stroke="#fb7185" fill="rgba(251,113,133,0.12)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
              <h3 className="text-sm font-medium text-white">Model usage</h3>
              {models.length === 0 ? (
                <Empty title="No data yet" desc="Model usage appears once agents run." />
              ) : (
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={models}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="model" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#0c0d13', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                      <Bar dataKey="runs" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
              <h3 className="mb-3 text-sm font-medium text-white">Agent performance</h3>
              <Table
                columns={['Agent', 'Runs', 'Completed', 'Failed', 'Success']}
                rows={agents}
                empty={<Empty title="No data yet" desc="Agent performance appears after their first run." />}
                renderRow={(a) => {
                  const finished = a.completed + a.failed;
                  return (
                    <tr key={a.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-white">{a.name}</td>
                      <td className="px-4 py-3 text-zinc-300">{formatNumber(a.runs)}</td>
                      <td className="px-4 py-3 text-emerald-300">{formatNumber(a.completed)}</td>
                      <td className="px-4 py-3 text-rose-300">{formatNumber(a.failed)}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {finished ? formatPercent(Math.round((a.completed / finished) * 100)) : 'No data yet'}
                      </td>
                    </tr>
                  );
                }}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Workflow runs" value={formatNumber(totals.workflowRuns)} />
            <Stat label="Workflow success" value={totals.workflowSuccessRate == null ? null : formatPercent(totals.workflowSuccessRate)} />
            <Stat label="Agents" value={formatNumber(totals.agents)} />
            <Stat label="Model cost" value={totals.modelCost ? `£${Number(totals.modelCost).toFixed(2)}` : null} />
          </div>
        </>
      )}
    </>
  );
}

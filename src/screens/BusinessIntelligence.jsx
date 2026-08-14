import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { PieChart as PieIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageHeader from '@/components/palladium/PageHeader';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { getAnalytics } from '@/lib/analytics/analytics.functions';
import {
  Stat, Tabs, Empty, Loading, Failed,
  formatMoney, formatNumber, formatPercent,
} from '@/components/business/live';

const RANGES = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

export default function BusinessIntelligence() {
  const session = useSessionReady();
  const [range, setRange] = useState('90d');
  const analyticsFn = useServerFn(getAnalytics);

  const bi = useQuery({
    queryKey: ['bi', range],
    queryFn: () => analyticsFn({ data: { range } }),
    enabled: session === 'yes',
    retry: false,
  });

  const business = bi.data?.business;
  const totals = bi.data?.totals;
  const series = bi.data?.series ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Business Intelligence"
        description="Cross-module view built from recorded transactions, CRM pipeline, campaigns and agent activity. Nothing is projected."
        action={<Tabs tabs={RANGES} active={range} onChange={setRange} />}
      />

      {session === 'no' && <Failed message="Sign in to view your business intelligence." />}
      {session === 'yes' && bi.isLoading && <Loading label="Aggregating your records…" />}
      {bi.isError && <Failed message={friendlyMessage(bi.error)} onRetry={() => bi.refetch()} />}

      {bi.isSuccess && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Recorded revenue"
              value={business.hasFinance ? formatMoney(business.revenue) : null}
              hint="Actual transactions only"
              tone="text-emerald-300"
            />
            <Stat label="Recorded expenses" value={business.hasFinance ? formatMoney(business.expenses) : null} tone="text-rose-300" />
            <Stat label="Profit" value={business.hasFinance ? formatMoney(business.profit) : null} />
            <Stat label="Pipeline value" value={business.contacts ? formatMoney(business.pipelineValue) : null} hint="Open CRM deals" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Contacts" value={formatNumber(business.contacts)} />
            <Stat label="Deals won" value={formatNumber(business.wonDeals)} />
            <Stat label="Campaign spend" value={business.campaigns ? formatMoney(business.campaignSpend) : null} />
            <Stat label="Campaign conversions" value={business.campaigns ? formatNumber(business.campaignConversions) : null} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.02] p-4">
            <h3 className="text-sm font-medium text-white">AI workforce throughput</h3>
            {totals.tasks === 0 ? (
              <Empty
                icon={PieIcon}
                title="No data yet"
                desc="Agent and workflow activity will chart here once your workforce starts running."
              />
            ) : (
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0c0d13', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="tasks" stroke="#a78bfa" fill="rgba(167,139,250,0.15)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Agent runs" value={formatNumber(totals.tasks)} />
            <Stat label="Success rate" value={totals.successRate == null ? null : formatPercent(totals.successRate)} />
            <Stat label="Workflow runs" value={formatNumber(totals.workflowRuns)} />
            <Stat label="AI model cost" value={totals.modelCost ? `$${Number(totals.modelCost).toFixed(2)}` : null} />
          </div>
        </>
      )}
    </>
  );
}

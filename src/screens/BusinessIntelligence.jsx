import { useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import BIFilters from '@/components/bi/BIFilters';
import BIMetricCards from '@/components/bi/BIMetricCards';
import RevenueChart from '@/components/bi/RevenueChart';
import AICostsChart from '@/components/bi/AICostsChart';
import AgentPerformanceChart from '@/components/bi/AgentPerformanceChart';
import ProjectCompletionChart from '@/components/bi/ProjectCompletionChart';
import CustomerGrowthChart from '@/components/bi/CustomerGrowthChart';
import AIInsights from '@/components/bi/AIInsights';

export default function BusinessIntelligence() {
  const [filters, setFilters] = useState({ date: 'Last 30 days', department: 'All departments', agent: 'All agents', project: 'All projects', team: 'All teams' });

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Business Intelligence" description="A unified view of revenue, costs, AI usage, productivity, and growth across the organisation." />
      <BIFilters filters={filters} setFilters={setFilters} />
      <div className="mt-4"><BIMetricCards /></div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><RevenueChart /></div>
        <CustomerGrowthChart />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AICostsChart />
        <AgentPerformanceChart />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ProjectCompletionChart />
        <AIInsights />
      </div>
    </>
  );
}
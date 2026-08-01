import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Clock, Globe, Rocket, TrendingUp, Users } from "lucide-react";
import { PageHeader, Panel } from "@/components/os/page-shell";
import { StatCard } from "@/components/os/stat-card";
import { AreaTrend, BarsChart, DonutChart } from "@/components/os/charts";
import { departmentLoad, revenueSeries } from "@/lib/os-data";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PalladiumAI OS" },
      {
        name: "description",
        content:
          "Revenue, time saved, tasks completed, businesses created, leads generated and marketing performance across your AI workforce.",
      },
      { property: "og:title", content: "Analytics — PalladiumAI OS" },
      { property: "og:description", content: "Every outcome your AI workforce produces, measured." },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Analytics"
        description="Outcome-level reporting across every department, business and mission your workforce runs."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue generated" value="£1.04M" delta="+31.2%" icon={Banknote} hint="trailing 8 months" />
        <StatCard label="Time saved" value="4,182h" delta="+412h" icon={Clock} hint="≈ 2.1 FTE years" />
        <StatCard label="Tasks completed" value="38,914" delta="+18.6%" icon={Rocket} hint="all departments" />
        <StatCard label="Businesses created" value="7" delta="+1" icon={Globe} hint="3 profitable" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Websites built" value="24" delta="+5" icon={Globe} hint="live" />
        <StatCard label="Leads generated" value="12,480" delta="+22.4%" icon={Users} hint="qualified 3,120" />
        <StatCard label="Sales closed" value="£418k" delta="+14.9%" icon={TrendingUp} hint="win rate 27%" />
        <StatCard label="Marketing ROAS" value="4.8x" delta="+0.6x" icon={TrendingUp} hint="blended" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Revenue vs forecast" subtitle="£ thousands" className="xl:col-span-2">
          <AreaTrend
            data={revenueSeries}
            xKey="month"
            keys={[
              { key: "revenue", color: "var(--chart-1)" },
              { key: "forecast", color: "var(--chart-2)" },
            ]}
            height={280}
          />
        </Panel>
        <Panel title="Outcome mix">
          <DonutChart
            height={220}
            data={[
              { name: "Revenue ops", value: 38, color: "var(--chart-1)" },
              { name: "Product", value: 26, color: "var(--chart-2)" },
              { name: "Marketing", value: 20, color: "var(--chart-3)" },
              { name: "Personal", value: 16, color: "var(--chart-4)" },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tasks completed" subtitle="Per month">
          <BarsChart data={revenueSeries} xKey="month" dataKey="tasks" height={250} />
        </Panel>
        <Panel title="Department utilisation" subtitle="Capacity used">
          <BarsChart data={departmentLoad} xKey="name" dataKey="load" height={250} color="var(--chart-2)" />
        </Panel>
      </div>
    </>
  );
}

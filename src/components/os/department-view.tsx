import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Bot, Plus, Sparkles, Target, Workflow } from "lucide-react";
import { PageHeader, Panel, Meter, StatusDot } from "@/components/os/page-shell";
import { StatCard } from "@/components/os/stat-card";
import { AreaTrend, BarsChart } from "@/components/os/charts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agents, revenueSeries } from "@/lib/os-data";

const tabs = ["Overview", "Tasks", "Employees", "Analytics", "Goals", "Automations", "Templates"];

const tasks = [
  { name: "Draft Q3 operating plan", owner: "Manager", status: "running", progress: 64 },
  { name: "Audit vendor contracts", owner: "Ledger-9", status: "approval", progress: 92 },
  { name: "Build weekly KPI digest", owner: "Scout-7", status: "running", progress: 41 },
  { name: "Refresh customer segments", owner: "Vega", status: "queued", progress: 6 },
  { name: "Close month-end books", owner: "Nova", status: "complete", progress: 100 },
];

const goals = [
  { name: "Reduce cost per outcome by 30%", progress: 68 },
  { name: "Ship 40 automations this quarter", progress: 52 },
  { name: "Reach 99.99% department uptime", progress: 91 },
  { name: "Zero human handoffs for tier-1 work", progress: 44 },
];

const automations = [
  { name: "Daily briefing at 08:00", trigger: "Schedule", runs: "184 runs" },
  { name: "Escalate anomalies > £5k", trigger: "Threshold", runs: "22 runs" },
  { name: "Auto-hire on backlog > 50", trigger: "Workload", runs: "9 runs" },
  { name: "Weekly performance review", trigger: "Schedule", runs: "26 runs" },
];

const templates = [
  { name: "Launch a new product line", agents: 42, eta: "6 days" },
  { name: "Full competitive teardown", agents: 12, eta: "18 hours" },
  { name: "Quarterly cost optimisation", agents: 18, eta: "3 days" },
  { name: "Build an automation suite", agents: 24, eta: "5 days" },
];

export function DepartmentView({
  name,
  icon: Icon,
  summary,
  employees,
  missions,
  uptime,
  load,
}: {
  name: string;
  icon: LucideIcon;
  summary: string;
  employees: number;
  missions: number;
  uptime: string;
  load: number;
}) {
  const [tab, setTab] = useState("Overview");
  const roster = agents.slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Department"
        title={name}
        description={summary}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Bot className="size-4" /> Hire employee
            </Button>
            <Button variant="hero" size="sm">
              <Plus className="size-4" /> New mission
            </Button>
          </>
        }
      />

      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/12 blur-[100px]" />
        <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="brand-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-primary-foreground">
              <Icon className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">{name} department</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {employees} employees · {missions} live missions · {uptime} uptime
              </p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Capacity used</span>
              <span className="font-medium text-foreground">{load}%</span>
            </div>
            <Meter value={load} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={String(employees)} delta="+12" icon={Bot} hint="all tiers" />
        <StatCard label="Live missions" value={String(missions)} delta="+2" icon={Target} hint="this week" />
        <StatCard label="Tasks completed" value="8,412" delta="+18.4%" icon={Sparkles} hint="last 30 days" />
        <StatCard label="Automations" value="34" delta="+6" icon={Workflow} hint="running" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="scroll-slim w-full justify-start overflow-x-auto rounded-full bg-secondary/60 p-1">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full px-4 text-xs">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Overview" className="mt-4 grid gap-4 xl:grid-cols-3">
          <Panel title="Output trend" subtitle="Value generated (£k)" className="xl:col-span-2">
            <AreaTrend
              data={revenueSeries}
              xKey="month"
              keys={[{ key: "revenue", color: "var(--chart-1)" }]}
              height={250}
            />
          </Panel>
          <Panel title="Live activity" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.name} className="px-5 py-3">
                  <p className="truncate text-sm">{t.name}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Meter value={t.progress} />
                    <StatusDot status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="Tasks" className="mt-4">
          <Panel title="Task queue" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li
                  key={t.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Owner · {t.owner}</p>
                    <Meter value={t.progress} className="mt-2 max-w-[240px]" />
                  </div>
                  <StatusDot status={t.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="Employees" className="mt-4">
          <Panel title="Department roster" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {roster.map((a) => (
                <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="brand-gradient grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-primary-foreground">
                      {a.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{a.role}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusDot status={a.status} />
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{a.success}% success</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="Analytics" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Throughput" subtitle="Tasks completed per month">
            <BarsChart data={revenueSeries} xKey="month" dataKey="tasks" height={250} />
          </Panel>
          <Panel title="Cost efficiency" subtitle="Forecast vs actual (£k)">
            <AreaTrend
              data={revenueSeries}
              xKey="month"
              keys={[
                { key: "forecast", color: "var(--chart-2)" },
                { key: "revenue", color: "var(--chart-1)" },
              ]}
              height={250}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="Goals" className="mt-4">
          <Panel title="Department goals" bodyClassName="p-5">
            <ul className="space-y-5">
              {goals.map((g) => (
                <li key={g.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{g.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{g.progress}%</span>
                  </div>
                  <Meter value={g.progress} className="mt-2" />
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="Automations" className="mt-4 grid gap-4 sm:grid-cols-2">
          {automations.map((a) => (
            <div key={a.name} className="panel flex items-center gap-4 p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary/60 text-primary">
                <Workflow className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {a.trigger} · {a.runs}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="Templates" className="mt-4 grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <div
              key={t.name}
              className="panel group p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <p className="font-display text-sm font-semibold">{t.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t.agents} agents · est. {t.eta}
              </p>
              <Button variant="hero" size="sm" className="mt-4">
                Deploy template
              </Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}

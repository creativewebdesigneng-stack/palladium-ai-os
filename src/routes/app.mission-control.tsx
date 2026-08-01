import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleDot,
  Cpu,
  Gauge,
  Pause,
  Radar,
  Terminal,
  Timer,
  Users,
  X,
} from "lucide-react";
import { PageHeader, Panel, Meter, StatusDot } from "@/components/os/page-shell";
import { StatCard } from "@/components/os/stat-card";
import { LineTrend } from "@/components/os/charts";
import { Button } from "@/components/ui/button";
import { consoleLines, departments, missions, workloadSeries } from "@/lib/os-data";

export const Route = createFileRoute("/app/mission-control")({
  head: () => ({
    meta: [
      { title: "Mission Control — PalladiumAI OS" },
      {
        name: "description",
        content:
          "NASA-grade mission control for your AI workforce: live missions, task graphs, approvals, agent activity and a real-time kernel console.",
      },
      { property: "og:title", content: "Mission Control — PalladiumAI OS" },
      {
        property: "og:description",
        content: "Live missions, task graphs, approvals and a real-time kernel console.",
      },
    ],
  }),
  component: MissionControl,
});

function LiveConsole() {
  const [lines, setLines] = useState(consoleLines.slice(0, 5));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let i = 5;
    const id = setInterval(() => {
      i += 1;
      setLines((prev) => [...prev.slice(-40), consoleLines[i % consoleLines.length]]);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  return (
    <div
      ref={ref}
      className="scroll-slim h-[260px] overflow-y-auto rounded-xl border border-border bg-background/60 p-4 font-mono text-[11px] leading-relaxed"
    >
      {lines.map((l, i) => (
        <p key={`${l}-${i}`} className="animate-rise text-muted-foreground">
          <span className="text-primary">›</span> {l}
        </p>
      ))}
      <p className="mt-1 flex items-center gap-1 text-primary">
        <span className="inline-block size-2 animate-pulse rounded-sm bg-primary" /> kernel listening…
      </p>
    </div>
  );
}

const timeline = [
  { phase: "Intake", state: "done", detail: "Objective parsed · 14 constraints" },
  { phase: "Planning", state: "done", detail: "Atlas produced 6-phase plan" },
  { phase: "Staffing", state: "done", detail: "46 agents assigned across 4 departments" },
  { phase: "Execution", state: "active", detail: "Storefront build 78% · QA running" },
  { phase: "Approval", state: "pending", detail: "Awaiting operator sign-off" },
  { phase: "Delivery", state: "pending", detail: "Deploy + handoff report" },
];

const taskGraph = [
  { node: "Market research", dept: "Business", state: "done" },
  { node: "Brand identity", dept: "Creative", state: "done" },
  { node: "Product catalogue", dept: "Business", state: "done" },
  { node: "Storefront build", dept: "Development", state: "active" },
  { node: "Payment + tax setup", dept: "Finance", state: "active" },
  { node: "Launch campaign", dept: "Marketing", state: "queued" },
  { node: "Support playbook", dept: "Sales", state: "queued" },
];

const approvals = [
  { title: "Usage-based billing rollout", agent: "Orion · CTO", risk: "Medium" },
  { title: "£18,400 supplier prepayment", agent: "Nova · CFO", risk: "High" },
  { title: "Publish brand film to YouTube", agent: "Iris · Creative", risk: "Low" },
];

function MissionControl() {
  const [selected, setSelected] = useState(missions[0]);

  return (
    <>
      <PageHeader
        eyebrow="Mission control"
        title="Live operations"
        description="Every mission, department and agent in one command surface. Atlas, your AI CEO, is coordinating in real time."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Pause className="size-4" /> Hold all
            </Button>
            <Button variant="hero" size="sm">
              <Radar className="size-4" /> Launch mission
            </Button>
          </>
        }
      />

      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="hairline-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-medium text-success">
                <span className="size-1.5 animate-pulse-ring rounded-full bg-success" /> AI CEO online
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">atlas.core / v4.2.1</span>
            </div>
            <h2 className="mt-3 font-display text-xl font-semibold sm:text-2xl">
              Atlas is orchestrating <span className="text-gradient">12 missions</span> across 14 departments
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Decision throughput 41/min · reallocated 6 workers to Creative · 2 approvals waiting on you.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[420px]">
            {[
              ["Uptime", "99.98%"],
              ["Decisions", "41/min"],
              ["Tokens/hr", "4.2M"],
              ["Cost/hr", "£38.20"],
            ].map(([k, v]) => (
              <div key={k} className="glass rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
                <p className="mt-1 font-display text-base font-semibold">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live missions" value="12" delta="+3" icon={Radar} hint="4 phases active" />
        <StatCard label="Agents deployed" value="1,842" delta="+128" icon={Users} hint="of 2,481 online" />
        <StatCard label="Approvals required" value="3" trend="down" delta="-1" icon={AlertTriangle} hint="1 high risk" />
        <StatCard label="Compute load" value="72%" delta="+6%" icon={Cpu} hint="autoscaling on" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Panel title="Live missions" subtitle="Select a mission to inspect" bodyClassName="p-2">
          <ul className="space-y-1">
            {missions.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => setSelected(m)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                    selected.id === m.id ? "bg-sidebar-accent" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{m.id}</span>
                    <StatusDot status={m.status} />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{m.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Meter value={m.progress} />
                    <span className="shrink-0 text-[10px] text-muted-foreground">{m.progress}%</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel
            title={selected.name}
            subtitle={`${selected.department} · lead ${selected.lead} · ${selected.agents} agents`}
            action={
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Timer className="size-3.5" /> ETA {selected.eta}
              </div>
            }
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Mission timeline
                </p>
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {timeline.map((t) => (
                    <li key={t.phase} className="relative">
                      <span
                        className={`absolute -left-[26px] top-1 grid size-4 place-items-center rounded-full border ${
                          t.state === "done"
                            ? "border-success/40 bg-success/20 text-success"
                            : t.state === "active"
                              ? "brand-gradient border-transparent text-primary-foreground"
                              : "border-border bg-secondary text-muted-foreground"
                        }`}
                      >
                        {t.state === "done" ? (
                          <Check className="size-2.5" />
                        ) : (
                          <CircleDot className="size-2.5" />
                        )}
                      </span>
                      <p className="text-sm font-medium">{t.phase}</p>
                      <p className="text-[11px] text-muted-foreground">{t.detail}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Task graph
                </p>
                <ul className="space-y-2">
                  {taskGraph.map((t) => (
                    <li
                      key={t.node}
                      className="glass flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:border-primary/40"
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          t.state === "done"
                            ? "bg-success"
                            : t.state === "active"
                              ? "bg-primary"
                              : "bg-muted-foreground"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{t.node}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{t.dept}</span>
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Approvals required" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {approvals.map((a) => (
                  <li key={a.title} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.agent} · risk {a.risk}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="icon" variant="hero" className="size-7" aria-label="Approve">
                          <Check className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="outline" className="size-7" aria-label="Reject">
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Departments working" bodyClassName="p-5">
              <ul className="space-y-3">
                {departments.slice(0, 6).map((d) => (
                  <li key={d.slug} className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-secondary/60 text-primary">
                      <d.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium">{d.name}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{d.load}%</span>
                      </div>
                      <Meter value={d.load} className="mt-1.5" />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Live console"
          subtitle="Kernel + agent telemetry"
          action={<Terminal className="size-4 text-primary" />}
        >
          <LiveConsole />
        </Panel>
        <Panel
          title="Agent activity"
          subtitle="Concurrent agents and missions over 24h"
          action={<Gauge className="size-4 text-primary" />}
        >
          <LineTrend
            data={workloadSeries}
            xKey="hour"
            keys={[
              { key: "agents", color: "var(--chart-1)" },
              { key: "missions", color: "var(--chart-2)" },
            ]}
            height={260}
          />
        </Panel>
      </div>
    </>
  );
}

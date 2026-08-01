import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Copy, Crown, Pause, Play, Power, UserPlus, Users } from "lucide-react";
import { PageHeader, Panel, Meter, StatusDot } from "@/components/os/page-shell";
import { StatCard } from "@/components/os/stat-card";
import { Button } from "@/components/ui/button";
import { agents } from "@/lib/os-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/workforce")({
  head: () => ({
    meta: [
      { title: "AI Workforce — PalladiumAI OS" },
      {
        name: "description",
        content:
          "Manage your AI workforce: CEO, department managers, employees and workers with models, memory, token usage and success rates.",
      },
      { property: "og:title", content: "AI Workforce — PalladiumAI OS" },
      {
        property: "og:description",
        content: "Hire, pause, assign and retire thousands of AI workers from one roster.",
      },
    ],
  }),
  component: Workforce,
});

const tiers = ["All", "CEO", "Manager", "Employee", "Worker"] as const;

function Workforce() {
  const [tier, setTier] = useState<(typeof tiers)[number]>("All");
  const [selectedId, setSelectedId] = useState(agents[0]!.id);
  const list = tier === "All" ? agents : agents.filter((a) => a.tier === tier);
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0]!;

  return (
    <>
      <PageHeader
        eyebrow="Workforce"
        title="AI Workforce"
        description="2,481 agents organised into an executive layer, department managers, employees and worker swarms."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Users className="size-4" /> Org chart
            </Button>
            <Button variant="hero" size="sm">
              <UserPlus className="size-4" /> Hire employee
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total agents" value="2,481" delta="+501" icon={Bot} hint="14 departments" />
        <StatCard label="Executives" value="1" trend="flat" delta="Atlas" icon={Crown} hint="AI CEO online" />
        <StatCard label="Avg success rate" value="93.1%" delta="+1.8%" icon={Users} hint="last 7 days" />
        <StatCard label="Tokens today" value="74.3M" delta="+9.4%" icon={Power} hint="£412 spend" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tiers.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              tier === t
                ? "brand-gradient text-primary-foreground"
                : "glass text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <Panel title={`Roster — ${list.length} agents`} bodyClassName="p-0">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-3 py-3 font-medium">Tier</th>
                  <th className="px-3 py-3 font-medium">Model</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Performance</th>
                  <th className="px-3 py-3 font-medium">Success</th>
                  <th className="px-5 py-3 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "cursor-pointer border-b border-border/60 transition-colors hover:bg-secondary/40",
                      selected.id === a.id && "bg-sidebar-accent/60",
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="brand-gradient grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-primary-foreground">
                          {a.name.slice(0, 2)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{a.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{a.tier}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{a.model}</td>
                    <td className="px-3 py-3">
                      <StatusDot status={a.status} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Meter value={a.performance} className="w-16" />
                        <span className="text-[11px] text-muted-foreground">{a.performance}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">{a.success}%</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{a.tokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Agent detail" subtitle={selected.id}>
          <div className="flex items-center gap-3">
            <span className="brand-gradient grid size-11 place-items-center rounded-xl text-sm font-semibold text-primary-foreground">
              {selected.name.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{selected.name}</p>
              <p className="truncate text-xs text-muted-foreground">{selected.role}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-xs">
            {[
              ["Department", selected.department],
              ["Tier", selected.tier],
              ["Model", selected.model],
              ["Tasks completed", String(selected.tasks)],
              ["Success rate", `${selected.success}%`],
              ["Token usage", selected.tokens],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{k}</span>
                <span className="truncate font-medium">{v}</span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Memory usage</span>
              <span className="font-medium text-foreground">{selected.memory}%</span>
            </div>
            <Meter value={selected.memory} />
          </div>

          <div className="glass mt-5 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Current task</p>
            <p className="mt-1 text-xs">{selected.task}</p>
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {["Planning", "Research", "Tooling", "Delegation", "QA"].map((s) => (
                <span key={s} className="glass rounded-full px-2.5 py-1 text-[10px]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm">
              <Pause className="size-4" /> Pause
            </Button>
            <Button variant="outline" size="sm">
              <Play className="size-4" /> Resume
            </Button>
            <Button variant="outline" size="sm">
              <UserPlus className="size-4" /> Assign
            </Button>
            <Button variant="outline" size="sm">
              <Copy className="size-4" /> Duplicate
            </Button>
            <Button variant="destructive" size="sm" className="col-span-2">
              <Power className="size-4" /> Retire agent
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

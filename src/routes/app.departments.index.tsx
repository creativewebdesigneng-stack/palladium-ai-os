import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { PageHeader, Meter, Panel } from "@/components/os/page-shell";
import { Button } from "@/components/ui/button";
import { departments } from "@/lib/os-data";

export const Route = createFileRoute("/app/departments/")({
  head: () => ({
    meta: [
      { title: "Departments — PalladiumAI OS" },
      {
        name: "description",
        content:
          "Sixteen autonomous AI departments — business, health, finance, creative, development and more — each with its own roster and goals.",
      },
      { property: "og:title", content: "Departments — PalladiumAI OS" },
      {
        property: "og:description",
        content: "Autonomous AI departments running your business and your life.",
      },
    ],
  }),
  component: DepartmentsIndex,
});

function DepartmentsIndex() {
  return (
    <>
      <PageHeader
        eyebrow="Organisation"
        title="Departments"
        description="Each department is a self-managing team of AI employees with its own manager, goals, budget and automations."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Search className="size-4" /> Browse marketplace
            </Button>
            <Button variant="hero" size="sm">
              <Plus className="size-4" /> Install department
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {departments.map((d) => (
          <Link
            key={d.slug}
            to="/app/departments/$slug"
            params={{ slug: d.slug }}
            className="panel group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-violet/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary/60 text-primary transition-colors group-hover:border-primary/40">
                <d.icon className="size-5" />
              </span>
              <span className="rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-medium text-success">
                online
              </span>
            </div>
            <p className="mt-4 font-display text-base font-semibold">{d.name}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.summary}</p>
            <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{d.employees} employees</span>
              <span>{d.missions} missions</span>
              <span>{d.uptime}</span>
            </div>
            <Meter value={d.load} className="mt-3" />
          </Link>
        ))}
      </div>

      <Panel title="Not installed yet" subtitle="Available in the marketplace">
        <div className="flex flex-wrap gap-2">
          {["Real Estate", "Manufacturing", "Recruitment", "Investor Relations", "Publishing", "Customer Success"].map(
            (name) => (
              <span
                key={name}
                className="glass rounded-full px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {name}
              </span>
            ),
          )}
        </div>
      </Panel>
    </>
  );
}

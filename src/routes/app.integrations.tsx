import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plug, Search } from "lucide-react";
import { PageHeader } from "@/components/os/page-shell";
import { Button } from "@/components/ui/button";
import { integrations } from "@/lib/os-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — PalladiumAI OS" },
      {
        name: "description",
        content:
          "Connect Shopify, Stripe, GitHub, Google, Slack, Notion, Figma and every major model provider to your AI workforce.",
      },
      { property: "og:title", content: "Integrations — PalladiumAI OS" },
      {
        property: "og:description",
        content: "26 connectors that let your AI workforce act inside the tools you already use.",
      },
    ],
  }),
  component: Integrations,
});

const cats = ["All", "Commerce", "Payments", "Development", "Comms", "Social", "Productivity", "Creative", "Automation", "Models", "Identity", "Storage"];

function Integrations() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const list = integrations.filter(
    (i) => (cat === "All" || i.category === cat) && i.name.toLowerCase().includes(q.toLowerCase()),
  );
  const connected = integrations.filter((i) => i.connected).length;

  return (
    <>
      <PageHeader
        eyebrow="Integrations"
        title="Connected world"
        description={`${connected} of ${integrations.length} connectors active. Your agents can read, write and act inside every connected system.`}
        actions={
          <Button variant="hero" size="sm">
            <Plug className="size-4" /> Request connector
          </Button>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:flex sm:items-center sm:justify-between">
        <label className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-sm sm:w-72">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search connectors…"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="scroll-slim flex gap-2 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                cat === c
                  ? "brand-gradient text-primary-foreground"
                  : "glass text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((i) => (
          <div
            key={i.name}
            className="panel group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="glass grid size-10 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold">
                {i.name.slice(0, 2)}
              </span>
              {i.connected ? (
                <span className="flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-medium text-success">
                  <Check className="size-3" /> Connected
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  Not connected
                </span>
              )}
            </div>
            <p className="mt-4 font-display text-sm font-semibold">{i.name}</p>
            <p className="text-[11px] text-muted-foreground">{i.category}</p>
            <Button variant={i.connected ? "outline" : "hero"} size="sm" className="mt-4 w-full">
              {i.connected ? "Manage" : "Connect"}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}

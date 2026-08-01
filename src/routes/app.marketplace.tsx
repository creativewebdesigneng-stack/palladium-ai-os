import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search, Star } from "lucide-react";
import { PageHeader, Panel } from "@/components/os/page-shell";
import { Button } from "@/components/ui/button";
import { marketplaceItems } from "@/lib/os-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — PalladiumAI OS" },
      {
        name: "description",
        content:
          "Install new departments, AI employees, connectors and mission templates from the PalladiumAI marketplace.",
      },
      { property: "og:title", content: "Marketplace — PalladiumAI OS" },
      {
        property: "og:description",
        content: "An app store for AI departments, employees, connectors and mission templates.",
      },
    ],
  }),
  component: Marketplace,
});

const categories = ["All", "Department", "AI Employee", "Connector", "Mission Template"] as const;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-warning">
      <Star className="size-3 fill-current" /> {rating}
    </span>
  );
}

function Marketplace() {
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const [q, setQ] = useState("");
  const items = marketplaceItems.filter(
    (i) =>
      (cat === "All" || i.type === cat) &&
      (q === "" || i.name.toLowerCase().includes(q.toLowerCase())),
  );
  const featured = marketplaceItems.filter((i) => i.featured);

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Expand your operating system"
        description="Install entire departments, hire specialist AI employees, add connectors and deploy proven mission templates."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {featured.map((f) => (
          <div
            key={f.name}
            className="panel group relative overflow-hidden p-6 transition-all hover:-translate-y-1 hover:border-primary/40"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-violet/15 blur-[90px]" />
            <div className="relative">
              <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                Featured · {f.type}
              </span>
              <p className="mt-4 font-display text-lg font-semibold">{f.name}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{f.blurb}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Stars rating={f.rating} />
                  <span className="text-[11px] text-muted-foreground">{f.reviews} reviews</span>
                </div>
                <span className="text-sm font-medium">{f.price}</span>
              </div>
              <Button variant="hero" size="sm" className="mt-4 w-full">
                <Download className="size-4" /> Install
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:flex sm:items-center sm:justify-between">
        <label className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-sm sm:w-72">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search marketplace…"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="scroll-slim flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <div
            key={i.name}
            className="panel group p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="glass rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {i.type}
              </span>
              <Stars rating={i.rating} />
            </div>
            <p className="mt-3.5 font-display text-sm font-semibold">{i.name}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.blurb}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium">{i.price}</span>
              <Button variant="outline" size="sm">
                Install
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Panel title="Recent reviews" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {[
            ["Ecommerce Empire", "Launched three stores in a fortnight. Absurd leverage.", "Priya N."],
            ["Senior Staff Engineer", "Reviews code better than most humans I've hired.", "Marcus B."],
            ["Wealth Engine", "Found £14k of waste in my first month.", "Elena R."],
          ].map(([item, body, author]) => (
            <li key={item as string} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium">{item}</p>
                <Stars rating={5} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">"{body}" — {author}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

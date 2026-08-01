import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/os/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/os/stat-card";
import { Clock, Rocket, Trophy } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — PalladiumAI OS" },
      { name: "description", content: "Your operator profile, preferences and lifetime impact inside PalladiumAI." },
      { property: "og:title", content: "Profile — PalladiumAI OS" },
      { property: "og:description", content: "Operator profile and lifetime workforce impact." },
    ],
  }),
  component: () => (
    <>
      <PageHeader eyebrow="Operator" title="James Morrow" description="Enterprise operator since March 2025 · 7 businesses · 16 departments." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Missions launched" value="418" delta="+22" icon={Rocket} hint="94% success" />
        <StatCard label="Hours reclaimed" value="4,182" delta="+412" icon={Clock} hint="lifetime" />
        <StatCard label="Operator rank" value="Titanium" trend="flat" delta="Top 1%" icon={Trophy} hint="global" />
      </div>
      <Panel title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          {[["Full name", "James Morrow"], ["Email", "james@nordvale.co"], ["Company", "Nordvale Group"], ["Timezone", "Europe/London"]].map(([l, v]) => (
            <div key={l} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{l}</Label>
              <Input defaultValue={v} />
            </div>
          ))}
        </div>
        <Button variant="hero" size="sm" className="mt-5">Save changes</Button>
      </Panel>
    </>
  ),
});

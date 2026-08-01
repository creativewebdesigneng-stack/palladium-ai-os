import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { departments } from "@/lib/os-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — PalladiumAI" },
      { name: "description", content: "Choose your first departments and let your AI CEO staff them automatically." },
      { property: "og:title", content: "Onboarding — PalladiumAI" },
      { property: "og:description", content: "Choose your first AI departments." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const [picked, setPicked] = useState<string[]>(["business", "finance", "health"]);
  const toggle = (slug: string) =>
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));

  return (
    <AuthLayout title="Staff your first departments" subtitle="Atlas, your AI CEO, will hire managers and workers for everything you select." footer={`${picked.length} departments selected`}>
      <div className="grid grid-cols-2 gap-2">
        {departments.slice(0, 8).map((d) => (
          <button
            key={d.slug}
            onClick={() => toggle(d.slug)}
            className={cn(
              "glass flex items-center gap-2.5 rounded-xl px-3 py-3 text-left text-xs transition-all hover:-translate-y-0.5",
              picked.includes(d.slug) && "border-primary/50 text-foreground",
            )}
          >
            <d.icon className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate font-medium">{d.name}</span>
            {picked.includes(d.slug) && <Check className="size-3.5 shrink-0 text-primary" />}
          </button>
        ))}
      </div>
      <Button asChild variant="hero" size="lg" className="w-full"><Link to="/app">Boot the operating system</Link></Button>
    </AuthLayout>
  );
}

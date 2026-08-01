import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/os/page-shell";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PalladiumAI OS" },
      { name: "description", content: "Theme, notifications, permissions, API keys, connected apps, privacy, security and subscription settings." },
      { property: "og:title", content: "Settings — PalladiumAI OS" },
      { property: "og:description", content: "Control how your AI operating system behaves." },
    ],
  }),
  component: Settings,
});

function ToggleRow({ label, hint, on }: { label: string; hint: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <Switch defaultChecked={on ?? false} />
    </div>
  );
}

function Settings() {
  return (
    <>
      <PageHeader eyebrow="System" title="Settings" description="Tune the operating system, its permissions and how much autonomy your workforce has." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Appearance" bodyClassName="divide-y divide-border px-5 py-1">
          <ToggleRow label="Dark mode" hint="Obsidian surfaces with electric accents" on />
          <ToggleRow label="Reduced motion" hint="Minimise animated backgrounds" />
          <ToggleRow label="Compact density" hint="Tighter spacing across the OS" />
        </Panel>
        <Panel title="Notifications" bodyClassName="divide-y divide-border px-5 py-1">
          <ToggleRow label="Approval requests" hint="Always notify me instantly" on />
          <ToggleRow label="Mission completions" hint="Summary when a mission finishes" on />
          <ToggleRow label="Budget thresholds" hint="Alert at 80% of any cap" on />
          <ToggleRow label="Daily briefing" hint="08:00 digest from your AI CEO" on />
        </Panel>
        <Panel title="Permissions" bodyClassName="divide-y divide-border px-5 py-1">
          <ToggleRow label="Autonomous spending" hint="Up to £500 without approval" on />
          <ToggleRow label="Publish content" hint="Post to connected social accounts" />
          <ToggleRow label="Deploy code" hint="Ship to production without review" />
          <ToggleRow label="Contact people" hint="Send email on my behalf" on />
        </Panel>
        <Panel title="Security & privacy" bodyClassName="divide-y divide-border px-5 py-1">
          <ToggleRow label="Two-factor authentication" hint="Required for all approvals" on />
          <ToggleRow label="Memory retention" hint="Keep long-term workforce memory" on />
          <ToggleRow label="Model training opt-out" hint="Never train on my data" on />
        </Panel>
        <Panel title="API keys" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Input readOnly value="pld_live_••••••••••••••••••••••8f2a" className="font-mono text-xs" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Reveal</Button>
              <Button variant="hero" size="sm">Rotate key</Button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

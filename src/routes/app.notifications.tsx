import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/os/page-shell";
import { notifications } from "@/lib/os-data";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — PalladiumAI OS" },
      { name: "description", content: "Approvals, mission updates, budget alerts and workforce events from your AI operating system." },
      { property: "og:title", content: "Notifications — PalladiumAI OS" },
      { property: "og:description", content: "Everything that needs your attention, in one stream." },
    ],
  }),
  component: () => (
    <>
      <PageHeader eyebrow="Inbox" title="Notifications" description="Approvals and events surfaced by Atlas and your department managers." />
      <Panel title="Latest" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {[...notifications, ...notifications].map((n, i) => (
            <li key={i} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-secondary/40">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.type === "approval" ? "bg-warning" : n.type === "success" ? "bg-success" : n.type === "error" ? "bg-destructive" : "bg-primary"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{n.time} ago</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  ),
});

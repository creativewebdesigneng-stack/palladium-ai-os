import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AutomationStudio";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/automations")({
  head: () => ({
    meta: [
      { title: "Automations — Blackstar" },
      { name: "description", content: "Create validated, persisted workflows with personal agents, triggers, schedules and approval requirements." },
      { property: "og:title", content: "Automations — Blackstar" },
      { property: "og:description", content: "Create validated, persisted workflows with personal agents, triggers, schedules and approval requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});

import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AutomationStudio";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-automation"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/automation")({
  head: () => ({
    meta: [
      { title: "Automation studio — Blackstar" },
      { name: "description", content: "Create validated, persisted Blackstar workflows with personal agents, triggers and approval requirements." },
      { property: "og:title", content: "Automation studio — Blackstar" },
      {
        property: "og:description",
        content: "Create validated, persisted Blackstar workflows with personal agents, triggers and approval requirements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});

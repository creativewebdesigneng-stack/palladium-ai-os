import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AutomationStudio";

export const Route = createFileRoute("/_shell/_app/automations")({
  head: () => ({
    meta: [
      { title: "Automations — PalladiumAI" },
      { name: "description", content: "Create validated, persisted workflows with personal agents, triggers, schedules and approval requirements." },
      { property: "og:title", content: "Automations — PalladiumAI" },
      { property: "og:description", content: "Create validated, persisted workflows with personal agents, triggers, schedules and approval requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

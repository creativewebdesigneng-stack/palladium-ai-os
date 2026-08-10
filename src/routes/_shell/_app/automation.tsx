import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AutomationStudio";

export const Route = createFileRoute("/_shell/_app/automation")({
  head: () => ({
    meta: [
      { title: "Automation studio — PalladiumAI" },
      { name: "description", content: "Build multi-step automations with triggers and approvals." },
      { property: "og:title", content: "Automation studio — PalladiumAI" },
      {
        property: "og:description",
        content: "Build multi-step automations with triggers and approvals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

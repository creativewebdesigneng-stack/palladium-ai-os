import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AutomationStudio";

export const Route = createFileRoute("/_shell/_app/automations")({
  head: () => ({
    meta: [
      { title: "Automations — PalladiumAI" },
      { name: "description", content: "Build reliable visual automations with triggers, logic and actions." },
      { property: "og:title", content: "Automations — PalladiumAI" },
      { property: "og:description", content: "Build reliable visual automations with triggers, logic and actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

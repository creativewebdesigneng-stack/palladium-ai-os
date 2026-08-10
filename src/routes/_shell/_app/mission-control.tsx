import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/MissionControl";

export const Route = createFileRoute("/_shell/_app/mission-control")({
  head: () => ({
    meta: [
      { title: "Mission Control — PalladiumAI" },
      {
        name: "description",
        content:
          "Command your personal and professional AI agents, approve sensitive actions, and track every task in one place.",
      },
      { property: "og:title", content: "Mission Control — PalladiumAI" },
      {
        property: "og:description",
        content:
          "Command your personal and professional AI agents, approve sensitive actions, and track every task in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Team";

export const Route = createFileRoute("/_shell/_app/team")({
  head: () => ({
    meta: [
      { title: "Team — PalladiumAI" },
      { name: "description", content: "Add existing account members and manage organisation roles and teams." },
      { property: "og:title", content: "Team — PalladiumAI" },
      { property: "og:description", content: "Add existing account members and manage organisation roles and teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

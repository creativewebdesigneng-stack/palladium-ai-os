import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Team";

export const Route = createFileRoute("/_shell/_app/team")({
  head: () => ({
    meta: [
      { title: "Team — PalladiumAI" },
      { name: "description", content: "Invite humans and manage roles." },
      { property: "og:title", content: "Team — PalladiumAI" },
      { property: "og:description", content: "Invite humans and manage roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

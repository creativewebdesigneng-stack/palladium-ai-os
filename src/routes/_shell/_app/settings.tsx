import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Settings";

export const Route = createFileRoute("/_shell/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PalladiumAI" },
      { name: "description", content: "Workspace preferences and system controls." },
      { property: "og:title", content: "Settings — PalladiumAI" },
      { property: "og:description", content: "Workspace preferences and system controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

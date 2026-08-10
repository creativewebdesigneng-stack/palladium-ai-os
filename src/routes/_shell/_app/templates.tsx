import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Templates";

export const Route = createFileRoute("/_shell/_app/templates")({
  head: () => ({
    meta: [
      { title: "Templates — PalladiumAI" },
      { name: "description", content: "Start from proven mission and agent templates." },
      { property: "og:title", content: "Templates — PalladiumAI" },
      { property: "og:description", content: "Start from proven mission and agent templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

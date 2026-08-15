import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Web";

export const Route = createFileRoute("/_shell/_app/web")({
  head: () => ({
    meta: [
      { title: "Web — PalladiumAI" },
      { name: "description", content: "Web discovery provider setup and safety requirements." },
      { property: "og:title", content: "Web — PalladiumAI" },
      { property: "og:description", content: "Web discovery provider setup and safety requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

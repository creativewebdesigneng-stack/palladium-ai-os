import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Memory";

export const Route = createFileRoute("/_shell/_app/memory")({
  head: () => ({
    meta: [
      { title: "Memory — PalladiumAI" },
      { name: "description", content: "Long-term organisational memory for your workforce." },
      { property: "og:title", content: "Memory — PalladiumAI" },
      { property: "og:description", content: "Long-term organisational memory for your workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AITools";

export const Route = createFileRoute("/_shell/_app/ai-tools")({
  head: () => ({
    meta: [
      { title: "AI tools — PalladiumAI" },
      { name: "description", content: "Your installed toolkit, ready for any agent." },
      { property: "og:title", content: "AI tools — PalladiumAI" },
      { property: "og:description", content: "Your installed toolkit, ready for any agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIModelHub";

export const Route = createFileRoute("/_shell/_app/ai-model-hub")({
  head: () => ({
    meta: [
      { title: "Model hub — PalladiumAI" },
      { name: "description", content: "Open PalladiumAI's authoritative runtime model state." },
      { property: "og:title", content: "Model hub — PalladiumAI" },
      { property: "og:description", content: "Open PalladiumAI's authoritative runtime model state." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

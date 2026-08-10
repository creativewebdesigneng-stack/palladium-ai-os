import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PalladiumAI — The AI Operating System" },
      {
        name: "description",
        content:
          "PalladiumAI is the AI operating system for autonomous work: agents, workflows, and an AI workforce that runs your business.",
      },
      { property: "og:title", content: "PalladiumAI — The AI Operating System" },
      {
        property: "og:description",
        content:
          "PalladiumAI is the AI operating system for autonomous work: agents, workflows, and an AI workforce that runs your business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

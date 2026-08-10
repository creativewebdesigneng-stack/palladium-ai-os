import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Workflows";

export const Route = createFileRoute("/_shell/_app/workflows")({
  head: () => ({
    meta: [
      { title: "Workflows — PalladiumAI" },
      { name: "description", content: "Orchestrate long-running processes across agents." },
      { property: "og:title", content: "Workflows — PalladiumAI" },
      { property: "og:description", content: "Orchestrate long-running processes across agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

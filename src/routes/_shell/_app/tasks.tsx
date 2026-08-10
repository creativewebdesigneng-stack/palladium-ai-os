import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Tasks";

export const Route = createFileRoute("/_shell/_app/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — PalladiumAI" },
      { name: "description", content: "Track everything your AI workforce is working on." },
      { property: "og:title", content: "Tasks — PalladiumAI" },
      { property: "og:description", content: "Track everything your AI workforce is working on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

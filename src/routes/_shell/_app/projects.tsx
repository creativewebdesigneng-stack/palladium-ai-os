import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Projects";

export const Route = createFileRoute("/_shell/_app/projects")({
  head: () => ({
    meta: [
      { title: "Projects — PalladiumAI" },
      { name: "description", content: "Group work into projects with goals and owners." },
      { property: "og:title", content: "Projects — PalladiumAI" },
      { property: "og:description", content: "Group work into projects with goals and owners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

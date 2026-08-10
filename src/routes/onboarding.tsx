import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — PalladiumAI" },
      {
        name: "description",
        content: "Set up your workspace, pick departments and meet your AI workforce.",
      },
      { property: "og:title", content: "Welcome — PalladiumAI" },
      {
        property: "og:description",
        content: "Set up your workspace, pick departments and meet your AI workforce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

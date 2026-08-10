import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Register";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — PalladiumAI" },
      {
        name: "description",
        content: "Create your PalladiumAI account and deploy your first AI agents in minutes.",
      },
      { property: "og:title", content: "Create account — PalladiumAI" },
      {
        property: "og:description",
        content: "Create your PalladiumAI account and deploy your first AI agents in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

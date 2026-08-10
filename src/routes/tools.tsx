import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIToolsPublic";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "AI Tools — PalladiumAI" },
      {
        name: "description",
        content:
          "A growing library of AI tools and integrations your agents can use across research, code, sales and operations.",
      },
      { property: "og:title", content: "AI Tools — PalladiumAI" },
      {
        property: "og:description",
        content:
          "A growing library of AI tools and integrations your agents can use across research, code, sales and operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

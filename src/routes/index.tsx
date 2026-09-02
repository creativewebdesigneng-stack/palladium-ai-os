import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blackstar — Intelligence Hub & Infrastructure" },
      {
        name: "description",
        content:
          "Blackstar unifies AI models, autonomous agents, tools, applications, data and infrastructure through one governed intelligence layer.",
      },
      { property: "og:title", content: "Blackstar — Intelligence Hub & Infrastructure" },
      {
        property: "og:description",
        content:
          "One intelligence layer. Every system. Build, automate, govern and scale intelligent operations with Blackstar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

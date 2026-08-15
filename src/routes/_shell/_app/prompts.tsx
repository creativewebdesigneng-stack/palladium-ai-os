import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Prompts";

export const Route = createFileRoute("/_shell/_app/prompts")({
  head: () => ({
    meta: [
      { title: "Prompts — PalladiumAI" },
      { name: "description", content: "Review prompt-workspace availability and use live runtime alternatives." },
      { property: "og:title", content: "Prompts — PalladiumAI" },
      {
        property: "og:description",
        content: "Review prompt-workspace availability and use live runtime alternatives.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

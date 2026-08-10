import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Chat";

export const Route = createFileRoute("/_shell/_app/chat")({
  head: () => ({
    meta: [
      { title: "Chat — PalladiumAI" },
      { name: "description", content: "Talk to your agents with full context, tools and memory." },
      { property: "og:title", content: "Chat — PalladiumAI" },
      {
        property: "og:description",
        content: "Talk to your agents with full context, tools and memory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AITools";

export const Route = createFileRoute("/_shell/_app/ai-tools")({
  head: () => ({
    meta: [
      { title: "AI tools — Blackstar" },
      { name: "description", content: "Open the live tools framework, permissions and execution history." },
      { property: "og:title", content: "AI tools — Blackstar" },
      { property: "og:description", content: "Open the live tools framework, permissions and execution history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

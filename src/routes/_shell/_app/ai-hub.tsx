import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIHub";

export const Route = createFileRoute("/_shell/_app/ai-hub")({
  head: () => ({
    meta: [
      { title: "AI Hub — Blackstar" },
      { name: "description", content: "Discover and govern Blackstar capabilities through one universal AI control surface." },
      { property: "og:title", content: "AI Hub — Blackstar" },
      { property: "og:description", content: "Discover and govern Blackstar capabilities through one universal AI control surface." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

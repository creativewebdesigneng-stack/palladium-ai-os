import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentWizard";

export const Route = createFileRoute("/_shell/_app/agents/new")({
  head: () => ({
    meta: [
      { title: "New agent — Blackstar" },
      { name: "description", content: "Create a new specialised agent step by step." },
      { property: "og:title", content: "New agent — Blackstar" },
      { property: "og:description", content: "Create a new specialised agent step by step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

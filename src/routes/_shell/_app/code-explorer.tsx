import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/CodeExplorer";

export const Route = createFileRoute("/_shell/_app/code-explorer")({
  head: () => ({
    meta: [
      { title: "Code explorer — PalladiumAI" },
      { name: "description", content: "View PalladiumAI repository connection status and the safeguards required for AI-assisted code changes." },
      { property: "og:title", content: "Code explorer — PalladiumAI" },
      { property: "og:description", content: "View PalladiumAI repository connection status and the safeguards required for AI-assisted code changes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

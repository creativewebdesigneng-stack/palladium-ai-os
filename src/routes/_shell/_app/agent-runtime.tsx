import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentRuntime";

// The Vite router plugin adds this file to routeTree.gen.ts during build. The
// cast keeps a direct `tsc --noEmit` valid before that generated file refreshes.
export const Route = createFileRoute("/_shell/_app/agent-runtime" as never)({
  head: () => ({
    meta: [
      { title: "Agent Runtime — PalladiumAI" },
      { name: "description", content: "Operate PalladiumAI agent runtime guardrails, capabilities and execution activity." },
      { property: "og:title", content: "Agent Runtime — PalladiumAI" },
      { property: "og:description", content: "Operate PalladiumAI agent runtime guardrails, capabilities and execution activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

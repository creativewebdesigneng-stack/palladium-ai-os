import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentWorkspaces";

export const Route = createFileRoute("/_shell/_app/agent-workspaces")({
  head: () => ({
    meta: [
      { title: "Agent Workspaces — PalladiumAI" },
      { name: "description", content: "Coordinate parallel agent workspaces and durable context timelines in PalladiumAI." },
      { property: "og:title", content: "Agent Workspaces — PalladiumAI" },
      { property: "og:description", content: "Coordinate parallel agent workspaces and durable context timelines in PalladiumAI." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});

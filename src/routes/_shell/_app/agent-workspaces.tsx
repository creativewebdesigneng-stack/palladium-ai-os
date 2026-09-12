import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentWorkspaces";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/agent-workspaces")({
  head: () => ({
    meta: [
      { title: "Agent Workspaces — Blackstar" },
      { name: "description", content: "Coordinate parallel agent workspaces and durable context timelines in Blackstar." },
      { property: "og:title", content: "Agent Workspaces — Blackstar" },
      { property: "og:description", content: "Coordinate parallel agent workspaces and durable context timelines in Blackstar." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SpatialPage,
});

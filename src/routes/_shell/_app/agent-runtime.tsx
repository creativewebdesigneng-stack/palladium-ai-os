import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentRuntime";

export const Route = createFileRoute("/_shell/_app/agent-runtime")({
  head: () => ({
    meta: [
      { title: "Control Plane — Blackstar" },
      { name: "description", content: "Operate Blackstar runtime guardrails, Trust Fabric identity, agent passports, A2A activity and delegated execution." },
      { property: "og:title", content: "Control Plane — Blackstar" },
      { property: "og:description", content: "Operate Blackstar runtime guardrails, Trust Fabric identity, agent passports, A2A activity and delegated execution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

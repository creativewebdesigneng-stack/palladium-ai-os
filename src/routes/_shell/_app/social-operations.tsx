import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/SocialOperations";

export const Route = createFileRoute("/_shell/_app/social-operations")({
  head: () => ({
    meta: [
      { title: "Social Operations — Blackstar" },
      { name: "description", content: "Plan, schedule and route social content through live Blackstar integrations." },
      { property: "og:title", content: "Social Operations — Blackstar" },
      { property: "og:description", content: "Plan, schedule and route social content through live Blackstar integrations." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});

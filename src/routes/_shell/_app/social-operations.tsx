import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/SocialOperations";

export const Route = createFileRoute("/_shell/_app/social-operations")({
  head: () => ({
    meta: [
      { title: "Social Operations — PalladiumAI" },
      { name: "description", content: "Plan, schedule and route social content through live PalladiumAI integrations." },
      { property: "og:title", content: "Social Operations — PalladiumAI" },
      { property: "og:description", content: "Plan, schedule and route social content through live PalladiumAI integrations." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});

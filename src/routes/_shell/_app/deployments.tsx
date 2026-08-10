import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Deployments";

export const Route = createFileRoute("/_shell/_app/deployments")({
  head: () => ({
    meta: [
      { title: "Deployments — PalladiumAI" },
      { name: "description", content: "Ship and monitor releases from one place." },
      { property: "og:title", content: "Deployments — PalladiumAI" },
      { property: "og:description", content: "Ship and monitor releases from one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Models";

export const Route = createFileRoute("/_shell/_app/models")({
  head: () => ({
    meta: [
      { title: "Models — Blackstar" },
      { name: "description", content: "Inspect Blackstar runtime models, Astra-class serving readiness and evidence-gated routing infrastructure." },
      { property: "og:title", content: "Models — Blackstar" },
      { property: "og:description", content: "Inspect Blackstar runtime models, Astra-class serving readiness and evidence-gated routing infrastructure." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});

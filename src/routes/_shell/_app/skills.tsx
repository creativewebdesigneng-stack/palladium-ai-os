import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Skills";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/skills")({
  head: () => ({
    meta: [
      { title: "Skills — Blackstar" },
      { name: "description", content: "Reusable skills your agents can learn and apply." },
      { property: "og:title", content: "Skills — Blackstar" },
      { property: "og:description", content: "Reusable skills your agents can learn and apply." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
